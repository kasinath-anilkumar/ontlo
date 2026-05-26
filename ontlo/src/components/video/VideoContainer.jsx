import { AlertTriangle, Camera, Check, Heart, Lock, MessageSquare, Mic, Music, PhoneOff, RefreshCw, Settings, Shield, Timer, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ontloLogo from "../../assets/ontlo_Logo.webp";
import { useSocket } from "../../context/SocketContext";
import API_URL, { apiFetch } from "../../utils/api";
import ChatPanel from "../chat/ChatPanel";
import MatchSettingsModal from "./MatchSettingsModal";

const VideoContainer = () => {
  const { socket, isConnected, user, setUser, connections } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  // ── Video element refs ──
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // ── WebRTC / call state refs ──
  const peerConnectionRef = useRef(null);
  const roomIdRef = useRef(null);
  const localStreamRef = useRef(null);
  const autoRejoinRef = useRef(false);
  const cleaningUpRef = useRef(false);
  const rejoinTimerRef = useRef(null);

  // ── UI state ──
  const [isMatching, setIsMatching] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [showMatchSuccess, setShowMatchSuccess] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [callMode, setCallMode] = useState('video');
  const [matchedCallMode, setMatchedCallMode] = useState('video');
  const [icebreakerQuestion, setIcebreakerQuestion] = useState(null);
  const [localVote, setLocalVote] = useState(null);
  const [remoteVote, setRemoteVote] = useState(null);
  const [showIcebreakerGame, setShowIcebreakerGame] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [peerIsPrivate, setPeerIsPrivate] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const showChatRef = useRef(false);
  useEffect(() => { showChatRef.current = showChat; }, [showChat]);
  const [chatMessages, setChatMessages] = useState([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [showConnectRequest, setShowConnectRequest] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const connectionStatusRef = useRef(null);
  useEffect(() => { connectionStatusRef.current = connectionStatus; }, [connectionStatus]);
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
  const [declineTimer, setDeclineTimer] = useState(0);
  const declineIntervalRef = useRef(null);
  const [localVideoPos, setLocalVideoPos] = useState({ x: 0, y: 0 });
  const [isDraggingState, setIsDraggingState] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [matchPreferences, setMatchPreferences] = useState(user?.matchPreferences || {
    gender: 'All',
    ageRange: { min: 18, max: 100 },
    region: 'Global',
    interests: []
  });

  const isAlreadyMatched = connections?.some(conn => {
    const remoteId = remoteUser?._id || remoteUser?.id;
    if (!remoteId) return false;
    return (conn.user?._id?.toString() === remoteId.toString() ||
      conn.user?.id?.toString() === remoteId.toString());
  });

  // ── Camera Initialization ──
  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      if (!cameraRequested && !inCall && !isMatching) return;
      try {
        const isAudioCall = inCall ? (matchedCallMode === 'audio') : (callMode === 'audio');
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: isAudioCall ? false : (user?.lowBandwidth
            ? { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { max: 15 } }
            : { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 24 } })
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

        // If we are already in a call (matched fast), add tracks now
        const pc = peerConnectionRef.current;
        if (pc && pc.signalingState !== 'closed') {
          const senders = pc.getSenders();
          let tracksAdded = false;
          stream.getTracks().forEach(track => {
            const alreadyAdded = senders.find(s => s.track?.id === track.id);
            if (!alreadyAdded) {
              pc.addTrack(track, stream);
              tracksAdded = true;
            }
          });

          if (tracksAdded && pc.signalingState === 'stable') {
            pc.createOffer().then(offer => pc.setLocalDescription(offer)).then(() => {
              socket.emit("webrtc-offer", { offer: pc.localDescription, roomId: roomIdRef.current });
            }).catch(e => console.warn("Renegotiation failed:", e));
          }
        }
      } catch (err) {
        console.error("Failed to get local stream", err);
        if (err.name === 'NotAllowedError') setCameraError('Permission Denied');
        else if (err.name === 'NotReadableError' || err.name === 'AbortError') setCameraError('Blocked by System');
        else setCameraError('Camera Error');
      }
    };
    startCamera();
    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [user?.lowBandwidth, cameraRequested, inCall, isMatching, callMode, matchedCallMode]);

  // ── Call Timers ──
  useEffect(() => {
    let interval;
    let connectTimer = 0;
    if (inCall) {
      interval = setInterval(() => {
        connectTimer += 1;
        setCallDuration(prev => prev + 1);
        setSafetyBlurTimer(prev => {
          if (prev === 1) setIsBlurred(false);
          return prev > 0 ? prev - 1 : 0;
        });
        setCuriosityBlurTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [inCall]);

  // ── Draggable Local Video Logic ──
  const handleDragStart = (e) => {
    setIsDraggingState(true);
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX - localVideoPos.x, y: clientY - localVideoPos.y };
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleDragMove = useCallback((e) => {
    if (!isDraggingState) return;
    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    setLocalVideoPos({ x: clientX - dragStart.current.x, y: clientY - dragStart.current.y });
  }, [isDraggingState]);

  const handleDragEnd = useCallback(() => {
    setIsDraggingState(false);
    if (navigator.vibrate) navigator.vibrate(5);
  }, []);

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
  }, [isDraggingState, handleDragMove, handleDragEnd]);

  const startMatching = useCallback(() => {
    if (!socket || !user) return;
    setIsMatching(true);
    socket.emit("join-queue", { userId: user?.id || user?._id, callMode });
  }, [socket, user, callMode]);

  // ── Cleanup Logic ──
  const endCallLocally = useCallback((shouldAutoRejoin = true) => {
    if (cleaningUpRef.current) return;
    cleaningUpRef.current = true;
    if (socket && roomIdRef.current) socket.emit("action-skip");
    const pc = peerConnectionRef.current;
    if (pc) {
      pc.onicecandidate = null; pc.ontrack = null; pc.onconnectionstatechange = null;
      pc.close(); peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    roomIdRef.current = null;
    setInCall(false); setShowChat(false); setRemoteUser(null); setIsBlurred(false);
    setIsPrivate(false); setPeerIsPrivate(false); setCommonInterests([]);
    setShowConnectRequest(false); setConnectionStatus(null); setCallDuration(0);
    setChatMessages([]); setHasNewMessage(false); setIsMatching(false);
    setLocalVote(null); setRemoteVote(null); setShowIcebreakerGame(false); setIcebreakerQuestion(null);
    if (shouldAutoRejoin) {
      if (rejoinTimerRef.current) clearTimeout(rejoinTimerRef.current);
      rejoinTimerRef.current = setTimeout(() => {
        rejoinTimerRef.current = null;
        if (socket) { setIsMatching(true); socket.emit("join-queue", { userId: user?.id }); }
      }, 500);
    }
    cleaningUpRef.current = false;
  }, [socket, user?.id]);

  // ── WebRTC Helper ──
  const createPeerConnection = useCallback((rId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:stun.services.mozilla.com" },
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" }
      ],
      iceCandidatePoolSize: 10,
    });
    pc.onicecandidate = (e) => { if (e.candidate && roomIdRef.current && socket) socket.emit("webrtc-ice-candidate", { candidate: e.candidate, roomId: roomIdRef.current }); };
    pc.ontrack = (e) => {
      const el = remoteVideoRef.current;
      if (!el) return;
      if (e.streams && e.streams.length > 0) {
        el.srcObject = e.streams[0];
      } else {
        let stream = el.srcObject;
        if (!(stream instanceof MediaStream)) {
          stream = new MediaStream();
          el.srcObject = stream;
        }
        stream.addTrack(e.track);
      }
      // Mobile / autoplay policies: explicitly try to play remote A/V
      el.play?.().catch(() => { });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          const params = videoSender.getParameters();
          if (!params.encodings) params.encodings = [{}];
          params.encodings[0].maxBitrate = user?.lowBandwidth ? 250000 : 750000;
          videoSender.setParameters(params).catch(() => { });
        }
      }
      if (pc.connectionState === "failed") endCallLocally(true);
    };
    return pc;
  }, [socket, endCallLocally, user?.lowBandwidth]);

  const iceQueue = useRef([]);

  // ── Socket Event Listeners ──
  useEffect(() => {
    if (!socket) return;

    /** Wait until getUserMedia (driven by inCall / isMatching) fills localStreamRef */
    const waitForLocalStream = async (maxMs = 20000) => {
      const start = Date.now();
      while (!localStreamRef.current && Date.now() - start < maxMs) {
        await new Promise((r) => setTimeout(r, 50));
      }
      return localStreamRef.current;
    };

    const attachLocalTracks = (pc, stream) => {
      if (!stream || !pc || pc.signalingState === 'closed') return;
      const senderTrackIds = new Set(
        pc.getSenders().map((s) => s.track?.id).filter(Boolean)
      );
      stream.getTracks().forEach((track) => {
        if (!senderTrackIds.has(track.id)) {
          pc.addTrack(track, stream);
          senderTrackIds.add(track.id);
        }
      });
    };

    const onMatchFound = async ({ roomId: rId, role, remoteUserId: remoteId, icebreaker: prompt, icebreakerQuestion: question, callMode: remoteCallMode, isWildcard: wildcardFlag }) => {
      console.log('[MatchFound] Match event received!', { rId, role, remoteId });
      if (peerConnectionRef.current) endCallLocally(false);
      roomIdRef.current = rId;

      setMatchedCallMode(remoteCallMode || 'video');
      setIcebreakerQuestion(question || null);
      setLocalVote(null);
      setRemoteVote(null);
      setShowIcebreakerGame(!!question);

      // IMMEDIATE SAFETY BLUR
      setInCall(true);
      setIsBlurred(true);
      setSafetyBlurTimer(3);

      setShowConnectRequest(false);
      setConnectionStatus(null);
      setChatMessages([]);
      setHasNewMessage(false);
      setIsMatching(false);
      setIcebreaker(prompt);
      setIsWildcard(wildcardFlag);
      setCuriosityBlurTimer(0);
      if (navigator.vibrate) navigator.vibrate(100);

      const pc = createPeerConnection(rId); peerConnectionRef.current = pc;
      iceQueue.current = []; // Reset queue for new match

      const stream = (await waitForLocalStream()) || localStreamRef.current;
      if (!stream) {
        console.error('[WebRTC] No local camera/microphone — cannot start call');
        return;
      }

      // Caller: attach local A/V then offer after a short buffer to ensure receiver is in room.
      if (role === 'caller') {
        setTimeout(async () => {
          if (!peerConnectionRef.current) return;
          attachLocalTracks(peerConnectionRef.current, stream);
          const offer = await peerConnectionRef.current.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await peerConnectionRef.current.setLocalDescription(offer);
          socket.emit('webrtc-offer', { offer: peerConnectionRef.current.localDescription, roomId: rId });
          console.log('[WebRTC] Offer sent to room:', rId);
        }, 500);
      }

      apiFetch(`${API_URL}/api/users/${remoteId}`).then(res => {
        if (res.status === 401) throw new Error("Unauthorized");
        return res.json();
      }).then(data => {
        setRemoteUser(data);
        if (user?.interests && data?.interests) setCommonInterests(user.interests.filter(i => data.interests.includes(i)));
      }).catch((err) => {
        console.warn("User fetch failed or unauthorized:", err);
      });
    };

    const onOffer = async ({ offer }) => {
      console.log('[WebRTC] Offer received from peer');
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.warn('[WebRTC] Offer received but PeerConnection not ready. Queueing...');
        // We'll wait a bit and try again
        setTimeout(() => onOffer({ offer }), 1000);
        return;
      }
      try {
        const stream = (await waitForLocalStream()) || localStreamRef.current;
        if (!stream) {
          console.error('[WebRTC] Receiver has no local media — cannot answer');
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        attachLocalTracks(pc, stream);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', { answer: pc.localDescription, roomId: roomIdRef.current });
        console.log('[WebRTC] Answer sent to peer');

        while (iceQueue.current.length > 0) {
          const candidate = iceQueue.current.shift();
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((e) => console.error('ICE Queue error:', e));
        }
      } catch (err) {
        console.error('Failed to handle offer', err);
      }
    };

    const onAnswer = async ({ answer }) => {
      console.log('[WebRTC] Answer received from peer');
      const pc = peerConnectionRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[WebRTC] Remote description set (Answer)');
        // Process queued ICE candidates
        while (iceQueue.current.length > 0) {
          const candidate = iceQueue.current.shift();
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("ICE Queue error:", e));
        }
      } catch (err) {
        console.error("Failed to handle answer", err);
      }
    };

    const onIceCandidate = async ({ candidate }) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => { });
      } else {
        iceQueue.current.push(candidate);
      }
    };

    const onChatMessage = (msg) => {
      const currentUserId = user?.id || user?._id;
      if (msg.sender?.toString() === currentUserId?.toString()) {
        return;
      }
      setChatMessages(prev => [...prev, { ...msg, type: "remote" }]);
      if (!showChatRef.current) setHasNewMessage(true);
      setIsPeerTyping(false);
    };
    const onPeerTyping = () => setIsPeerTyping(true);
    const onPeerStopTyping = () => setIsPeerTyping(false);
    const onPeerWantsConnection = () => {
      if (connectionStatusRef.current !== 'sent' && connectionStatusRef.current !== 'accepted') {
        setShowConnectRequest(true);
        setConnectionStatus("received");
      }
    };
    const onConnectionEstablished = () => {
      setConnectionStatus("accepted");
      setShowConnectRequest(false); // Close any open request overlay
      setCuriosityBlurTimer(0);
      setShowMatchSuccess(true);
      setTimeout(() => setShowMatchSuccess(false), 3000);
    };
    const onMatchEnded = () => {
      setChatMessages(prev => [...prev, {
        id: `sys_${Date.now()}`,
        text: "The call has ended.",
        type: "system",
        createdAt: new Date().toISOString()
      }]);
      // endCallLocally(true); // Don't wipe immediately, let them see the message if chat is open
      // Actually, we need to end the WebRTC call
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      setInCall(false);
      setRemoteUser(null);
    };

    const onPeerDeclined = () => {
      setConnectionStatus("declined");
      setDeclineTimer(120);
      if (declineIntervalRef.current) clearInterval(declineIntervalRef.current);
      declineIntervalRef.current = setInterval(() => {
        setDeclineTimer(prev => {
          if (prev <= 1) {
            clearInterval(declineIntervalRef.current);
            setConnectionStatus(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const onPeerDisconnected = () => {
      setChatMessages(prev => [...prev, {
        id: `sys_${Date.now()}`,
        text: "The other user has disconnected.",
        type: "system",
        createdAt: new Date().toISOString()
      }]);
    };

    const onPeerIcebreakerVote = ({ option }) => {
      setRemoteVote(option);
    };

    socket.on("match-found", onMatchFound);
    socket.on("chat-message", onChatMessage);
    socket.on("typing", onPeerTyping);
    socket.on("stop-typing", onPeerStopTyping);
    socket.on("peer-wants-connection", onPeerWantsConnection);
    socket.on("connection-established", onConnectionEstablished);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice-candidate", onIceCandidate);
    socket.on("match-ended", onMatchEnded);
    socket.on("peer-declined-connection", onPeerDeclined);
    socket.on("peer-disconnected", onPeerDisconnected);
    socket.on("peer-icebreaker-vote", onPeerIcebreakerVote);

    return () => {
      socket.off("match-found", onMatchFound);
      socket.off("chat-message", onChatMessage);
      socket.off("typing", onPeerTyping);
      socket.off("stop-typing", onPeerStopTyping);
      socket.off("peer-wants-connection", onPeerWantsConnection);
      socket.off("connection-established", onConnectionEstablished);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice-candidate", onIceCandidate);
      socket.off("match-ended", onMatchEnded);
      socket.off("peer-declined-connection", onPeerDeclined);
      socket.off("peer-disconnected", onPeerDisconnected);
      socket.off("peer-icebreaker-vote", onPeerIcebreakerVote);
    };
  }, [socket, createPeerConnection, endCallLocally, user]);

  // ── Actions ──
  const skipMatch = () => { if (navigator.vibrate) navigator.vibrate(50); endCallLocally(true); };
  const connectUser = () => { if (socket && roomIdRef.current && user) { socket.emit("action-connect", { roomId: roomIdRef.current, userId: user.id }); setConnectionStatus("sent"); } };
  const acceptConnection = () => { if (socket && roomIdRef.current && user) { socket.emit("action-connect", { roomId: roomIdRef.current, userId: user.id }); setShowConnectRequest(false); setConnectionStatus("accepted"); } };
  const declineConnection = () => { if (socket && roomIdRef.current) { socket.emit("action-decline", { roomId: roomIdRef.current }); setShowConnectRequest(false); setConnectionStatus(null); } };
  const toggleMic = () => { if (localStreamRef.current) { const t = localStreamRef.current.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; setMicEnabled(t.enabled); } } };
  const toggleCamera = () => { if (localStreamRef.current) { const t = localStreamRef.current.getVideoTracks()[0]; if (t) { t.enabled = !t.enabled; setCameraEnabled(t.enabled); } } };
  const toggleChat = () => { setShowChat(p => !p); setHasNewMessage(false); };

  const handleIcebreakerVote = (option) => {
    setLocalVote(option);
    if (socket && roomIdRef.current) {
      socket.emit("icebreaker-vote", { roomId: roomIdRef.current, option });
    }
  };

  const reportUser = useCallback(async () => {
    if (!roomIdRef.current || !remoteUser) return;
    alert("User reported. The call has been ended for your safety.");
    skipMatch();
    try {
      const token = localStorage.getItem("token");
      const reportedUserId = remoteUser._id || remoteUser.id;
      apiFetch(`${API_URL}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ reportedUserId, reason: `LIVE_REPORT: Room ${roomIdRef.current}`, roomId: roomIdRef.current }),
      });
      apiFetch(`${API_URL}/api/users/block/${reportedUserId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Failed to log report/block", error);
    }
  }, [remoteUser, skipMatch]);

  const isVideoRoute = location.pathname === '/video';
  const isPiP = !isVideoRoute && (inCall || isMatching);
  const isHidden = !isVideoRoute && !inCall && !isMatching;

  if (isHidden) return null;

  return (
    <div className={`bg-[#0B0E14] overflow-hidden transition-all duration-500 z-40 overflow-x-hidden overflow-y-hidden   ${isVideoRoute ? "absolute inset-0 h-screen flex flex-col pb-[84px] md:pb-0" : "fixed bottom-24 right-4 w-48 h-72 sm:w-64 sm:h-96 shadow-2xl rounded-2xl z-[100] ring-4 ring-purple-500/50"}`} onClick={isPiP ? () => navigate('/video') : undefined}>
      {isPiP ? (
        <div className="relative w-full h-full">
          <video ref={remoteVideoRef} autoPlay playsInline style={{ filter: (isBlurred || peerIsPrivate) ? "blur(60px)" : "none" }} className="w-full h-full object-cover rounded-2xl" />
          <div className="absolute bottom-2 right-2 w-12 h-16 rounded-xl overflow-hidden border-2 border-white/20">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          </div>
        </div>
      ) : (
        <>
          <div className="sticky top-0 left-0 right-0 h-16 shrink-0 flex items-center justify-between px-6 border-b border-[#1e293b] bg-[#0B0E14]">
            <div className="flex items-center gap-4">
              <img src={ontloLogo} alt="Ontlo" className="w-12 h-12 sm:block md:hidden" />
              {/* <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${isConnected ? 'bg-purple-500/10 text-green-400 border-purple-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse'}`}>
                <div className={`w-1 h-1 rounded-full ${isConnected ? 'bg-green-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-orange-400'}`}></div>
                <span>{isConnected ? 'LIVE' : 'CONNECTING...'}</span>
              </div> */}
            </div>

            <div className="flex items-center gap-3">
              {inCall && (
                <>
                  <button onClick={reportUser} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#151923] border border-[#1e293b] rounded-xl text-xs font-bold text-gray-300 hover:text-white transition">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Report
                  </button>
                  <button onClick={() => endCallLocally(false)} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition">
                    <PhoneOff className="w-4 h-4" /> Leave
                  </button>
                </>
              )}
              <button onClick={() => setShowSettings(true)} className="w-10 h-10 flex items-center justify-center bg-[#151923] border border-[#1e293b] rounded-xl text-gray-400 hover:text-white transition" title="Preferences">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative flex flex-1 overflow-hidden  gap-4 bg-[#05070A]">
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#05070A]">
              {showMatchSuccess && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/75 backdrop-blur-xl animate-in fade-in duration-500">
                  {/* Decorative floating particles */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute bg-pink-500/20 rounded-full animate-pulse"
                        style={{
                          width: `${Math.random() * 40 + 20}px`,
                          height: `${Math.random() * 40 + 20}px`,
                          top: `${Math.random() * 100}%`,
                          left: `${Math.random() * 100}%`,
                          animationDuration: `${Math.random() * 4 + 2}s`
                        }}
                      />
                    ))}
                  </div>

                  <div className="relative bg-[#11141D]/90 border border-purple-500/40 p-8 rounded-[40px] shadow-[0_0_100px_rgba(168,85,247,0.4)] text-center max-w-sm w-full animate-in zoom-in-95 duration-500">
                    <div className="relative flex items-center justify-center gap-6 mb-8">
                      {/* Avatar Current User */}
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-500 animate-in slide-in-from-left duration-700 shadow-xl">
                        <img src={user?.profilePic || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                      </div>

                      {/* Connected Glowing Thread */}
                      <div className="w-12 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 relative flex items-center justify-center">
                        <Heart className="w-5 h-5 text-pink-500 fill-pink-500 absolute scale-110 animate-bounce" />
                      </div>

                      {/* Avatar Remote User */}
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-pink-500 animate-in slide-in-from-right duration-700 shadow-xl">
                        <img src={remoteUser?.profilePic || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                      </div>
                    </div>

                    <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 font-black text-3xl mb-3 tracking-tighter uppercase italic">Moments Unlocked!</h3>

                    <p className="text-gray-400 text-xs leading-relaxed mb-8 px-2">
                      You are now connected with <span className="text-white font-bold">{remoteUser?.fullName || 'this user'}</span>. You can now view their private moments, like and comment on their feed, and send them direct messages.
                    </p>

                    <button
                      onClick={() => setShowMatchSuccess(false)}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl text-white font-black text-xs uppercase tracking-widest hover:scale-[1.03] active:scale-[0.97] transition-all shadow-lg"
                    >
                      Awesome!
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 relative flex items-stretch">
                {!inCall ? (
                  <div className="absolute inset-0 bg-[#0B0E14] overflow-hidden  flex items-center justify-center">
                    <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-20" />
                    <div className="relative z-20 text-center p-6">
                      {isMatching ? (
                        <div className="flex flex-col items-center">

                          {/* LOADER */}
                          <div className="relative mb-7">
                            <div className="w-16 h-16 rounded-full border border-white/10" />

                            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/90 animate-spin" />

                            <div className="absolute inset-3 rounded-full bg-white/[0.03] backdrop-blur-xl" />
                          </div>

                          <h2 className="text-2xl text-white font-semibold tracking-tight">
                            Finding Match...
                          </h2>

                          <p className="text-white/45 text-sm mt-2">
                            Connecting anonymously
                          </p>

                          {/* CANCEL */}
                          <button
                            onClick={() => {
                              socket?.emit("leave-queue");
                              setIsMatching(false);
                            }}
                            className="
          mt-8
          px-6
          py-3
          rounded-full
          border
          border-white/10
          bg-white/[0.04]
          backdrop-blur-xl
          text-white/70
          text-sm
          font-medium
          transition-all
          duration-300
          hover:bg-white/[0.08]
          hover:text-white
        "
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          {/* Call Mode Toggles */}
                          <div className="flex items-center gap-4 p-1.5 rounded-2xl mb-8">
                            <button
                              onClick={() => setCallMode('video')}
                              className={`relative overflow-hidden px-6 py-2.5 rounded-2xl text-[11px] font-semibold uppercase tracking-[0.25em] transition-all duration-300 border backdrop-blur-xl
                                   ${callMode === 'video'
                                  ? 'bg-white text-black border-white shadow-[0_0_25px_rgba(255,255,255,0.25)] scale-105'
                                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
                                }`}
                            >
                              <span className="relative z-10 flex items-center gap-2">
                                 Video
                              </span>

                              {callMode === 'video' && (
                                <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/20 opacity-40" />
                              )}
                            </button>

                            <button
                              onClick={() => setCallMode('audio')}
                              className={`relative overflow-hidden px-6 py-2.5 rounded-2xl text-[11px] font-semibold uppercase tracking-[0.25em] transition-all duration-300 border backdrop-blur-xl
  ${callMode === 'audio'
                                  ? 'bg-white text-black border-white shadow-[0_0_25px_rgba(255,255,255,0.25)] scale-105'
                                  : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
                                }`}
                            >
                              <span className="relative z-10 flex items-center gap-2">
                                 Audio
                              </span>

                              {callMode === 'audio' && (
                                <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/20 opacity-40" />
                              )}
                            </button>
                          </div>

                          {/* BUTTON */}
                          <button
                            onClick={cameraReady || callMode === 'audio' ? startMatching : () => setCameraRequested(true)}
                            className="
          group
          relative
          overflow-hidden
          px-8
          sm:px-10
          py-3.5
          rounded-full
          border
          border-white/10
          bg-white/[0.05]
          backdrop-blur-2xl
          text-white
          text-sm
          sm:text-base
          font-medium
          transition-all
          duration-300
          hover:bg-white/[0.09]
          hover:border-white/20
          hover:scale-[1.02]
          active:scale-[0.98]
          shadow-[0_8px_30px_rgba(0,0,0,0.35)]
        "
                          >

                            {/* INNER GLOW */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent opacity-60" />

                            <span className="relative z-10 flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                              Find Match
                            </span>

                            {/* HOVER SHINE */}
                            <div className="
          absolute
          inset-0
          opacity-0
          group-hover:opacity-100
          transition-opacity
          duration-300
          bg-gradient-to-r
          from-transparent
          via-white/[0.06]
          to-transparent
        " />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 relative rounded-3xl overflow-hidden bg-[#05070A] shadow-2xl group">
                    {matchedCallMode === 'audio' ? (
                      <div className="absolute inset-0 bg-[#07090E] z-10 flex flex-col items-center justify-center">
                        {/* Wave Ring Animations */}
                        <div className="relative w-44 h-44 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 animate-pulse border border-purple-500/20" />
                          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-purple-600/10 to-pink-600/10 animate-[ping_3s_infinite] border border-pink-500/10" style={{ animationDelay: '1s' }} />
                          <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-purple-600/5 to-pink-600/5 animate-[ping_3s_infinite] border border-purple-500/5" style={{ animationDelay: '2s' }} />

                          {/* Pulsing Avatar */}
                          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-purple-500/30 z-10 bg-black flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.3)]">
                            <img
                              src={remoteUser?.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg'}
                              className="w-full h-full object-cover animate-[pulse_4s_infinite]"
                              alt="Avatar"
                            />
                          </div>
                        </div>
                        <h2 className="text-white text-xl font-black italic mt-6 tracking-tight">{remoteUser?.fullName || 'Connecting...'}</h2>
                        <p className="text-purple-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 animate-pulse">Audio Match Connected</p>
                      </div>
                    ) : (
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        style={{ filter: (isBlurred || peerIsPrivate || safetyBlurTimer > 0) ? "blur(80px) scale(1.1)" : (curiosityBlurTimer > 0) ? `blur(${curiosityBlurTimer * 2}px)` : "none" }}
                        className="absolute inset-0 w-full h-full object-cover transition-all duration-[2000ms] ease-in-out z-10"
                      />
                    )}

                    {/* Stream Watermarking overlay */}
                    <div className="absolute inset-0 pointer-events-none select-none opacity-[0.03] overflow-hidden flex flex-wrap gap-8 rotate-[-25px] scale-125 items-center justify-center z-20">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <span key={i} className="text-white text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                          @{user?.username || 'user'} • ONTLO LIVE
                        </span>
                      ))}
                    </div>

                    {/* Safety Blur UI Overlay */}
                    {safetyBlurTimer > 0 && matchedCallMode !== 'audio' && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md px-8 text-center animate-in fade-in zoom-in duration-700">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 relative">
                          <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" />
                          <Shield className="w-10 h-10 text-white relative z-10" />
                        </div>
                        <h2 className="text-white text-2xl font-black uppercase tracking-tighter mb-3 italic">Safety Verification</h2>
                        <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em] max-w-[280px] leading-relaxed mb-6">
                          Ensuring a safe environment for everyone. Full visibility will return in:
                        </p>
                        <div className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl">
                          <span className="text-white text-3xl font-black italic tracking-widest">{safetyBlurTimer}s</span>
                        </div>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-30">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5 shadow-xl">
                          <img src={remoteUser?.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg'} className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-white">{remoteUser?.fullName || 'Connecting...'}</span>
                              <Check className="w-3 h-3 text-blue-400 bg-white rounded-full p-0.5" />
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-green-500"></div>
                              <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Live</span>
                            </div>
                          </div>
                        </div>

                        {icebreaker && (
                          <div className="bg-black/30 backdrop-blur-md px-3 py-2 rounded-xl border border-purple-500/20 max-w-[220px] shadow-xl">
                            <p className="text-[9px] font-medium text-gray-100 leading-tight">💡 {icebreaker}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5 text-white shadow-xl flex flex-col items-end">
                          <div className="flex items-center gap-1.5">
                            <Timer className="w-3 h-3 text-pink-500" />
                            <span className="text-xs font-black font-mono">{Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}</span>
                          </div>
                        </div>
                        {commonInterests.length > 0 && (
                          <div className="bg-black/30 backdrop-blur-md px-2 py-1 rounded-lg border border-blue-500/20 text-[9px] text-blue-200 font-bold flex items-center gap-1">
                            <Music className="w-2.5 h-2.5" /> {commonInterests[0]}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ transform: `translate(${localVideoPos.x}px, ${localVideoPos.y}px)`, transition: isDraggingState ? 'none' : 'transform 0.3s' }} className="absolute bottom-24 right-3 w-24 h-36 sm:w-40 sm:h-56 rounded-xl overflow-hidden border border-white/20 z-40 shadow-2xl cursor-grab bg-black flex flex-col items-center justify-center p-2" onMouseDown={handleDragStart} onTouchStart={handleDragStart}>
                      {matchedCallMode === 'audio' ? (
                        <div className="text-center flex flex-col items-center justify-center">
                          <Volume2 className="w-8 h-8 text-purple-400 mb-2 animate-bounce" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-purple-500">Audio On</span>
                        </div>
                      ) : (
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                      )}
                      <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/40 rounded-md text-[8px] font-bold text-white uppercase">You</div>
                    </div>

                    {showIcebreakerGame && icebreakerQuestion && (
                      <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-[80] w-[90%] max-w-[340px] bg-black/60 backdrop-blur-xl border border-purple-500/30 p-4 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-purple-400">
                            <span className="text-[9px] font-black uppercase tracking-widest">Co-Op Icebreaker</span>
                          </div>
                          {(localVote && remoteVote) && (
                            <button
                              onClick={() => setShowIcebreakerGame(false)}
                              className="text-[9px] font-bold text-gray-500 hover:text-white"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                        <p className="text-white text-xs font-semibold leading-relaxed mb-3">{icebreakerQuestion.question}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {icebreakerQuestion.options.map((opt, idx) => {
                            const optCode = idx === 0 ? 'A' : 'B';
                            const isLocalSelect = localVote === optCode;
                            const isRemoteSelect = remoteVote === optCode;
                            const reveal = localVote && remoteVote;

                            return (
                              <button
                                key={idx}
                                disabled={!!localVote}
                                onClick={() => handleIcebreakerVote(optCode)}
                                className={`py-3.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all duration-300 border ${reveal
                                    ? (isLocalSelect && isRemoteSelect
                                      ? 'bg-purple-600 border-purple-400 text-white animate-bounce'
                                      : isLocalSelect
                                        ? 'bg-purple-950 border-purple-800 text-purple-400'
                                        : isRemoteSelect
                                          ? 'bg-white/10 border-white/20 text-white/80'
                                          : 'bg-black/40 border-white/5 text-gray-600')
                                    : isLocalSelect
                                      ? 'bg-purple-600 border-purple-400 text-white'
                                      : 'bg-black/40 border-white/5 text-gray-400 hover:text-white hover:bg-white/5'
                                  }`}
                              >
                                <div>{opt}</div>
                                {reveal && (
                                  <div className="text-[7px] text-white/50 mt-1">
                                    {isLocalSelect && "You"} {isRemoteSelect && "Peer"}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {localVote && !remoteVote && (
                          <p className="text-[8px] text-gray-500 text-center mt-2 font-bold uppercase tracking-wider animate-pulse">Waiting for peer...</p>
                        )}
                        {localVote && remoteVote && (
                          <p className="text-[9px] text-center mt-2 font-black uppercase tracking-widest text-purple-400">
                            {localVote === remoteVote ? "🎉 100% Match!" : "☯️ Opposites Attract!"}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="absolute bottom-4 left-3 right-3 flex items-center justify-between z-50">
                      <div className="flex gap-2">
                        <button onClick={toggleMic} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${micEnabled ? "bg-black/40 backdrop-blur-md border border-white/10 text-white" : "bg-red-500 text-white"}`}><Mic className="w-4 h-4" /></button>
                        <button onClick={toggleCamera} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${cameraEnabled ? "bg-black/40 backdrop-blur-md border border-white/10 text-white" : "bg-red-500 text-white"}`}><Camera className="w-4 h-4" /></button>
                      </div>
                      <div className="flex gap-2">
                        {(connectionStatus !== 'accepted' || isAlreadyMatched) && (
                          <button
                            onClick={isAlreadyMatched || connectionStatus === 'declined' ? null : (callDuration >= 10 ? connectUser : null)}
                            disabled={(!isAlreadyMatched && callDuration < 10) || connectionStatus === 'declined'}
                            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isAlreadyMatched
                              ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                              : connectionStatus === 'declined'
                                ? 'bg-gray-800 text-gray-500 border border-white/5 cursor-not-allowed'
                                : callDuration < 10
                                  ? 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed'
                                  : 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-lg hover:scale-110 active:scale-95'
                              }`}
                          >
                            {isAlreadyMatched ? (
                              <Check className="w-5 h-5" />
                            ) : connectionStatus === 'declined' ? (
                              <div className="flex flex-col items-center">
                                <Timer className="w-3.5 h-3.5 mb-0.5" />
                                <span className="text-[7px] font-black">{Math.floor(declineTimer / 60)}:{(declineTimer % 60).toString().padStart(2, '0')}</span>
                              </div>
                            ) : callDuration < 10 ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span className="absolute -bottom-1 -right-1 bg-black text-[7px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white/10">
                                  {10 - callDuration}
                                </span>
                              </>
                            ) : (
                              <Heart className={`w-4 h-4 ${connectionStatus === 'sent' ? 'animate-pulse' : ''}`} />
                            )}
                          </button>
                        )}
                        <button onClick={skipMatch} className="bg-white text-black px-6 h-10 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"><span>Next</span> <RefreshCw className="w-3 h-3" /></button>
                        <button onClick={toggleChat} className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${showChat ? 'bg-purple-600 text-white' : 'bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/10'}`}>
                          <MessageSquare className="w-4 h-4" />
                          {isPeerTyping && !showChat && (
                            <div className="absolute -top-1 -left-1 flex gap-0.5 bg-purple-500 px-1.5 py-1 rounded-full border border-[#0B0E14] animate-in zoom-in duration-300">
                              <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          )}
                          {hasNewMessage && !showChat && !isPeerTyping && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0B0E14] animate-bounce shadow-[0_0_10px_rgba(239,68,68,0.5)] flex items-center justify-center">
                              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {showConnectRequest && (
                      <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-[#151923]/95 backdrop-blur-xl border border-purple-500/40 p-8 rounded-[40px] shadow-2xl text-center max-w-sm">
                          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl mx-auto mb-6"><Heart className="w-10 h-10 text-white fill-current animate-pulse" /></div>
                          <h3 className="text-white font-black text-2xl mb-2 italic">Connect?</h3>
                          <p className="text-gray-400 text-sm mb-8">Keep the conversation going after the call.</p>
                          <div className="flex gap-3"><button onClick={acceptConnection} className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl text-white font-black text-sm">Accept</button><button onClick={declineConnection} className="flex-1 py-4 bg-white/5 rounded-2xl text-gray-400 font-bold text-sm">Decline</button></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={`absolute top-0 bottom-0 right-0 z-[110] transition-all duration-500 overflow-hidden bg-[#0B0E14] border-l border-[#1e293b] flex flex-col ${showChat ? 'w-full sm:w-[380px] translate-x-0' : 'w-0 translate-x-full'}`}>
                <div className="flex-1 overflow-hidden relative flex flex-col">
                  <div className="flex-1 overflow-hidden relative bg-[#0B0E14]">
                    <ChatPanel onClose={toggleChat} remoteUser={remoteUser} roomId={roomIdRef.current} persistedMessages={chatMessages} onSendMessage={(msg) => setChatMessages(prev => [...prev, msg])} />
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
            if (typeof setUser === 'function') setUser({ ...user, matchPreferences: newPrefs });
          }}
        />
      )}

      <UnmountCleanup socket={socket} endCallLocally={endCallLocally} roomIdRef={roomIdRef} rejoinTimerRef={rejoinTimerRef} declineIntervalRef={declineIntervalRef} />
    </div>
  );
};

const UnmountCleanup = ({ socket, endCallLocally, roomIdRef, rejoinTimerRef, declineIntervalRef }) => {
  useEffect(() => {
    return () => {
      if (rejoinTimerRef.current) clearTimeout(rejoinTimerRef.current);
      if (declineIntervalRef.current) clearInterval(declineIntervalRef.current);
      if (socket) {
        socket.emit("leave-queue");
        if (roomIdRef.current) socket.emit("leave-chat", { roomId: roomIdRef.current });
      }
      endCallLocally(false);
    };
  }, [socket, endCallLocally, roomIdRef, rejoinTimerRef]);
  return null;
};

export default VideoContainer;
