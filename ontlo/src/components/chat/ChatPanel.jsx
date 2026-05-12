import { Check, CheckCheck, ChevronLeft, Loader2, MessageSquare, MoreHorizontal, Plus, Send, ShieldAlert, Smile, User, Users, UserX, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../../context/SocketContext";
import API_URL, { apiFetch } from "../../utils/api";
import ProfileModal from "../profile/ProfileModal";

const ICEBREAKERS = [
  "What's your favorite way to spend a weekend?",
  "If you could travel anywhere right now, where would you go?",
  "What's a movie or show you could watch over and over?",
  "What's the best piece of advice you've ever received?",
  "If you could have any superpower, what would it be?",
  "What's a hobby you've always wanted to try?",
  "What's your go-to comfort food?"
];

const ChatPanel = ({ onClose, connectionId, remoteUser, roomId, persistedMessages, onSendMessage, isStandaloneChat }) => {
  const { socket, user, isConnected, messageCacheRef, updateConnectionFromMessage } = useSocket();
  const [internalMessages, setInternalMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const unreadMessageRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [icebreaker] = useState(() => ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)]);


  // Mount guard — prevents any state update after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    
    // Hide bottom nav on mobile when chat is open, except in video mode
    if (window.innerWidth < 768 && window.location.pathname !== '/video') {
      document.body.classList.add('hide-bottom-nav');
    }

    return () => {
      mountedRef.current = false;
      document.body.classList.remove('hide-bottom-nav');
      // Clear any pending typing timeout on unmount
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const effectiveRoomId = roomId || connectionId;
  const cacheKey = connectionId || roomId;

  // Use persisted messages (from parent/video mode) or internal messages (standalone mode)
  const messages = persistedMessages ?? internalMessages;

  // Persist parent-provided chat data into the shared cache.
  useEffect(() => {
    if (!cacheKey || !persistedMessages) return;
    messageCacheRef?.current?.set(cacheKey, persistedMessages);
  }, [cacheKey, persistedMessages]);

  // ── Fetch message history (standalone / Messages page mode only) ──────────
  useEffect(() => {
    if (!connectionId) return;

    const cachedMessages = cacheKey ? messageCacheRef?.current?.get(cacheKey) : null;
    if (cachedMessages) {
      setInternalMessages(cachedMessages);
    } else {
      setInternalMessages([]);
    }

    // Use AbortController so the fetch is cancelled if the component unmounts
    const controller = new AbortController();

    const fetchHistory = async () => {
      if (!mountedRef.current) return;
      if (!cachedMessages) setIsLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const [response, readRes] = await Promise.all([
          apiFetch(`${API_URL}/api/messages/${connectionId}?limit=50`, {
            headers,
            signal: controller.signal,
          }),
          apiFetch(`${API_URL}/api/messages/${connectionId}/read`, {
            method: "POST",
            headers,
            signal: controller.signal,
          }),
        ]);
        const data = await response.json();
        if (!mountedRef.current) return;
        if (response.ok) {
          setInternalMessages(data);
          if (cacheKey) messageCacheRef?.current?.set(cacheKey, data);
        }
        if (!readRes.ok && mountedRef.current) {
          console.warn("Mark read failed", readRes.status);
        }
        if (!mountedRef.current) return;
        if (socket) {
          socket.emit("notification-update", { type: "read", connectionId });
          socket.emit("messages-read", { connectionId });
        }

      } catch (err) {
        if (err.name === "AbortError") return; // expected on unmount
        console.error("Failed to fetch message history", err);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };

    fetchHistory();

    return () => controller.abort(); // cancel fetch on unmount or connectionId change
  }, [connectionId, socket]);

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !effectiveRoomId) return;

    socket.emit("join-room", effectiveRoomId);

    // Only register chat-message here when we are in STANDALONE mode (no parent managing messages).
    // In video mode, persistedMessages is provided and VideoContainer handles the socket event.
    const handleMessage = persistedMessages
      ? null
      : (msg) => {
        const currentUserId = user?.id || user?._id;
        if (!mountedRef.current) return;
        if (msg.sender?.toString() === currentUserId?.toString()) {
          return;
        }

        setInternalMessages((prev) => {
          const next = [...prev, { ...msg, type: "remote" }];
          if (cacheKey) messageCacheRef?.current?.set(cacheKey, next);
          return next;
        });

        // Optimization: Mark as read immediately if chat is open
        if (connectionId) {
          const token = localStorage.getItem("token");
          apiFetch(`${API_URL}/api/messages/${connectionId}/read`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => { });
        }
      };

    // Named handlers for typing — so we can remove exactly these listeners
    const handleTyping = () => { if (mountedRef.current) setRemoteTyping(true); };
    const handleStopTyping = () => { if (mountedRef.current) setRemoteTyping(false); };
    const handleMessagesRead = ({ connectionId: readConnId, readBy }) => {
      const currentUserId = user?.id || user?._id;
      if (readConnId === effectiveRoomId && mountedRef.current && readBy && readBy.toString() !== currentUserId?.toString()) {
        setInternalMessages((prev) => {
          const next = prev.map((m) => (m.type === "self" ? { ...m, isRead: true } : m));
          if (cacheKey) messageCacheRef?.current?.set(cacheKey, next);
          return next;
        });
      }
    };

    if (handleMessage) socket.on("chat-message", handleMessage);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);
    socket.on("messages-read", handleMessagesRead);

    return () => {
      socket.emit("leave-room", effectiveRoomId);
      if (handleMessage) socket.off("chat-message", handleMessage);
      // Remove exactly these handler instances — not all listeners for the event
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
      socket.off("messages-read", handleMessagesRead);
    };
  }, [socket, effectiveRoomId, persistedMessages]);

  // ── Auto scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    // If there is an unread message and it's the first render of these messages, scroll to it
    if (unreadMessageRef.current) {
      unreadMessageRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      // Clear it after scrolling so we don't snap back to it on new messages
      unreadMessageRef.current = null;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, remoteTyping]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRemoveConnection = async () => {
    if (!connectionId) return;
    if (!window.confirm("Are you sure you want to remove this connection?")) return;
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`${API_URL}/api/connections/${connectionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      onClose(); // Close chat after removal
    } catch (err) {
      console.error(err);
    }
    setShowMenu(false);
  };

  const handleBlockUser = async () => {
    if (!remoteUser?._id && !remoteUser?.id) return;
    const targetId = remoteUser._id || remoteUser.id;
    if (!window.confirm("Are you sure you want to block this user?")) return;
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`${API_URL}/api/users/block/${targetId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      onClose(); // Close chat after blocking
    } catch (err) {
      console.error(err);
    }
    setShowMenu(false);
  };

  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
    if (!socket || !effectiveRoomId) return;
    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { roomId: effectiveRoomId, username: user?.username });
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setIsTyping(false);
      socket.emit("stop-typing", { roomId: effectiveRoomId });
    }, 2000);
  }, [socket, effectiveRoomId, isTyping, user?.username]);

  const sendMessage = useCallback((e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || !socket || !effectiveRoomId) return;
    socket.emit("chat-message", { message: inputValue, roomId: effectiveRoomId });
    socket.emit("stop-typing", { roomId: effectiveRoomId });
    setIsTyping(false);
    clearTimeout(typingTimeoutRef.current);
    const newMsg = { text: inputValue, sender: "You", createdAt: new Date().toISOString(), type: "self" };
    updateConnectionFromMessage?.({
      ...newMsg,
      roomId: effectiveRoomId,
      connectionId: connectionId || effectiveRoomId,
      sender: user?.id || user?._id
    });
    if (onSendMessage) onSendMessage(newMsg);
    else setInternalMessages((prev) => {
      const next = [...prev, newMsg];
      if (cacheKey) messageCacheRef?.current?.set(cacheKey, next);
      return next;
    });
    setInputValue("");
    setShowEmojiPicker(false);
  }, [inputValue, socket, effectiveRoomId, onSendMessage, connectionId, updateConnectionFromMessage, user?.id, user?._id]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !socket || !effectiveRoomId) return;

    setIsUploading(true);
    const data = new FormData();
    data.append("image", file);

    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`${API_URL}/api/upload/chat-image`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: data
      });
      const result = await res.json();
      if (res.ok) {
        socket.emit("chat-message", { imageUrl: result.url, roomId: effectiveRoomId });
        const newMsg = { imageUrl: result.url, sender: "You", createdAt: new Date().toISOString(), type: "self" };
        updateConnectionFromMessage?.({
          ...newMsg,
          text: "Image",
          roomId: effectiveRoomId,
          connectionId: connectionId || effectiveRoomId,
          sender: user?.id || user?._id
        });
        if (onSendMessage) onSendMessage(newMsg);
        else setInternalMessages((prev) => {
          const next = [...prev, newMsg];
          if (cacheKey) messageCacheRef?.current?.set(cacheKey, next);
          return next;
        });
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const COMMON_EMOJIS = ["❤️", "😂", "🔥", "😍", "👍", "🙌", "✨", "😊", "👋", "🎉", "🔥", "💯", "😂", "😮", "😢", "🚀", "💀", "😜", "🙈", "🤝"];

  const formatMessageDate = (dateStr) => {
    if (!dateStr) return "";

    const date = new Date(dateStr);

    if (isNaN(date.getTime())) return "";

    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return "Today";
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric"
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#0B0E14] relative overflow-x-hidden" translate="no">

      {/* Header */}
      <div className="sticky top-0 z-10 mt-1 p-3 md:p-4 flex flex-col items-center border-b border-[#1e293b]/30 bg-[#0B0E14]/80 backdrop-blur-xl">
        {/* Mobile Drag Handle */}
        {!isStandaloneChat && <div className="md:hidden w-12 h-1.5 bg-white/20 rounded-full mb-3" />}

        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            {isStandaloneChat && (
              <button onClick={onClose} className="md:hidden p-1 mr-1 text-gray-400 hover:text-white transition">
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {remoteUser && (
              <div className="relative">
                {remoteUser.profilePic ? (
                  <img
                    src={remoteUser.profilePic}
                    className="w-10 h-10 rounded-full object-cover border border-[#1e293b]"
                    alt={remoteUser.username}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#151923] border border-[#1e293b] flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                {remoteUser?.onlineStatus === 'online' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0B0E14] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                )}
              </div>
            )}
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tight">
                <span>{remoteUser?.username || "Live Chat"}</span>
              </h2>
              <div className="flex items-center gap-1.5">
                {remoteTyping ? (
                  <span className="text-[10px] text-purple-400 font-black animate-pulse uppercase tracking-widest">
                    Typing...
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${remoteUser?.onlineStatus === 'online' ? "text-green-500" : "text-gray-500"}`}>
                      {remoteUser?.onlineStatus === 'online' ? "Online now" : "Offline"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 px-4 text-gray-500 hover:text-white transition "
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 top-10 w-48 bg-[#151923] border border-[#1e293b] rounded-2xl shadow-2xl z-30 py-2 overflow-hidden animate-in zoom-in-95 duration-200">
                    <button
                      onClick={() => { setShowProfileModal(true); setShowMenu(false); }}
                      className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-[#1e293b] hover:text-white flex items-center gap-2 transition"
                    >
                      <Users className="w-4 h-4 text-purple-400" /> View Profile
                    </button>

                    {connectionId && (
                      <button
                        onClick={handleRemoveConnection}
                        className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-[#1e293b] hover:text-white flex items-center gap-2 transition"
                      >
                        <UserX className="w-4 h-4 text-orange-400" /> Remove Connection
                      </button>
                    )}

                    <div className="h-px w-full bg-[#1e293b] my-1"></div>

                    <button
                      onClick={handleBlockUser}
                      className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition"
                    >
                      <ShieldAlert className="w-4 h-4" /> Block User
                    </button>
                  </div>
                </>
              )}
            </div>

            <button onClick={onClose} className={`p-2 bg-white/5 rounded-full md:bg-transparent md:p-2 text-gray-400 hover:text-white transition ${isStandaloneChat ? 'hidden md:block' : ''}`}>
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-2 pb-8 md:pb-6 space-y-4 scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-fixed">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white">Loading Messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="opacity-10 flex flex-col items-center">
              <MessageSquare className="w-16 h-16 mb-4" />
              <p className="text-xs font-bold uppercase tracking-[0.2em]">Start a new conversation</p>
            </div>
            {!isStandaloneChat && (
              <div
                className="mt-8 bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl max-w-[80%] mx-auto cursor-pointer hover:bg-purple-500/20 transition animate-in fade-in zoom-in duration-500"
                onClick={() => setInputValue(icebreaker)}
              >
                <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-2">Icebreaker ✨</p>
                <p className="text-sm text-gray-300 font-medium italic">"{icebreaker}"</p>
                <p className="text-[9px] text-gray-500 mt-2 uppercase tracking-wider font-bold">Tap to use</p>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, idx) => {
            const showDate =
              idx === 0 ||
              formatMessageDate(messages[idx - 1].createdAt) !== formatMessageDate(msg.createdAt);

            // Find if this is the first unread message from the remote user
            const isFirstUnread = msg.type === "remote" && !msg.isRead &&
              messages.findIndex(m => m.type === "remote" && !m.isRead) === idx;

            return (
              <div key={idx} className="space-y-4" ref={isFirstUnread ? unreadMessageRef : null}>
                {showDate && (
                  <div className="flex justify-center my-6">
                    <span className="px-3 py-1 bg-[#151923] rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 border border-[#1e293b]/30">
                      {formatMessageDate(msg.createdAt)}
                    </span>
                  </div>
                )}
                <div className={`flex ${msg.type === "self" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`flex flex-col ${msg.type === "self" ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[70%]`}>
                    <div className={`px-4 py-2.5 rounded-[20px] shadow-2xl relative ${msg.type === "self"
                      ? "bg-gradient-to-br from-purple-600 via-pink-600 to-red-500 text-white rounded-tr-none shadow-purple-900/20"
                      : "bg-[#1e293b]/60 backdrop-blur-md border border-white/5 text-white rounded-tl-none shadow-black/20"
                      } ${msg.imageUrl ? "p-1" : ""}`}>
                      {msg.imageUrl ? (
                        <img src={msg.imageUrl} className="max-w-full rounded-[16px] object-cover max-h-60" loading="lazy" alt="sent" />
                      ) : (
                        <p className="text-[15px] leading-relaxed font-medium tracking-tight whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1 opacity-30">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                          : ""}                      </span>
                      {msg.type === "self" && (
                        msg.isRead
                          ? <CheckCheck className="w-3 h-3 text-blue-400" />
                          : <Check className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {remoteTyping && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-[#1e293b]/60 backdrop-blur-md border border-white/5 rounded-[20px] rounded-tl-none px-4 py-3 flex gap-1">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] bg-[#0B0E14] border-t border-[#1e293b]/20">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-gray-400 hover:text-white bg-[#151923] rounded-full border border-[#1e293b]/50 transition shadow-lg disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>

          <div className="flex-1 bg-[#151923] border border-[#1e293b] rounded-[24px] sm:rounded-full px-5 py-2 flex items-center shadow-inner focus-within:border-purple-500/50 transition-all relative">
            {showEmojiPicker && (
              <div className="absolute bottom-16 left-0 w-64 bg-[#151923] border border-[#1e293b] rounded-3xl p-4 shadow-2xl grid grid-cols-5 gap-2 animate-in slide-in-from-bottom-4 duration-200 z-30">
                {COMMON_EMOJIS.map((emoji, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInputValue(prev => prev + emoji)}
                    className="text-xl hover:scale-125 transition active:scale-95 p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              disabled={!effectiveRoomId}
              placeholder="Type a message..."
              autoComplete="off"
              spellCheck={false}
              data-gramm="false"
              onFocus={() => setShowEmojiPicker(false)}
              className="flex-1 bg-transparent text-white text-[15px] outline-none disabled:opacity-50 font-medium"
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-1 transition ml-2 ${showEmojiPicker ? "text-pink-500" : "text-gray-500 hover:text-pink-500"}`}
            >
              <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <button
            type="submit"
            disabled={!effectiveRoomId || !inputValue.trim()}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white hover:scale-105 transition-all active:scale-95 disabled:opacity-20 shadow-xl shadow-purple-600/20"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </form>
      </div>

      {showProfileModal && (
        <ProfileModal
          userId={remoteUser?._id || remoteUser?.id}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
};

export default ChatPanel;
