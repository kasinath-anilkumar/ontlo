import { Bell, MessageSquare, Heart, Shield, Check, Trash2, Loader2, ChevronLeft, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL, { apiFetch } from "../utils/api";
import { useSocket } from "../context/SocketContext";

const Notifications = () => {
  const { notifications, setNotifications, fetchGlobalNotifications } = useSocket();
  const [loading, setLoading] = useState(notifications.length === 0);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    await fetchGlobalNotifications(true);
    setLoading(false);
  };

  useEffect(() => {
    if (notifications.length === 0) {
      fetchGlobalNotifications();
    } else {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`${API_URL}/api/notifications/read-all`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-5 h-5 text-purple-400" />;
      case 'like': return <Heart className="w-5 h-5 text-pink-500" />;
      case 'announcement': return <Bell className="w-5 h-5 text-amber-500" />;
      case 'alert':
      case 'security':
      case 'safety': return <Shield className="w-5 h-5 text-red-500" />;
      case 'info':
      case 'system': return <Shield className="w-5 h-5 text-blue-500" />;
      default: return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen w-f bg-transparent flex flex-col w-full mx-auto px-2 sm:scrollbar:hidden md:scrollbar:visible">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0B0E14]/90 backdrop-blur-xl pt-4 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 mb-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition md:hidden">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl sm:p-0 md:p-4 font-black text-white tracking-tighter uppercase italic italic">Notifications</h1>
        </div>

        {notifications.some(n => !n.isRead) && (
          <button
            onClick={markAllRead}
            className="text-[10px] font-black text-purple-400 hover:text-purple-300 uppercase tracking-widest transition-all bg-purple-500/5 px-4 py-2 rounded-xl border border-purple-500/10"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => {
                if (!n.isRead) markAsRead(n._id);
                // Smart Routing
                if (n.type === 'message') navigate('/messages', { state: { selectId: n.relatedId } });
                if (n.type === 'like') navigate('/who-liked-you');
              }}
              className={`group relative p-2 rounded-md border transition-all cursor-pointer overflow-hidden
                ${n.isRead
                  ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                  : 'bg-purple-600/5 border-purple-500/20 hover:bg-purple-600/10'
                }
              `}
            >
              {/* Active Indicator Glow */}
              {!n.isRead && (
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-pink-500"></div>
              )}

              <div className="flex gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all
                  ${n.isRead ? 'bg-white/5 border-white/5' : 'bg-purple-500/20 border-purple-500/30'}
                `}>
                  {n.fromUser && n.fromUser.profilePic ? (
                    <img src={n.fromUser.profilePic} className="w-full h-full rounded-2xl object-cover" alt="" />
                  ) : n.fromUser ? (
                    <User className="w-5 h-5 text-gray-400" />
                  ) : getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border ${n.type === 'announcement' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          n.type === 'alert' || n.type === 'security' || n.type === 'safety' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            n.type === 'info' || n.type === 'system' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                              'bg-purple-500/10 text-purple-500 border-purple-500/20'
                        }`}>
                        {n.type === 'announcement' ? 'Announcement' :
                          n.type === 'alert' || n.type === 'security' || n.type === 'safety' ? 'Security Alert' :
                            n.type === 'info' || n.type === 'system' ? 'System Info' : n.type}
                      </span>
                      {n.fromUser && n.fromUser.username && n.fromUser.username !== 'User' && (
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-tight ml-1">{n.fromUser.username}</span>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">{formatTime(n.createdAt)}</span>
                  </div>
                  <p className={`text-sm font-medium leading-relaxed ${n.isRead ? 'text-gray-500' : 'text-gray-300'}`}>
                    {n.content}
                  </p>
                </div>
              </div>

              {/* Mark as read button overlay */}
              {!n.isRead && (
                <button
                  onClick={(e) => { e.stopPropagation(); markAsRead(n._id); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20"
                >
                  <Check className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white/[0.01] rounded-md border border-white/5 border-dashed">
          <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6">
            <Bell className="w-10 h-10 text-gray-800" />
          </div>
          {/* <h3 className="text-white font-bold text-lg mb-1 italic">Clear signals</h3> */}
          <p className="text-gray-600 text-xs font-black uppercase tracking-[0.2em]">No notifications yet</p>
        </div>
      )}
    </div>
  );
};

export default Notifications;
