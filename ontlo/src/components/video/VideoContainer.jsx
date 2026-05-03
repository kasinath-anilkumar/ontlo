import { Shield, Mic, FastForward, PhoneOff, Heart, AlertTriangle, EyeOff, Eye, MessageSquare, Check, X, Timer, User, ChevronLeft, Settings, Star } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import ChatPanel from "../chat/ChatPanel";
import MatchSettingsModal from "./MatchSettingsModal";
import API_URL, { apiFetch } from "../../utils/api";

const VideoContainer = () => {
  const { socket, user, setUser } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  // ── Video element refs (always in the DOM, never conditionally rendered) ──
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // ── WebRTC / call state stored in refs so closures always see current value ──
  const peerConnectionRef = useRef(null);
  const roomIdRef = useRef(null);
  const localStreamRef = useRef(null);      // single source of truth for the stream
  const autoRejoinRef = useRef(false);      // flag to avoid double-rejoin
  const cleaningUpRef = useRef(false);      // guard against concurrent cleanup
  const rejoinTimerRef = useRef(null);      // so we can cancel it

  // ── UI state ──
  const [isMatching, setIsMatching] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [showMatchSuccess, setShowMatchSuccess] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isBlurred, setIsBlurred] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false); // Whether I am blurring myself for the other person
  const [peerIsPrivate, setPeerIsPrivate] = useState(false); // Whether the peer has blurred themselves for me
  const [showMatchSettings, setShowMatchSettings] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showConnectRequest, setShowConnectRequest] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [connectTimer, setConnectTimer] = useState(0);
  const [safetyBlurTimer, setSafetyBlurTimer] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [penaltyMessage, setPenaltyMessage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [commonInterests, setCommonInterests] = useState([]);
  const [showControls, setShowControls] = useState(true);
  const [localVideoPos, setLocalVideoPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const localVideoRefContainer = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const [matchPreferences, setMatchPreferences] = useState(user?.matchPreferences || {
    gender: 'All',
    ageRange: { min: 18, max: 100 },
    region: 'Global'
  });

  // ─────────────────────────────────────────────────────────────────
  // 1. Camera initialisation — runs once, cleans up on unmount
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const constraints = {
          audio: true,
          video: user?.lowBandwidth 
            ? { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { max: 15 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setCameraReady(true);
      } catch (err) {
        console.error("Failed to get local stream", err);
        setCameraError(err.name === 'NotAllowedError' ? 'Permission Denied' : 'Camera Error');
      }
    };

    startCamera();

    return () => {
      mounted = false;
      // Stop all camera/mic tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      // Clear any pending rejoin timer
      if (rejoinTimerRef.current) {
        clearTimeout(rejoinTimerRef.current);
      }
      if (socket) socket.emit("leave-queue");
    };
  }, [user?.lowBandwidth, socket]); // Re-initialize camera when quality settings change

  // ─────────────────────────────────────────────────────────────────
  // 2. Call timers
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let interval;
    if (inCall) {
      interval = setInterval(() => {
        setConnectTimer(prev => (prev > 0 ? prev - 1 : 0));
        setSafetyBlurTimer(prev => {
          if (prev === 1) setIsBlurred(false);
          return prev > 0 ? prev - 1 : 0;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [inCall]);

  // ─────────────────────────────────────────────────────────────────
  // 3. Auto-hide Controls Logic
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!inCall || showChat || showConnectRequest) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      return;
    }

    const resetTimer = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showChat && !showConnectRequest) {
          setShowControls(false);
        }
      }, 5000); // Hide after 5 seconds
    };

    const activities = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    activities.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer(); // Start timer initially

    return () => {
      activities.forEach(event => window.removeEventListener(event, resetTimer));
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [inCall, showChat, showConnectRequest]);

  // ─────────────────────────────────────────────────────────────────
  // 4. Draggable Local Video Logic
  // ─────────────────────────────────────────────────────────────────
  const handleDragStart = (e) => {
    isDragging.current = true;
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX - localVideoPos.x, y: clientY - localVideoPos.y };
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleDragMove = useCallback((e) => {
    if (!isDragging.current) return;
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    // Boundary check
    const newX = clientX - dragStart.current.x;
    const newY = clientY - dragStart.current.y;
    
    setLocalVideoPos({ x: newX, y: newY });
  }, [localVideoPos]);

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    // Snap to nearest corner (simplified)
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const snapX = localVideoPos.x > 0 ? 0 : -(windowWidth - 120); // Placeholder logic
    // We'll just keep it where it is for now but add a small bounce animation
    if (navigator.vibrate) navigator.vibrate(5);
  };

  useEffect(() => {
    if (isDragging.current) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [handleDragMove]);

  // ─────────────────────────────────────────────────────────────────
  // 3. Cleanup helper — uses refs so it's always fresh, never stale
  // ─────────────────────────────────────────────────────────────────
  const endCallLocally = useCallback((shouldAutoRejoin = true) => {
    if (cleaningUpRef.current) return; // prevent concurrent calls
    cleaningUpRef.current = true;

    // Close peer connection
    const pc = peerConnectionRef.current;
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peerConnectionRef.current = null;
    }

    // Clear remote video — do this BEFORE any React state update
    // so the <video> element still exists in the DOM when we null it
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    roomIdRef.current = null;
    autoRejoinRef.current = false;

    // Batch all state resets together
    setInCall(false);
    setShowChat(false);
    setRemoteUser(null);
    setIsBlurred(false);
    setIsPrivate(false);
    setPeerIsPrivate(false);
    setCommonInterests([]);
    setShowConnectRequest(false);
    setConnectionStatus(null);
    setConnectTimer(0);
    setSafetyBlurTimer(0);
    setChatMessages([]);
    setHasNewMessage(false);
    setIsMatching(false);

    cleaningUpRef.current = false;

    if (shouldAutoRejoin) {
      // Cancel any previous pending rejoin
      if (rejoinTimerRef.current) clearTimeout(rejoinTimerRef.current);
      rejoinTimerRef.current = setTimeout(() => {
        rejoinTimerRef.current = null;
        if (socket) {
          setIsMatching(true);
          socket.emit("join-queue", { userId: user?.id });
        }
      }, 500);
    }
  }, [socket, user?.id]);

  // ─────────────────────────────────────────────────────────────────
  // 4. WebRTC peer connection factory
  // ─────────────────────────────────────────────────────────────────
  const createPeerConnection = useCallback((rId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject",
        }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && roomIdRef.current && socket) {
        socket.emit("webrtc-ice-candidate", { candidate: event.candidate, roomId: roomIdRef.current });
      }
    };

    pc.ontrack = (event) => {
      // remoteVideoRef is always mounted — safe to set directly
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        endCallLocally(true);
      } else if (pc.connectionState === "disconnected") {
        // Wait 5 seconds to allow WebRTC to automatically reconnect (ICE restart)
        setTimeout(() => {
          if (peerConnectionRef.current === pc && pc.connectionState === "disconnected") {
            endCallLocally(true);
          }
        }, 5000);
      }
    };

    return pc;
  }, [socket, endCallLocally]);

  // ─────────────────────────────────────────────────────────────────
  // 5. Socket event listeners — depend only on socket (never on call state)
  //    All dynamic values (peerConnectionRef, roomIdRef, localStreamRef)
  //    are read from refs so listeners are never stale.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onMatchFound = async ({ roomId: rId, role, remoteUserId: remoteId }) => {
      // If already in a call, clean up first without auto-rejoining
      if (peerConnectionRef.current) {
        endCallLocally(false);
      }

      roomIdRef.current = rId;
      setInCall(true);
      setIsBlurred(true);
      setSafetyBlurTimer(3);
      setShowConnectRequest(false);
      setConnectionStatus(null);
      setConnectTimer(10);
      setChatMessages([]);
      setHasNewMessage(false);
      setIsMatching(false);

      // ── UX Feedback ──
      if (navigator.vibrate) navigator.vibrate(100);
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
        audio.volume = 0.4;
        audio.play();
      } catch (_) {}

      // Fetch remote user info
      try {
        const res = await apiFetch(`${API_URL}/api/users/${remoteId}`);
        const data = await res.json();
        if (res.ok) {
          setRemoteUser(data);
          // Calculate common interests
          if (user?.interests && data?.interests) {
            const common = user.interests.filter(interest => 
              data.interests.includes(interest)
            );
            setCommonInterests(common);
          }
        }
      } catch (_) {}

      const pc = createPeerConnection(rId);
      peerConnectionRef.current = pc;

      // Add local tracks — read from ref so this is always fresh
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      if (role === "caller") {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc-offer", { offer, roomId: rId });
      }
    };

    const onChatMessage = (msg) => {
      setChatMessages(prev => [...prev, { ...msg, type: "remote" }]);
      // Use functional update to read current showChat without dep
      setHasNewMessage(true);
    };
    
    const onPrivacyToggle = ({ isPrivate: peerPrivate }) => {
      setPeerIsPrivate(peerPrivate);
    };

    const onPeerWantsConnection = () => {
      setConnectionStatus(prev => {
        if (prev === "sent" || prev === "accepted") return prev;
        setShowConnectRequest(true);
        return "received";
      });
    };

    const onConnectionEstablished = () => {
      setConnectionStatus("accepted");
      setShowMatchSuccess(true);
      setTimeout(() => setShowMatchSuccess(false), 3000);
      console.log("Connection established!");
    };

    const onOffer = async ({ offer }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc-answer", { answer, roomId: roomIdRef.current });
      } catch (err) {
        console.error("Error handling offer", err);
      }
    };

    const onAnswer = async ({ answer }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Error handling answer", err);
      }
    };

    const onIceCandidate = async ({ candidate }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {}
    };

    const onMatchEnded = () => {
      endCallLocally(true);
    };

    const onSkipPenalty = ({ message, timeout }) => {
      setPenaltyMessage(message);
      setIsMatching(false); // Stop trying to match
      setTimeout(() => {
        setPenaltyMessage(null);
      }, timeout);
    };

    socket.on("match-found", onMatchFound);
    socket.on("chat-message", onChatMessage);
    socket.on("peer-privacy", onPrivacyToggle);
    socket.on("peer-wants-connection", onPeerWantsConnection);
    socket.on("connection-established", onConnectionEstablished);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice-candidate", onIceCandidate);
    socket.on("match-ended", onMatchEnded);
    socket.on("skip-penalty", onSkipPenalty);

    return () => {
      socket.off("match-found", onMatchFound);
      socket.off("chat-message", onChatMessage);
      socket.off("peer-privacy", onPrivacyToggle);
      socket.off("peer-wants-connection", onPeerWantsConnection);
      socket.off("connection-established", onConnectionEstablished);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice-candidate", onIceCandidate);
      socket.off("match-ended", onMatchEnded);
      socket.off("skip-penalty", onSkipPenalty);
    };
  }, [socket, createPeerConnection, endCallLocally]);

  // ─────────────────────────────────────────────────────────────────
  // 6. User actions
  // ─────────────────────────────────────────────────────────────────
  const startMatching = useCallback(() => {
    if (!socket || !cameraReady) return;
    setIsMatching(true);
    socket.emit("join-queue", { userId: user?.id });
  }, [socket, user?.id, cameraReady]);

  const skipMatch = useCallback(() => {
    if (socket && roomIdRef.current) {
      socket.emit("action-skip");
    }
    if (navigator.vibrate) navigator.vibrate(50);
    endCallLocally(true);
  }, [socket, endCallLocally]);

  const connectUser = useCallback(async () => {
    if (connectTimer > 0 || connectionStatus === "sent" || connectionStatus === "accepted") return;
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    if (socket && roomIdRef.current && user) {
      socket.emit("action-connect", { roomId: roomIdRef.current, userId: user.id });
      setConnectionStatus("sent");
    }
  }, [socket, user, connectTimer]);

  const acceptConnection = useCallback(() => {
    if (socket && roomIdRef.current && user) {
      socket.emit("action-connect", { roomId: roomIdRef.current, userId: user.id });
      setShowConnectRequest(false);
      setConnectionStatus("accepted");
    }
  }, [socket, user]);

  const rejectConnection = useCallback(() => {
    setShowConnectRequest(false);
  }, []);

  const reportUser = useCallback(async () => {
    if (!roomIdRef.current || !remoteUser) return;
    
    // 1. Instant feedback & disconnect
    alert("User reported. The call has been ended for your safety.");
    
    // 2. Immediately end the call and rejoin queue
    skipMatch();
    
    // 3. Log the incident for admins AND block the user
    try {
      const token = localStorage.getItem("token");
      const reportedUserId = remoteUser._id || remoteUser.id;
      
      // Send report
      apiFetch(`${API_URL}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
          reportedUserId, 
          reason: `IMMEDIATE_REPORT: User reported during live video call (Room: ${roomIdRef.current})`, 
          roomId: roomIdRef.current 
        }),
      });

      // Automatically block
      apiFetch(`${API_URL}/api/users/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ blockedUserId: reportedUserId }),
      });

    } catch (error) {
      console.error("Failed to log report/block", error);
    }
  }, [remoteUser, skipMatch]);

  const togglePrivacy = useCallback(() => {
    const newPrivate = !isPrivate;
    setIsPrivate(newPrivate);
    if (socket && roomIdRef.current) {
      socket.emit("toggle-privacy", { roomId: roomIdRef.current, isPrivate: newPrivate });
    }
  }, [isPrivate, socket]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraEnabled(track.enabled);
  }, []);

  const toggleChat = useCallback(() => {
    setShowChat(prev => !prev);
    setHasNewMessage(false);
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // 7. Render
  //    Key design: BOTH <video> elements are ALWAYS in the DOM.
  //    We never conditionally unmount them. srcObject is controlled
  //    via refs, not React state. This is what prevents removeChild.
  // ─────────────────────────────────────────────────────────────────
  const isVideoRoute = location.pathname === '/video';
  const isPiP = !isVideoRoute && (inCall || isMatching);
  const isHidden = !isVideoRoute && !inCall && !isMatching;

  return (
    <div 
      className={`bg-[#0B0E14] overflow-hidden transition-all duration-500 z-40 ${
        isHidden ? "hidden" : "flex"
      } ${
        isVideoRoute ? "fixed inset-0 lg:absolute lg:inset-0 rounded-none md:rounded-3xl" : ""
      } ${
        isPiP ? "fixed bottom-24 right-4 w-48 h-72 sm:bottom-28 sm:right-6 sm:w-64 sm:h-96 shadow-2xl rounded-2xl z-[100] cursor-pointer ring-4 ring-purple-500/50 hover:scale-105 active:scale-95" : ""
      }`}
      onClick={isPiP ? () => navigate('/video') : undefined}
    >

      {/* Video Side */}
      <div className={`relative transition-all duration-500 h-full ${showChat && inCall && !isPiP ? "w-full lg:w-2/3" : "w-full"}`}>

        {/* Remote video — always mounted, hidden when not in call */}
        <div className="absolute inset-0 bg-[#151923] flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-all duration-700 ${(isBlurred || peerIsPrivate) ? "blur-[60px] scale-110" : "blur-0 scale-100"} ${inCall ? "block" : "hidden"}`}
          />

          {/* Idle / Matching overlay — shown when not in call */}
          {!inCall && (
            <div className="text-center z-10 w-full h-full flex flex-col items-center justify-center relative">
              {/* Top back button for idle state */}
              <div className="absolute top-0 left-0 w-full p-4 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-8 flex justify-between items-start z-10">
                <button 
                  onClick={() => navigate('/')}
                  className="md:hidden w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition border border-white/10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </div>

              {cameraError ? (
                <div className="flex flex-col items-center p-8 bg-red-500/10 border border-red-500/20 rounded-3xl animate-in zoom-in duration-300">
                  <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                  <p className="text-white font-bold mb-2">Camera Blocked</p>
                  <p className="text-gray-400 text-xs mb-6 max-w-xs">Please enable camera access in your browser settings to start matching.</p>
                  <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white/5 border border-white/10 text-white rounded-full hover:bg-white/10 transition">
                    Retry Connection
                  </button>
                </div>
              ) : penaltyMessage ? (
                <div className="flex flex-col items-center p-8 bg-orange-500/10 border border-orange-500/20 rounded-3xl animate-in zoom-in duration-300 mx-4">
                  <Timer className="w-12 h-12 text-orange-500 mb-4 animate-pulse" />
                  <p className="text-white font-bold mb-2">Slow Down!</p>
                  <p className="text-gray-400 text-sm mb-6 text-center">{penaltyMessage}</p>
                </div>
              ) : isMatching ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-xl text-white font-bold mb-6">Looking for a match...</p>
                  <button
                    onClick={() => {
                      socket?.emit("leave-queue");
                      setIsMatching(false);
                    }}
                    className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={startMatching}
                  disabled={!cameraReady}
                  className="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:scale-105 transition transform disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {cameraReady ? "Start Matching" : "Starting Camera..."}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Overlays — only rendered when in call */}
        {inCall && !isPiP && (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

            {/* Safety blur countdown */}
            {safetyBlurTimer > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none animate-in fade-in duration-500">
                <div className="bg-black/60 backdrop-blur-md p-6 rounded-full border border-white/10 flex flex-col items-center">
                  <Shield className="w-10 h-10 text-purple-400 mb-2" />
                  <p className="text-white font-bold text-sm">Safety Blur Active</p>
                  <p className="text-gray-400 text-xs">Unblurring in {safetyBlurTimer}s...</p>
                </div>
              </div>
            )}

            {/* Common Interests Visualizer */}
            {inCall && !isPiP && commonInterests.length > 0 && (
              <div className={`absolute top-24 left-1/2 -translate-x-1/2 z-20 w-full flex flex-col items-center gap-2 pointer-events-none transition-all duration-700 delay-500 px-4 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
                <div className="bg-gradient-to-r from-purple-600/90 to-pink-500/90 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 shadow-2xl flex items-center gap-2 max-w-full overflow-hidden">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-current animate-pulse" />
                  <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap overflow-hidden text-ellipsis">
                    Common: {commonInterests.join(' • ')}
                  </span>
                </div>
              </div>
            )}

            {/* Top bar */}
            <div className={`absolute top-0 left-0 w-full p-4 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-8 flex justify-between items-start z-10 transition-all duration-500 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10 pointer-events-none"}`}>
              <div className="flex items-center gap-3 pointer-events-auto">
                <button 
                  onClick={() => navigate('/')}
                  className="md:hidden w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition mr-1"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="w-12 h-12 rounded-full border-2 border-white/20 bg-[#151923] overflow-hidden flex items-center justify-center">
                  {remoteUser?.profilePic
                    ? <img src={remoteUser.profilePic} className="w-full h-full object-cover" alt="remote" />
                    : <User className="w-6 h-6 text-gray-500" />
                  }
                </div>
                <div  className="text-white font-bold text-lg leading-tight">
                  <h3 className="text-white font-bold text-base sm:text-lg leading-tight truncate max-w-[120px] sm:max-w-none">
                    {remoteUser?.fullName || remoteUser?.username || "Connecting..."}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
                  <button onClick={reportUser} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-500/20 backdrop-blur-md flex items-center justify-center text-red-500 hover:bg-red-500/40 transition">
                    <AlertTriangle className="w-5 h-5" />
                  </button>
                  <div className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-white font-black text-[9px] sm:text-[10px] mt-1 font-mono tracking-widest border border-white/5">LIVE</div>
                </div>
              </div>
              </div>

      {/* Match Success Overlay */}
      {showMatchSuccess && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none animate-in zoom-in-50 duration-500">
          <div className="bg-gradient-to-br from-purple-600/95 via-pink-600/95 to-orange-500/95 backdrop-blur-2xl px-12 py-8 rounded-[40px] border border-white/30 shadow-[0_0_150px_rgba(168,85,247,0.6)] flex flex-col items-center animate-pulse">
            <div className="text-5xl sm:text-7xl mb-4 drop-shadow-lg">✨</div>
            <h2 className="text-white text-4xl sm:text-6xl font-black uppercase tracking-[0.2em] drop-shadow-md">Match!</h2>
            <p className="text-white/90 text-[11px] font-black uppercase tracking-[0.4em] mt-3 drop-shadow-sm">Direct line open</p>
          </div>
        </div>
      )}

            {/* Connect request modal */}
            {showConnectRequest && (
              <div className="absolute inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={rejectConnection} />
                <div className="relative bg-[#151923] border border-purple-500/40 p-10 rounded-[50px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center flex flex-col items-center max-w-sm w-full animate-in zoom-in-95 duration-300">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-500/20 flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 rounded-full border-2 border-pink-500/30 animate-ping" />
                    <Heart className="w-12 h-12 text-pink-500 fill-current animate-pulse" />
                  </div>
                  <h3 className="text-white font-black text-2xl mb-2 tracking-tight">{remoteUser?.fullName || remoteUser?.username}</h3>
                  <p className="text-gray-400 text-[13px] mb-8 leading-relaxed font-medium uppercase tracking-wider">Wants to be your connection</p>
                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
                        acceptConnection();
                      }} 
                      className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-500 rounded-3xl text-white font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-purple-600/30 hover:scale-105 transition active:scale-95"
                    >
                      Accept Match
                    </button>
                    <button 
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(30);
                        rejectConnection();
                      }}
                      className="w-16 h-16 bg-white/5 rounded-3xl text-gray-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition active:scale-95 border border-white/10"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Side controls */}
            <div className={`absolute left-3 sm:left-4 md:left-auto md:right-4 xl:right-12 top-1/2 -translate-y-1/2 flex flex-col gap-3 sm:gap-4 z-10 transition-all duration-500 ${showControls ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10 md:translate-x-10 pointer-events-none"}`}>
              <button onClick={togglePrivacy} className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-md flex items-center justify-center text-white transition ${isPrivate ? "bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.5)]" : "bg-black/40 hover:bg-black/60"}`}>
                {isPrivate ? <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Eye className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
              <button onClick={toggleChat} className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-md flex items-center justify-center text-white transition ${showChat ? "bg-purple-600" : "bg-black/40 hover:bg-black/60"}`}>
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                {hasNewMessage && !showChat && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-pink-500 rounded-full border-2 border-[#0B0E14] animate-bounce" />
                )}
              </button>
              <button onClick={toggleMic} className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-md flex items-center justify-center text-white transition ${micEnabled ? "bg-black/40 hover:bg-black/60" : "bg-red-500 hover:bg-red-600"}`}>
                <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button 
                onClick={() => {
                  const newMode = !user?.lowBandwidth;
                  if (typeof setUser === 'function') {
                    setUser({ ...user, lowBandwidth: newMode });
                  }
                }} 
                title="Low Bandwidth Mode"
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-md flex items-center justify-center text-white transition ${user?.lowBandwidth ? "bg-orange-600 shadow-[0_0_15px_rgba(234,179,8,0.5)]" : "bg-black/40 hover:bg-black/60"}`}
              >
                <div className="text-[10px] font-black uppercase tracking-tighter">HD</div>
              </button>
            </div>

            {/* Bottom controls */}
            <div className={`absolute bottom-[110px] sm:bottom-8 left-0 w-full flex justify-center items-center gap-6 sm:gap-10 z-20 px-6 transition-all duration-500 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}`}>
              <div className="flex flex-col items-center gap-2">
                <button 
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(40);
                    skipMatch();
                  }} 
                  className="w-14 h-14 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/20 transition shadow-2xl group"
                >
                  <FastForward className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                </button>
                <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">Skip</span>
              </div>

              <button 
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                  skipMatch();
                }}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 shadow-[0_0_40px_rgba(239,68,68,0.4)] flex items-center justify-center text-white hover:scale-105 transition transform active:scale-95 border-4 border-white/10"
              >
                <PhoneOff className="w-8 h-8" />
              </button>

              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <button
                    onClick={connectUser}
                    disabled={connectTimer > 0 || connectionStatus === "sent" || connectionStatus === "accepted"}
                    className={`w-14 h-14 rounded-full backdrop-blur-xl border flex items-center justify-center transition active:scale-95 shadow-2xl ${
                      connectTimer > 0 ? "bg-black/20 text-gray-600 border-white/5 cursor-not-allowed" :
                      connectionStatus === "sent" ? "bg-purple-600 text-white border-transparent animate-pulse shadow-purple-500/30" :
                      connectionStatus === "accepted" ? "bg-green-500 text-white border-transparent shadow-green-500/30" :
                      "bg-white/5 text-pink-500 border-white/10 hover:bg-white/10 hover:border-pink-500/30"
                    }`}
                  >
                    {connectTimer > 0
                      ? <span className="text-sm font-black font-mono">{connectTimer}</span>
                      : <Heart className={`w-6 h-6 ${connectionStatus === "accepted" || connectionStatus === "sent" ? "fill-current" : ""}`} />
                    }
                  </button>
                  {connectTimer > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center border-2 border-[#0B0E14] animate-bounce shadow-lg">
                      <Timer className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">
                  {connectTimer > 0 ? "Wait" : connectionStatus === "sent" ? "Pending" : connectionStatus === "accepted" ? "Matched" : "Connect"}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Local video — always in DOM, always visible */}
        <div 
          ref={localVideoRefContainer}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{ 
            transform: `translate(${localVideoPos.x}px, ${localVideoPos.y}px)`,
            touchAction: 'none'
          }}
          className={`absolute rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-[60] cursor-grab active:cursor-grabbing transition-shadow ${
            isPiP ? "w-12 h-16 bottom-2 right-2" : 
            inCall ? "w-28 h-40 bottom-28 right-4 sm:bottom-auto sm:top-6 sm:right-20" : "w-28 h-40 top-24 sm:top-6 right-4 sm:right-6"
          } ${isDragging.current ? "scale-105 shadow-purple-500/30" : "scale-100"}`}
        >
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] pointer-events-none" />
          {!cameraEnabled && (
            <div className="absolute inset-0 bg-[#151923] flex items-center justify-center pointer-events-none">
              <User className={`text-gray-500 ${isPiP ? "w-4 h-4" : "w-8 h-8"}`} />
            </div>
          )}
        </div>
      </div>

      {/* Persistent Settings Button — Visible in Video Discovery (not PiP) */}
      {isVideoRoute && !isPiP && (
        <button 
          onClick={() => setShowSettings(true)} 
          className="fixed top-24 right-4 sm:top-6 sm:right-32 w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-md flex items-center justify-center text-white bg-black/40 hover:bg-black/60 transition z-[60] border border-white/10 shadow-xl"
          title="Match Settings"
        >
          <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Chat panel — always mounted, visibility controlled by CSS to prevent unmount race conditions */}
      <div
        aria-hidden={!showChat || !inCall || isPiP}
        className={`transition-all duration-500 overflow-hidden z-40 bg-[#0B0E14]
          absolute bottom-0 left-0 w-full rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]
          lg:static lg:rounded-none lg:shadow-none lg:border-l lg:border-[#1e293b] lg:h-full pb-20 lg:pb-0
          ${
          showChat && inCall && !isPiP 
            ? "h-[85%] opacity-100 translate-y-0 lg:w-1/3 lg:opacity-100" 
            : "h-0 opacity-0 translate-y-full lg:translate-y-0 lg:w-0 lg:opacity-0 pointer-events-none"
        }`}
      >
        <ChatPanel
          onClose={toggleChat}
          remoteUser={remoteUser}
          roomId={roomIdRef.current}
          persistedMessages={chatMessages}
          onSendMessage={(msg) => setChatMessages(prev => [...prev, msg])}
        />
      </div>

      {showSettings && (
        <MatchSettingsModal 
          onClose={() => setShowSettings(false)}
          currentPreferences={matchPreferences}
          onSave={(newPrefs) => {
            setMatchPreferences(newPrefs);
            // Optionally update the user object in context as well
            if (typeof setUser === 'function') {
              setUser({ ...user, matchPreferences: newPrefs });
            }
          }}
        />
      )}
    </div>
  );
};

export default VideoContainer;
