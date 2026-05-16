import { Bell, ChevronLeft, Heart, MessageSquare, Shield, User, X, CheckSquare, Square, Trash2, Zap, Filter } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useSocket } from "../context/SocketContext";
import API_URL, { apiFetch } from "../utils/api";
import Skeleton from "../components/ui/Skeleton";

const NotificationSkeleton = () => (
  <div className="px-4 py-4 space-y-6">
    {[1, 2].map((s) => (
      <div key={`section-skeleton-${s}`} className="space-y-4">
        <Skeleton className="w-24 h-4 rounded-md" />
        {[1, 2, 3].map((i) => (
          <div key={`item-skeleton-${s}-${i}`} className="flex items-center gap-3">
            <Skeleton circle={true} className="w-11 h-11 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-3/4 h-3 rounded-full" />
              <Skeleton className="w-1/2 h-2.5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const NotificationItem = ({ n, isSelecting, isSelected, onToggleSelect, onDelete, onMarkRead, formatTimeCompact, getNotificationIcon }) => {
  const navigate = useNavigate();
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-100, -50, 0], [1, 0.8, 0.5]);
  
  const timerRef = useRef(null);
  const [isHolding, setIsHolding] = useState(false);

  const handleHoldStart = () => {
    if (isSelecting) return;
    setIsHolding(true);
    timerRef.current = setTimeout(() => {
      onToggleSelect(n._id);
      setIsHolding(false);
    }, 600);
  };

  const handleHoldEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsHolding(false);
  };

  return (
    <div className="relative overflow-hidden bg-[#0B0E14]">
      <motion.div 
        style={{ opacity: deleteOpacity, scale: deleteScale }}
        className="absolute right-0 top-0 bottom-0 w-[80px] sm:w-[100px] bg-red-500 flex items-center justify-center pointer-events-none"
      >
        <Trash2 className="text-white w-5 h-5 sm:w-6 sm:h-6" />
      </motion.div>

      <motion.div
        drag={isSelecting ? false : "x"}
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(e, { offset }) => {
          if (offset.x < -70) onDelete(n._id);
        }}
        style={{ x }}
        onPointerDown={handleHoldStart}
        onPointerUp={handleHoldEnd}
        onPointerLeave={handleHoldEnd}
        onClick={() => {
          if (isSelecting) {
            onToggleSelect(n._id);
          } else {
            if (!n.isRead) onMarkRead(n._id);
            if (n.type === 'match') navigate('/messages', { state: { selectId: n.relatedId } });
          }
        }}
        animate={{ 
          scale: isHolding ? 0.98 : 1,
          backgroundColor: isSelected ? "rgba(255,255,255,0.05)" : "rgba(11,14,20,0)" 
        }}
        className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 active:bg-white/[0.04] transition-colors cursor-pointer relative z-10 touch-pan-y"
      >
        {isSelecting && (
          <div className="shrink-0 mr-1">
            {isSelected ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5 text-gray-600" />}
          </div>
        )}

        <div className="relative shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 overflow-hidden">
            {n.fromUser?.profilePic ? (
              <img src={n.fromUser.profilePic.replace("/upload/", "/upload/w_100,h_100,c_fill,q_auto,f_auto/")} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
              </div>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 sm:w-4.5 h-4 sm:h-4.5 rounded-full bg-[#0B0E14] border border-white/10 flex items-center justify-center">
            {getNotificationIcon(n.type)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] sm:text-[14px] leading-tight text-white line-clamp-3">
            <span className="font-bold mr-1.5">{n.fromUser?.username || 'System'}</span>
            <span className="text-white/90 font-medium">{n.content}</span>
            <span className="text-gray-500 ml-1.5 whitespace-nowrap text-[11px] sm:text-xs">{formatTimeCompact(n.createdAt)}</span>
          </p>
        </div>

        {!n.isRead && (
          <div className="shrink-0 ml-1.5 sm:ml-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          </div>
        )}
      </motion.div>
    </div>
  );
};

const Notifications = () => {
  const { notifications, setNotifications, fetchGlobalNotifications } = useSocket();
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      if (notifications.length === 0) {
        setLoading(true);
        await fetchGlobalNotifications(true);
        setLoading(false);
      }
    };
    load();

    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`${API_URL}/api/notifications/read-all`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) { console.error(err); }
  };

  const deleteOne = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`${API_URL}/api/notifications/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) { console.error(err); }
  };

  const deleteBulk = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} notifications?`)) return;
    try {
      const token = localStorage.getItem("token");
      await apiFetch(`${API_URL}/api/notifications/bulk-delete`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      setNotifications(notifications.filter(n => !selectedIds.has(n._id)));
      setSelectedIds(new Set());
      setIsSelecting(false);
    } catch (err) { console.error(err); }
  };

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'All') return notifications;
    
    if (activeFilter === 'Alerts') {
      const alertTypes = ['announcement', 'alert', 'system', 'info', 'security'];
      return notifications.filter(n => alertTypes.includes(n.type));
    }
    
    if (activeFilter === 'Matches') {
      // Likes are now excluded from global list, so only show matches
      return notifications.filter(n => n.type === 'match');
    }
    
    return notifications;
  }, [notifications, activeFilter]);

  const groupedNotifications = useMemo(() => {
    const groups = { Today: [], Yesterday: [], "Last 7 days": [], Older: [] };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    filteredNotifications.forEach(n => {
      const date = new Date(n.createdAt);
      if (date >= today) groups.Today.push(n);
      else if (date >= yesterday) groups.Yesterday.push(n);
      else if (date >= last7Days) groups["Last 7 days"].push(n);
      else groups.Older.push(n);
    });
    
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [filteredNotifications]);

  const toggleSelect = (id) => {
    setIsSelecting(true);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatTimeCompact = (date) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
      case 'match': return <Heart size={10} className="fill-pink-500 text-pink-500" />;
      case 'message': return <MessageSquare size={10} className="fill-purple-500 text-purple-500" />;
      case 'announcement':
      case 'alert':
      case 'system': return <Zap size={10} className="fill-amber-500 text-amber-500" />;
      case 'info':
      case 'ping': return <Shield size={10} className="fill-blue-500 text-blue-500" />;
      default: return <Bell size={10} className="fill-blue-500 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-full bg-[#0B0E14] flex flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0B0E14]/95 backdrop-blur-xl border-b border-white/5">
        <div className="px-3 sm:px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {isSelecting ? (
              <button onClick={() => { setIsSelecting(false); setSelectedIds(new Set()); }} className="p-1 -ml-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            ) : (
              <button onClick={() => navigate(-1)} className="p-1 -ml-1 md:hidden">
                <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </button>
            )}
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate max-w-[150px] sm:max-w-none">
              {isSelecting ? `${selectedIds.size} Selected` : "Notifications"}
            </h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {!isSelecting ? (
              <div className="flex items-center gap-1 sm:gap-2">
                {notifications.some(n => !n.isRead) && (
                  <button onClick={markAllRead} className="text-[12px] sm:text-[13px] font-bold text-blue-500 px-1.5 sm:px-2 py-1">Read all</button>
                )}
                
                {/* Filter Trigger */}
                <div className="relative" ref={filterRef}>
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-1.5 sm:p-2 rounded-full transition-colors ${showFilters ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <Filter className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${activeFilter !== 'All' ? 'text-blue-500 fill-blue-500/20' : 'text-white'}`} />
                  </button>

                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        key="filters-menu"
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute right-0 mt-2 w-40 sm:w-48 bg-[#1A1F2B] border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden py-1 z-50"
                      >
                        {['All', 'Alerts', 'Matches'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => {
                              setActiveFilter(filter);
                              setShowFilters(false);
                            }}
                            className={`w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 text-[13px] sm:text-sm font-bold flex items-center justify-between ${
                              activeFilter === filter ? 'text-blue-500 bg-white/5' : 'text-gray-300 hover:bg-white/5'
                            }`}
                          >
                            {filter}
                            {activeFilter === filter && <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-500 rounded-full" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <button onClick={deleteBulk} disabled={selectedIds.size === 0} className={`text-[13px] sm:text-sm font-bold ${selectedIds.size > 0 ? "text-red-500" : "text-gray-600"}`}>Delete</button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {loading ? (
          <NotificationSkeleton />
        ) : groupedNotifications.length > 0 ? (
          <div className="pb-20">
            {groupedNotifications.map(([group, items]) => (
              <div key={group} className="mb-2 sm:mb-4">
                <div className="flex items-center justify-between px-4 py-2 sm:py-3">
                  <h2 className="text-[14px] sm:text-[16px] font-bold text-white">{group}</h2>
                  {group === 'Today' && activeFilter !== 'All' && (
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-black text-blue-500 bg-blue-500/10 px-1.5 sm:px-2 py-0.5 rounded-full">
                      {activeFilter}
                    </span>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {items.map((n) => (
                    <motion.div
                      key={n._id}
                      initial={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, x: -100 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <NotificationItem 
                        n={n}
                        isSelecting={isSelecting}
                        isSelected={selectedIds.has(n._id)}
                        onToggleSelect={toggleSelect}
                        onDelete={deleteOne}
                        onMarkRead={markAsRead}
                        formatTimeCompact={formatTimeCompact}
                        getNotificationIcon={getNotificationIcon}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 sm:py-24 px-4 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/10 flex items-center justify-center mb-5 sm:mb-6">
              <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-white/20" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">No {activeFilter === 'All' ? '' : activeFilter.toLowerCase()} notifications</h3>
            {/* <p className="text-gray-500 text-[10px] uppercase tracking-widest font-black">Checking again soon...</p> */}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
