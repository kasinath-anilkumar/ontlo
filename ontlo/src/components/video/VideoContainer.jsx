import { Shield, Mic, FastForward, PhoneOff, Heart, AlertTriangle, EyeOff, Eye, MessageSquare, Check, X, Timer, User, ChevronLeft, Settings, Star, Video, RefreshCw, Camera, Sparkles, MoreVertical, MapPin, Music, Coffee, Lock, Headphones, Users, Maximize2 } from "lucide-react";
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
  const [callDuration, setCallDuration] = useState(0);
  const [safetyBlurTimer, setSafetyBlurTimer] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [penaltyMessage, setPenaltyMessage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [cameraRequested, setCameraRequested] = useState(false);
  const [commonInterests, setCommonInterests] = useState([]);
  const [icebreaker, setIcebreaker] = useState(null);
  const [isWildcard, setIsWildcard] = useState(false);
  const [curiosityBlurTimer, setCuriosityBlurTimer] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [localVideoPos, setLocalVideoPos] = useState({ x: 0, y: 0 });
  const [isDraggingState, setIsDraggingState] = useState(false);
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
      // Only start if explicitly requested or already in/starting a call
      if (!cameraRequested && !inCall && !isMatching) return;

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
        if (err.name === 'NotAllowedError') {
          setCameraError('Permission Denied');
        } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
          setCameraError('Blocked by System');
        } else {
          setCameraError('Camera Error');
        }
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
    };
  }, [user?.lowBandwidth, socket, cameraRequested, inCall, isMatching]);

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
        setCuriosityBlurTimer(prev => (prev > 0 ? prev - 1 : 0));
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
    setIsDraggingState(true);
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX - localVideoPos.x, y: clientY - localVideoPos.y };
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleDragMove = useCallback((e) => {
    if (!setIsDraggingState) return;
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    
    // Boundary check
    const newX = clientX - dragStart.current.x;
    const newY = clientY - dragStart.current.y;
    
    setLocalVideoPos({ x: newX, y: newY });
  }, []); // Ref based, no deps needed for stability

  const handleDragEnd = () => {
    setIsDraggingState(false);
    
    // Snap to nearest corner (simplified)
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const snapX = localVideoPos.x > 0 ? 0 : -(windowWidth - 120); // Placeholder logic
    // We'll just keep it where it is for now but add a small bounce animation
    if (navigator.vibrate) navigator.vibrate(5);
  };

  useEffect(() => {
    if (isDraggingState) {
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
  }, [handleDragMove]); // Now handleDragMove is stable since it doesn't depend on localVideoPos

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
    setCallDuration(0);
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

    const onMatchFound = async ({ roomId: rId, role, remoteUserId: remoteId, icebreaker: prompt, isWildcard: wildcardFlag }) => {
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
      setIcebreaker(prompt);
      setIsWildcard(wildcardFlag);

      // Curiosity Loop: 30s Blur
      setCuriosityBlurTimer(30);

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

    const onMessagesRead = ({ connectionId: readConnId }) => {
      if (readConnId === roomIdRef.current) {
        setChatMessages(prev => prev.map(m => m.type === "self" ? { ...m, isRead: true } : m));
      }
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
    socket.on("messages-read", onMessagesRead);

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
      socket.off("messages-read", onMessagesRead);
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
        isHidden ? "hidden" : "flex flex-col"
      } ${
        isVideoRoute ? "absolute inset-0 rounded-none h-screen" : ""
      } ${
        isPiP ? "fixed bottom-24 right-4 w-48 h-72 sm:bottom-28 sm:right-6 sm:w-64 sm:h-96 shadow-2xl rounded-2xl z-[100] cursor-pointer ring-4 ring-purple-500/50 hover:scale-105 active:scale-95 bg-[#151923] flex-row" : ""
      }`}
      onClick={isPiP ? () => navigate('/video') : undefined}
    >
      {isPiP ? (
        <div className="relative w-full h-full">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ filter: (isBlurred || peerIsPrivate) ? "blur(60px) scale(1.1)" : "none" }}
            className={`w-full h-full object-cover rounded-2xl transition-all duration-700 ${inCall ? "block" : "hidden"}`}
          />
          <div className="absolute bottom-2 right-2 w-12 h-16 rounded-xl overflow-hidden border-2 border-white/20 z-[60]">
             <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] pointer-events-none" />
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-[#1e293b] shrink-0 bg-[#0B0E14] z-50">
             <div className="flex items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-1">
                   <span className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">C</span>
                   <span className="text-lg sm:text-xl font-bold text-white">you</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-[#1e293b]"></div>
                <h1 className="text-base sm:text-lg font-bold text-white hidden sm:block">Video Chat</h1>
                <div className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] sm:text-xs font-bold border border-green-500/20">
                   <Shield className="w-3 h-3" /> <span className="hidden sm:inline">Safe & Secure</span><span className="sm:hidden">Secure</span>
                </div>
             </div>
             <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={reportUser} className="hidden sm:flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#151923] border border-[#1e293b] rounded-xl text-xs sm:text-sm font-bold text-gray-300 hover:text-white transition">
                   <AlertTriangle className="w-4 h-4 text-red-500" /> Report
                </button>
                <button className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-[#151923] border border-[#1e293b] rounded-xl text-gray-400 hover:text-white transition">
                   <MoreVertical className="w-4 h-4" />
                </button>
                <button onClick={() => endCallLocally(false)} className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs sm:text-sm font-bold hover:bg-red-500 hover:text-white transition">
                   <PhoneOff className="w-4 h-4" /> Leave
                </button>
             </div>
          </div>

          {/* Main Body */}
          <div className="flex flex-1 overflow-hidden p-2 sm:p-4 gap-4 bg-[#05070A]">
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#05070A]">
               {showMatchSuccess && (
                 <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none animate-in zoom-in-50 duration-500">
                   <div className="bg-gradient-to-br from-purple-600/95 via-pink-600/95 to-orange-500/95 backdrop-blur-2xl px-12 py-8 rounded-[40px] border border-white/30 shadow-[0_0_150px_rgba(168,85,247,0.6)] flex flex-col items-center animate-pulse">
                     <div className="text-5xl sm:text-7xl mb-4 drop-shadow-lg">✨</div>
                     <h2 className="text-white text-4xl sm:text-6xl font-black uppercase tracking-[0.2em] drop-shadow-md">Match!</h2>
                   </div>
                 </div>
               )}

               <div className={`flex-1 min-h-0 relative flex ${inCall ? 'flex-col lg:flex-row gap-4' : 'items-center justify-center'}`}>
                  {!inCall && (
                     <div className="absolute inset-0 bg-[#0B0E14] rounded-3xl overflow-hidden border border-[#1e293b]">
                       <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-20" />
                       <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.05),transparent_70%)]"></div>
                       <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl z-10" />
                       <div className="relative z-20 w-full h-full flex flex-col items-center justify-center p-6">
                          {!isMatching && !cameraError && !penaltyMessage && (
                            <div className="mb-12 animate-in fade-in slide-in-from-top-8 duration-1000">
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Discovery Active</span>
                              </div>
                              <h1 className="text-md md:text-lg font-black text-white mb-4 tracking-tighter italic uppercase leading-none text-center">
                                Find<br/>Real Once.
                              </h1>
                              <p className="text-gray-500 text-xs md:text-sm font-medium max-w-sm mx-auto leading-relaxed uppercase tracking-widest text-center">
                                Meet interesting people from around the globe in a safe, moderated space.
                              </p>
                            </div>
                          )}

                          {cameraError ? (
                            <div className="flex flex-col items-center p-10 bg-[#151923]/60 backdrop-blur-2xl border border-red-500/20 rounded-[40px] animate-in zoom-in duration-500 mx-4 text-center max-w-sm shadow-2xl">
                              <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                              </div>
                              <p className="text-white text-xl font-black mb-3 uppercase tracking-tight">
                                {cameraError === 'Blocked by System' ? 'Overlay Detected' : 'Camera Blocked'}
                              </p>
                              <p className="text-gray-400 text-xs mb-8 leading-relaxed font-medium">
                                {cameraError === 'Blocked by System' 
                                  ? 'Another app is drawing over Ontlo. Please close any chat bubbles or screen dimmers.' 
                                  : 'Please enable camera access in your browser settings to start matching.'}
                              </p>
                              <button onClick={() => window.location.reload()} className="w-full py-4 bg-white text-black rounded-2xl hover:bg-gray-200 transition font-black text-[11px] uppercase tracking-[0.2em] shadow-xl">
                                Retry Connection
                              </button>
                            </div>
                          ) : penaltyMessage ? (
                            <div className="flex flex-col items-center p-10 bg-[#151923]/60 backdrop-blur-2xl border border-orange-500/20 rounded-[40px] animate-in zoom-in duration-500 mx-4 max-w-sm">
                              <div className="w-16 h-16 rounded-3xl bg-orange-500/10 flex items-center justify-center mb-6">
                                <Timer className="w-8 h-8 text-orange-500 animate-pulse" />
                              </div>
                              <p className="text-white text-xl font-black mb-3 uppercase tracking-tight">Slow Down</p>
                              <p className="text-gray-400 text-xs mb-4 text-center font-medium leading-relaxed">{penaltyMessage}</p>
                            </div>
                          ) : isMatching ? (
                            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
                              <div className="relative mb-10">
                                <div className="w-24 h-24 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center animate-pulse">
                                    <Video className="w-6 h-6 text-purple-400" />
                                  </div>
                                </div>
                              </div>
                              <h2 className="text-2xl md:text-3xl text-white font-black mb-2 uppercase tracking-tighter italic">Finding a match</h2>
                              <div className="flex items-center gap-2 mb-8">
                                <span className="text-[10px] text-purple-400 font-black uppercase tracking-[0.3em]">AI Moderator Screening</span>
                                <div className="flex gap-1">
                                   <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce delay-100"></div>
                                   <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce delay-200"></div>
                                   <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce delay-300"></div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  socket?.emit("leave-queue");
                                  setIsMatching(false);
                                }}
                                className="px-10 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition font-black text-[10px] uppercase tracking-[0.2em]"
                              >
                                Stop Matching
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center max-w-lg w-full animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
                              <div className="w-full bg-[#151923]/40 backdrop-blur-3xl border border-white/5 p-8 rounded-[40px] mb-8 relative overflow-hidden group hover:border-purple-500/20 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                  <Shield className="w-20 h-20 text-purple-500" />
                                </div>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-4 text-left">Community Protocol</p>
                                <p className="text-white text-sm md:text-base font-bold text-left leading-relaxed mb-6">
                                  By matching, you join a vetted community. <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 italic">Respect others, stay safe, and enjoy the conversation.</span>
                                </p>
                                <div className="flex flex-wrap gap-3">
                                  <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 uppercase tracking-widest">No Nudity</div>
                                  <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 uppercase tracking-widest">No Harassment</div>
                                  <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-gray-400 uppercase tracking-widest">18+ Only</div>
                                </div>
                              </div>

                              <button
                                onClick={cameraReady ? startMatching : () => setCameraRequested(true)}
                                className={`group relative w-full overflow-hidden bg-white text-black font-black py-6 px-10 rounded-3xl shadow-[0_20px_50px_rgba(168,85,247,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 ${cameraError ? "opacity-40 cursor-not-allowed" : "opacity-100"}`}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                <span className="relative z-10 text-[13px] uppercase tracking-[0.3em]">
                                  {cameraReady ? "Find a Match" : (cameraRequested && !cameraError ? "Connecting..." : "Enable Camera")}
                                </span>
                              </button>
                              
                              <p className="mt-8 text-[9px] text-gray-600 font-black uppercase tracking-[0.4em] opacity-40">
                                Ontlo // Secure Video Layer
                              </p>
                            </div>
                          )}
                       </div>
                     </div>
                  )}

                  <div className={`relative flex-1 rounded-3xl overflow-hidden bg-[#151923] border border-[#1e293b] shadow-2xl ${!inCall ? 'hidden' : 'block'}`}>
                     <video
                       ref={remoteVideoRef}
                       autoPlay
                       playsInline
                       style={{ filter: (isBlurred || peerIsPrivate) ? "blur(60px) scale(1.1)" : (curiosityBlurTimer > 0) ? `blur(${curiosityBlurTimer * 2}px) scale(${1 + (curiosityBlurTimer / 60)})` : "none" }}
                       className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
                     />
                     {inCall && (
                       <>
                         <div className="absolute top-4 left-4 flex gap-2 z-10">
                           <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10">
                              <img src={remoteUser?.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg'} className="w-8 h-8 rounded-full object-cover" />
                              <div className="flex flex-col">
                                 <div className="flex items-center gap-1">
                                    <span className="text-sm font-bold text-white">{remoteUser?.fullName || remoteUser?.username || 'Connecting...'}</span>
                                    <Check className="w-3 h-3 text-blue-400 bg-white rounded-full p-0.5" />
                                 </div>
                                 <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div>
                                    <span className="text-[10px] text-gray-300 font-medium">Online</span>
                                 </div>
                              </div>
                           </div>
                         </div>
                         <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
                           <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 text-xs text-gray-200 font-medium">
                             <MapPin className="w-3.5 h-3.5 text-purple-400" />
                             {remoteUser?.location || 'Unknown Location'}
                           </div>
                           {commonInterests.length > 0 && (
                             <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 text-xs text-gray-200 font-medium">
                               <Music className="w-3.5 h-3.5 text-blue-400" />
                               <span>Similar interests: </span>
                               {commonInterests.slice(0, 2).map((int, i) => (
                                 <span key={i} className="flex items-center gap-1">{int}</span>
                               ))}
                             </div>
                           )}
                         </div>
                       </>
                     )}
                  </div>

                  <div className={`relative flex-1 rounded-3xl overflow-hidden bg-[#151923] border border-[#1e293b] shadow-2xl ${!inCall ? 'hidden' : 'block'}`}>
                     <video
                       ref={localVideoRef}
                       autoPlay
                       playsInline
                       muted
                       className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                     />
                     {!cameraEnabled && (
                       <div className="absolute inset-0 bg-[#151923] flex items-center justify-center pointer-events-none">
                         <User className="w-12 h-12 text-gray-500" />
                       </div>
                     )}
                     {inCall && (
                       <>
                         <div className="absolute top-4 left-4 flex gap-2 z-10">
                           <div className="flex flex-col gap-1 bg-black/60 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10">
                              <div className="flex items-center gap-1.5 text-white">
                                <Timer className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-sm font-bold font-mono">
                                  {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-full border border-pink-500 bg-transparent flex items-center justify-center">
                                   <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
                                </div>
                                <span className="text-[10px] text-gray-300 font-medium">Limit: 3 min</span>
                              </div>
                           </div>
                           <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex flex-col justify-center">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">You</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div>
                              </div>
                              <span className="text-[10px] text-gray-300 font-medium">Online</span>
                           </div>
                         </div>
                         <div className="absolute top-4 right-4 z-10">
                            <button className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition">
                               <Maximize2 className="w-4 h-4" />
                            </button>
                         </div>
                       </>
                     )}
                  </div>

                  {inCall && showConnectRequest && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in-95 duration-300 w-full max-w-[320px]">
                       <div className="relative bg-[#151923]/95 backdrop-blur-xl border border-purple-500/40 p-6 sm:p-8 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center flex flex-col items-center w-full">
                         <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                           <Heart className="w-6 h-6 text-white fill-current animate-pulse" />
                         </div>
                         <h3 className="text-white font-bold text-lg mb-1 mt-4">Enjoying the conversation?</h3>
                         <p className="text-gray-400 text-xs mb-6">Connect to continue chatting.</p>
                         <button 
                           onClick={acceptConnection} 
                           className="w-full py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl text-white font-bold text-sm shadow-xl shadow-purple-600/30 hover:scale-105 transition active:scale-95"
                         >
                           Connect
                         </button>
                         <button onClick={rejectConnection} className="mt-4 text-xs font-medium text-gray-500 hover:text-white transition">Dismiss</button>
                       </div>
                    </div>
                  )}
               </div>

               {inCall && (
                 <div className="h-20 sm:h-24 shrink-0 flex items-center justify-between px-4 sm:px-8 mt-4 bg-[#151923] rounded-3xl border border-[#1e293b]">
                   <div className="flex items-center gap-3 sm:gap-8">
                     <button className="flex flex-col items-center gap-1 sm:gap-2 group">
                       <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-gray-300 group-hover:bg-white/10 transition">
                         <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                       </div>
                       <span className="text-[10px] text-gray-500 font-medium">Flip</span>
                     </button>
                     <button onClick={toggleMic} className="flex flex-col items-center gap-1 sm:gap-2 group">
                       <div className={`w-10 h-10 sm:w-12 sm:h-12 border rounded-2xl flex items-center justify-center transition ${micEnabled ? "bg-white/5 border-white/10 text-gray-300 group-hover:bg-white/10" : "bg-red-500/20 border-red-500/50 text-red-500"}`}>
                         <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                       </div>
                       <span className="text-[10px] text-gray-500 font-medium">Mic</span>
                     </button>
                     <button onClick={toggleCamera} className="flex flex-col items-center gap-1 sm:gap-2 group hidden sm:flex">
                       <div className={`w-10 h-10 sm:w-12 sm:h-12 border rounded-2xl flex items-center justify-center transition ${cameraEnabled ? "bg-white/5 border-white/10 text-gray-300 group-hover:bg-white/10" : "bg-red-500/20 border-red-500/50 text-red-500"}`}>
                         <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                       </div>
                       <span className="text-[10px] text-gray-500 font-medium">Camera</span>
                     </button>
                   </div>

                   <button 
                     onClick={() => endCallLocally(false)}
                     className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] flex items-center justify-center text-white hover:scale-105 transition transform active:scale-95"
                   >
                     <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
                   </button>

                   <div className="flex items-center gap-3 sm:gap-8">
                     <button onClick={togglePrivacy} className="flex flex-col items-center gap-1 sm:gap-2 group hidden sm:flex">
                       <div className={`w-10 h-10 sm:w-12 sm:h-12 border rounded-2xl flex items-center justify-center transition ${isPrivate ? "bg-purple-600/20 border-purple-500/50 text-purple-400" : "bg-white/5 border-white/10 text-gray-300 group-hover:bg-white/10"}`}>
                         {isPrivate ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                       </div>
                       <span className="text-[10px] text-gray-500 font-medium">Privacy</span>
                     </button>
                     <button onClick={skipMatch} className="flex flex-col items-center gap-1 sm:gap-2 group">
                       <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-gray-300 group-hover:bg-white/10 transition">
                         <FastForward className="w-4 h-4 sm:w-5 sm:h-5" />
                       </div>
                       <span className="text-[10px] text-gray-500 font-medium">End Chat</span>
                     </button>
                     <button onClick={toggleChat} className="flex flex-col items-center gap-1 sm:gap-2 group relative">
                       <div className={`h-10 sm:h-12 px-3 sm:px-5 border rounded-2xl flex items-center gap-2 transition ${showChat ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-white/5 border-white/10 text-gray-300 group-hover:bg-white/10'}`}>
                         <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                         <span className="text-xs font-bold hidden md:inline">Live Chat</span>
                       </div>
                       {hasNewMessage && !showChat && (
                          <div className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 w-4 sm:w-5 h-4 sm:h-5 bg-purple-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#151923]">
                            !
                          </div>
                       )}
                     </button>
                   </div>
                 </div>
               )}

               {inCall && (
                 <div className="hidden xl:flex flex-col mt-4 gap-4 shrink-0">
                    <div className="flex gap-4">
                      <div className="flex-1 bg-[#151923] rounded-3xl p-4 flex items-center gap-4 border border-[#1e293b]">
                        <div className="p-2.5 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                          <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-300">Cyou ensures a safe and respectful environment for everyone. <a href="#" className="text-purple-400 font-bold ml-1">Learn more</a></p>
                        </div>
                      </div>
                      <div className="flex-1 bg-[#151923] rounded-3xl p-4 flex items-center justify-between border border-[#1e293b]">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                            <Sparkles className="w-5 h-5 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-300 mb-0.5">Tip: Be respectful and keep it friendly.</p>
                            <p className="text-[11px] text-gray-500">Inappropriate behavior will lead to account action.</p>
                          </div>
                        </div>
                        <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex bg-[#151923] rounded-[32px] border border-[#1e293b] p-5 divide-x divide-[#1e293b]">
                      <div className="flex-1 flex items-center gap-4 px-6">
                        <div className="p-3 bg-purple-500/10 rounded-2xl"><Users className="w-5 h-5 text-purple-400" /></div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-300 mb-0.5">Video Chat Rules</h4>
                          <p className="text-[11px] text-gray-500 leading-tight">Be respectful and follow<br/>our community guidelines.</p>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center gap-4 px-6">
                        <div className="p-3 bg-pink-500/10 rounded-2xl"><Heart className="w-5 h-5 text-pink-400" /></div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-300 mb-0.5">No Pressure</h4>
                          <p className="text-[11px] text-gray-500 leading-tight">You can skip anytime<br/>if you're not comfortable.</p>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center gap-4 px-6">
                        <div className="p-3 bg-green-500/10 rounded-2xl"><Lock className="w-5 h-5 text-green-400" /></div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-300 mb-0.5">You're in Control</h4>
                          <p className="text-[11px] text-gray-500 leading-tight">Connect only if you<br/>both are interested.</p>
                        </div>
                      </div>
                      <div className="flex-1 flex items-center gap-4 px-6">
                        <div className="p-3 bg-blue-500/10 rounded-2xl"><Headphones className="w-5 h-5 text-blue-400" /></div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-300 mb-0.5">Need Help?</h4>
                          <p className="text-[11px] text-gray-500 leading-tight">If someone makes you uncomfortable,<br/>report them to our team.</p>
                        </div>
                      </div>
                    </div>
                 </div>
               )}
            </div>

            <div className={`transition-all duration-500 overflow-hidden rounded-[32px] bg-[#0B0E14] border border-[#1e293b] flex flex-col shrink-0 ${showChat && inCall ? 'w-[360px] opacity-100' : 'w-0 opacity-0 border-0'}`}>
               <div className="h-16 flex items-center justify-between px-6 border-b border-[#1e293b] shrink-0">
                  <div className="flex items-center gap-2">
                     <h2 className="text-base font-bold text-white">Live Chat</h2>
                     <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">{chatMessages.length}</div>
                  </div>
                  <button onClick={toggleChat} className="text-gray-500 hover:text-white transition"><X className="w-5 h-5" /></button>
               </div>
               <div className="flex-1 overflow-hidden relative flex flex-col p-4 bg-[#0B0E14]">
                  <div className="mb-4 bg-purple-600/10 border border-purple-500/20 p-4 rounded-3xl flex gap-3 items-start">
                     <div className="p-2 bg-purple-500/20 rounded-xl mt-1"><Shield className="w-4 h-4 text-purple-400" /></div>
                     <div>
                       <p className="text-sm font-bold text-white mb-1">Be kind and respectful.</p>
                       <p className="text-[11px] text-gray-400 leading-relaxed">Our community guidelines help keep Cyou a safe place for all.</p>
                     </div>
                  </div>
                  <div className="flex-1 overflow-hidden rounded-2xl relative">
                     <ChatPanel
                        onClose={() => {}} 
                        remoteUser={remoteUser}
                        roomId={roomIdRef.current}
                        persistedMessages={chatMessages}
                        onSendMessage={(msg) => setChatMessages(prev => [...prev, msg])}
                     />
                     <div className="absolute bottom-0 left-0 w-full bg-[#0B0E14]/90 backdrop-blur-md p-3 text-center border-t border-[#1e293b]">
                        <div className="flex items-center justify-center gap-2 mb-1">
                           <Lock className="w-3 h-3 text-purple-400" />
                           <span className="text-[10px] text-gray-400">Messages are visible only during the call.</span>
                        </div>
                        <span className="text-[10px] text-purple-400">Connect to continue the conversation.</span>
                     </div>
                  </div>
               </div>
            </div>

          </div>
        </>
      )}

      {showSettings && (
        <MatchSettingsModal 
          onClose={() => setShowSettings(false)}
          currentPreferences={matchPreferences}
          onSave={(newPrefs) => {
            setMatchPreferences(newPrefs);
            if (typeof setUser === 'function') {
              setUser({ ...user, matchPreferences: newPrefs });
            }
          }}
        />
      )}

      <UnmountCleanup 
        socket={socket} 
        endCallLocally={endCallLocally} 
        roomIdRef={roomIdRef} 
        rejoinTimerRef={rejoinTimerRef} 
      />
    </div>
  );
};

// Separate Cleanup Effect to handle unmount logic after all helpers are defined
const UnmountCleanup = ({ socket, endCallLocally, roomIdRef, rejoinTimerRef }) => {
  useEffect(() => {
    return () => {
      // Clear any pending rejoin timer
      if (rejoinTimerRef.current) {
        clearTimeout(rejoinTimerRef.current);
      }
      
      // Leave rooms and queue
      if (socket) {
        socket.emit("leave-queue");
        if (roomIdRef.current) {
          socket.emit("leave-chat", { roomId: roomIdRef.current });
        }
      }
      
      // Clean up WebRTC
      endCallLocally(false);
    };
  }, [socket, endCallLocally, roomIdRef, rejoinTimerRef]);

  return null;
};

export default VideoContainer;
