import { AlertTriangle, Camera, Check, Heart, Lock, MapPin, Maximize2, Mic, MoreVertical, Music, PhoneOff, RefreshCw, Settings, Shield, Timer, User, Video, X, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import API_URL, { apiFetch } from "../../utils/api";
import ChatPanel from "../chat/ChatPanel";
import MatchSettingsModal from "./MatchSettingsModal";

const VideoContainer = () => {
  const { socket, user, setUser } = useSocket();
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
  const [isBlurred, setIsBlurred] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [peerIsPrivate, setPeerIsPrivate] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showConnectRequest, setShowConnectRequest] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [showConnectButton, setShowConnectButton] = useState(false);
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
  const [localVideoPos, setLocalVideoPos] = useState({ x: 0, y: 0 });
  const [isDraggingState, setIsDraggingState] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [matchPreferences, setMatchPreferences] = useState(user?.matchPreferences || {
    gender: 'All',
    ageRange: { min: 18, max: 100 },
    region: 'Global',
    interests: []
  });

  // ── Camera Initialization ──
  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      if (!cameraRequested && !inCall && !isMatching) return;
      try {
        const constraints = {
          audio: true,
          video: user?.lowBandwidth 
            ? { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { max: 15 } }
            : { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 24 } }
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
  }, [user?.lowBandwidth, cameraRequested, inCall, isMatching]);

  // ── Call Timers ──
  useEffect(() => {
    let interval;
    let connectTimer = 0;
    if (inCall) {
      interval = setInterval(() => {
        connectTimer += 1;
        setCallDuration(prev => prev + 1);
        if (connectTimer === 10 && !showConnectButton) setShowConnectButton(true);
        setSafetyBlurTimer(prev => {
          if (prev === 1) setIsBlurred(false);
          return prev > 0 ? prev - 1 : 0;
        });
        setCuriosityBlurTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [inCall, showConnectButton]);

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
    setChatMessages([]); setHasNewMessage(false); setIsMatching(false); setShowConnectButton(false);
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
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
      ],
      iceCandidatePoolSize: 10,
    });
    pc.onicecandidate = (e) => { if (e.candidate && roomIdRef.current && socket) socket.emit("webrtc-ice-candidate", { candidate: e.candidate, roomId: roomIdRef.current }); };
    pc.ontrack = (e) => { if (remoteVideoRef.current && e.streams[0]) remoteVideoRef.current.srcObject = e.streams[0]; };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          const params = videoSender.getParameters();
          if (!params.encodings) params.encodings = [{}];
          params.encodings[0].maxBitrate = user?.lowBandwidth ? 250000 : 750000;
          videoSender.setParameters(params).catch(() => {});
        }
      }
      if (pc.connectionState === "failed") endCallLocally(true);
    };
    return pc;
  }, [socket, endCallLocally, user?.lowBandwidth]);

  // ── Socket Event Listeners ──
  useEffect(() => {
    if (!socket) return;
    const onMatchFound = async ({ roomId: rId, role, remoteUserId: remoteId, icebreaker: prompt, isWildcard: wildcardFlag }) => {
      if (peerConnectionRef.current) endCallLocally(false);
      roomIdRef.current = rId; setInCall(true); setIsBlurred(true); setSafetyBlurTimer(3);
      setShowConnectRequest(false); setConnectionStatus(null); setChatMessages([]); setHasNewMessage(false);
      setIsMatching(false); setIcebreaker(prompt); setIsWildcard(wildcardFlag); setCuriosityBlurTimer(30);
      if (navigator.vibrate) navigator.vibrate(100);
      const pc = createPeerConnection(rId); peerConnectionRef.current = pc;
      const stream = localStreamRef.current;
      if (stream) stream.getTracks().forEach(track => pc.addTrack(track, stream));
      if (role === "caller") {
        const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
        socket.emit("webrtc-offer", { offer, roomId: rId });
      }
      apiFetch(`${API_URL}/api/users/${remoteId}`).then(res => res.json()).then(data => {
        setRemoteUser(data);
        if (user?.interests && data?.interests) setCommonInterests(user.interests.filter(i => data.interests.includes(i)));
      }).catch(() => {});
    };
    const onChatMessage = (msg) => { setChatMessages(prev => [...prev, { ...msg, type: "remote" }]); setHasNewMessage(true); };
    const onPeerWantsConnection = () => { setShowConnectRequest(true); setConnectionStatus("received"); };
    const onConnectionEstablished = () => { setConnectionStatus("accepted"); setCuriosityBlurTimer(0); setShowMatchSuccess(true); setTimeout(() => setShowMatchSuccess(false), 3000); };
    const onOffer = async ({ offer }) => {
      const pc = peerConnectionRef.current; if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { answer, roomId: roomIdRef.current });
    };
    const onAnswer = async ({ answer }) => { if (peerConnectionRef.current) await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer)); };
    const onIceCandidate = async ({ candidate }) => { if (peerConnectionRef.current) await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {}); };
    const onMatchEnded = () => endCallLocally(true);
    const onPeerDisconnected = () => console.log("Peer disconnected...");

    socket.on("match-found", onMatchFound); socket.on("chat-message", onChatMessage);
    socket.on("peer-wants-connection", onPeerWantsConnection); socket.on("connection-established", onConnectionEstablished);
    socket.on("webrtc-offer", onOffer); socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice-candidate", onIceCandidate); socket.on("match-ended", onMatchEnded);
    socket.on("peer-disconnected", onPeerDisconnected);
    return () => {
      socket.off("match-found", onMatchFound); socket.off("chat-message", onChatMessage);
      socket.off("peer-wants-connection", onPeerWantsConnection); socket.off("connection-established", onConnectionEstablished);
      socket.off("webrtc-offer", onOffer); socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice-candidate", onIceCandidate); socket.off("match-ended", onMatchEnded);
      socket.off("peer-disconnected", onPeerDisconnected);
    };
  }, [socket, createPeerConnection, endCallLocally, user]);

  // ── Actions ──
  const startMatching = () => { if (socket && cameraReady) { setIsMatching(true); socket.emit("join-queue", { userId: user?.id }); } };
  const skipMatch = () => { if (navigator.vibrate) navigator.vibrate(50); endCallLocally(true); };
  const connectUser = () => { if (socket && roomIdRef.current && user) { socket.emit("action-connect", { roomId: roomIdRef.current, userId: user.id }); setConnectionStatus("sent"); } };
  const acceptConnection = () => { if (socket && roomIdRef.current && user) { socket.emit("action-connect", { roomId: roomIdRef.current, userId: user.id }); setShowConnectRequest(false); setConnectionStatus("accepted"); } };
  const toggleMic = () => { if (localStreamRef.current) { const t = localStreamRef.current.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; setMicEnabled(t.enabled); } } };
  const toggleCamera = () => { if (localStreamRef.current) { const t = localStreamRef.current.getVideoTracks()[0]; if (t) { t.enabled = !t.enabled; setCameraEnabled(t.enabled); } } };
  const toggleChat = () => { setShowChat(p => !p); setHasNewMessage(false); };

  const isVideoRoute = location.pathname === '/video';
  const isPiP = !isVideoRoute && (inCall || isMatching);
  const isHidden = !isVideoRoute && !inCall && !isMatching;

  if (isHidden) return null;

  return (
    <div className={`bg-[#0B0E14] overflow-hidden transition-all duration-500 z-40 ${isVideoRoute ? "absolute inset-0 h-screen" : "fixed bottom-24 right-4 w-48 h-72 sm:w-64 sm:h-96 shadow-2xl rounded-2xl z-[100] ring-4 ring-purple-500/50"}`} onClick={isPiP ? () => navigate('/video') : undefined}>
      {isPiP ? (
        <div className="relative w-full h-full">
          <video ref={remoteVideoRef} autoPlay playsInline style={{ filter: (isBlurred || peerIsPrivate) ? "blur(60px)" : "none" }} className="w-full h-full object-cover rounded-2xl" />
          <div className="absolute bottom-2 right-2 w-12 h-16 rounded-xl overflow-hidden border-2 border-white/20">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          </div>
        </div>
      ) : (
        <>
          <div className="h-16 flex items-center justify-between px-6 border-b border-[#1e293b] bg-[#0B0E14]">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-white uppercase italic tracking-tighter">Ontlo Live</h1>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold border border-green-500/20">
                <Shield className="w-3 h-3" /> Secure
              </div>
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

          <div className="flex flex-1 overflow-hidden p-2 sm:p-4 gap-4 bg-[#05070A] h-[calc(100vh-64px)]">
            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#05070A] rounded-[32px]">
              {showMatchSuccess && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none animate-in zoom-in-50 duration-500">
                  <div className="bg-gradient-to-br from-purple-600/95 via-pink-600/95 to-orange-500/95 backdrop-blur-2xl px-12 py-8 rounded-[40px] border border-white/30 shadow-[0_0_150px_rgba(168,85,247,0.6)] flex flex-col items-center">
                    <h2 className="text-white text-5xl font-black uppercase tracking-[0.2em]">Match!</h2>
                  </div>
                </div>
              )}

              <div className="flex-1 relative flex items-stretch">
                {!inCall ? (
                  <div className="absolute inset-0 bg-[#0B0E14] rounded-3xl overflow-hidden border border-[#1e293b] flex items-center justify-center">
                    <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1] opacity-20" />
                    <div className="relative z-20 text-center p-6">
                      {isMatching ? (
                        <div className="flex flex-col items-center animate-pulse">
                          <div className="w-20 h-20 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-8" />
                          <h2 className="text-2xl text-white font-black uppercase italic tracking-tighter">Finding Match...</h2>
                          <button onClick={() => { socket?.emit("leave-queue"); setIsMatching(false); }} className="mt-8 px-8 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-2xl text-xs font-bold uppercase tracking-widest">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <h2 className="text-4xl text-white font-black uppercase italic tracking-tighter mb-4">Ready to meet?</h2>
                          <button onClick={cameraReady ? startMatching : () => setCameraRequested(true)} className="px-12 py-5 bg-white text-black font-black rounded-3xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Start Matching</button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 relative rounded-3xl overflow-hidden bg-black shadow-2xl">
                    <video ref={remoteVideoRef} autoPlay playsInline style={{ filter: (isBlurred || peerIsPrivate) ? "blur(60px) scale(1.1)" : (curiosityBlurTimer > 0) ? `blur(${curiosityBlurTimer * 2}px)` : "none" }} className="absolute inset-0 w-full h-full object-cover transition-all duration-700 z-10" />
                    
                    <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-30">
                       <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl">
                             <img src={remoteUser?.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg'} className="w-10 h-10 rounded-full border border-white/20 object-cover" />
                             <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                   <span className="text-sm font-bold text-white">{remoteUser?.fullName || 'Connecting...'}</span>
                                   <Check className="w-3.5 h-3.5 text-blue-400 bg-white rounded-full p-0.5" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                                   <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">Live Now</span>
                                </div>
                             </div>
                          </div>

                          {icebreaker && (
                             <div className="bg-black/40 backdrop-blur-xl px-4 py-3 rounded-2xl border border-purple-500/30 max-w-[280px] shadow-2xl animate-in slide-in-from-left duration-500">
                                <div className="flex items-start gap-3">
                                   <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                      <span className="text-sm">💡</span>
                                   </div>
                                   <p className="text-[11px] font-medium text-gray-100 leading-relaxed">{icebreaker}</p>
                                </div>
                             </div>
                          )}
                       </div>

                       <div className="flex flex-col items-end gap-2">
                          <div className="bg-black/40 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 text-white shadow-2xl flex flex-col items-end">
                             <div className="flex items-center gap-2">
                                <Timer className="w-3.5 h-3.5 text-pink-500" />
                                <span className="text-sm font-black font-mono">{Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}</span>
                             </div>
                             <span className="text-[8px] text-gray-400 font-black uppercase tracking-tighter mt-1">Encrypted Call</span>
                          </div>
                          {commonInterests.length > 0 && (
                             <div className="bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-blue-500/30 text-[10px] text-blue-200 font-bold flex items-center gap-1.5">
                                <Music className="w-3 h-3" /> {commonInterests[0]}
                             </div>
                          )}
                       </div>
                    </div>

                    <div style={{ transform: `translate(${localVideoPos.x}px, ${localVideoPos.y}px)`, transition: isDraggingState ? 'none' : 'transform 0.3s' }} className="absolute bottom-28 right-4 w-28 h-40 sm:w-48 sm:h-64 rounded-2xl overflow-hidden border-2 border-white/20 z-40 shadow-2xl cursor-grab" onMouseDown={handleDragStart} onTouchStart={handleDragStart}>
                       <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                       <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/40 rounded-lg text-[10px] font-bold text-white">You</div>
                    </div>

                    <div className="absolute bottom-6 left-4 right-4 flex items-center justify-between z-50">
                       <div className="flex gap-3">
                          <button onClick={toggleMic} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${micEnabled ? "bg-white/10 backdrop-blur-xl border border-white/10 text-white" : "bg-red-500 text-white"}`}><Mic className="w-5 h-5" /></button>
                          <button onClick={toggleCamera} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${cameraEnabled ? "bg-white/10 backdrop-blur-xl border border-white/10 text-white" : "bg-red-500 text-white"}`}><Camera className="w-5 h-5" /></button>
                       </div>
                       <div className="flex gap-3">
                          {showConnectButton && connectionStatus !== 'accepted' && (
                            <button onClick={connectUser} className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-gradient-to-r from-purple-600 to-pink-600 text-white`}>{connectionStatus === 'sent' ? 'Waiting...' : 'Connect'}</button>
                          )}
                          <button onClick={skipMatch} className="bg-white text-black px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl">Next Match</button>
                          <button onClick={toggleChat} className={`w-12 h-12 rounded-2xl flex items-center justify-center ${showChat ? 'bg-purple-600 text-white' : 'bg-white/10 backdrop-blur-xl border border-white/10 text-white'}`}><MessageSquare className="w-5 h-5" /></button>
                       </div>
                    </div>

                    {showConnectRequest && (
                      <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                         <div className="bg-[#151923]/95 backdrop-blur-xl border border-purple-500/40 p-8 rounded-[40px] shadow-2xl text-center max-w-sm">
                           <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl mx-auto mb-6"><Heart className="w-10 h-10 text-white fill-current animate-pulse" /></div>
                           <h3 className="text-white font-black text-2xl mb-2 italic">Connect?</h3>
                           <p className="text-gray-400 text-sm mb-8">Keep the conversation going after the call.</p>
                           <div className="flex gap-3"><button onClick={acceptConnection} className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl text-white font-black text-sm">Accept</button><button onClick={() => setShowConnectRequest(false)} className="flex-1 py-4 bg-white/5 rounded-2xl text-gray-400 font-bold text-sm">Dismiss</button></div>
                         </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={`fixed inset-y-0 right-0 z-[110] transition-all duration-500 overflow-hidden bg-[#0B0E14] border-l border-[#1e293b] flex flex-col ${showChat ? 'w-full sm:w-[380px] translate-x-0' : 'w-0 translate-x-full'}`}>
                <div className="h-20 flex items-center justify-between px-6 border-b border-[#1e293b] shrink-0">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    <h2 className="text-base font-black text-white uppercase tracking-tighter">Live Chat</h2>
                  </div>
                  <button onClick={toggleChat} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-gray-500"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-hidden relative flex flex-col p-4">
                  <div className="flex-1 overflow-hidden rounded-3xl relative bg-[#05070A] border border-[#1e293b]">
                    <ChatPanel onClose={() => { }} remoteUser={remoteUser} roomId={roomIdRef.current} persistedMessages={chatMessages} onSendMessage={(msg) => setChatMessages(prev => [...prev, msg])} />
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

      <UnmountCleanup socket={socket} endCallLocally={endCallLocally} roomIdRef={roomIdRef} rejoinTimerRef={rejoinTimerRef} />
    </div>
  );
};

const UnmountCleanup = ({ socket, endCallLocally, roomIdRef, rejoinTimerRef }) => {
  useEffect(() => {
    return () => {
      if (rejoinTimerRef.current) clearTimeout(rejoinTimerRef.current);
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
