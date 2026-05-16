import { Crown, Loader2, MapPin, MessageSquare, User, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import API_URL, { apiFetch } from "../../utils/api";

const ProfileModal = ({ userId, onClose, onMessage }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      try {
        const response = await apiFetch(`${API_URL}/api/users/${userId}`);
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  if (!userId) return null;

  return createPortal(
    <div className="profile-modal-root">
      {/* Backdrop for desktop */}
      <div 
        className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm hidden lg:block animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-0 lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[450px] z-[60] bg-[#0B0E14] overflow-y-auto shadow-[-20px_0_50px_rgba(0,0,0,0.5)] border-l border-white/5 animate-slide-in-bottom lg:animate-slide-in-right ease-out scrollbar-hide">
        <div className="min-h-[100dvh] w-full relative flex flex-col">
          
          {/* Header Bar - Sticky, Ultra Compact */}
          <div className="sticky top-0 z-30 w-full px-4 h-14 flex items-center justify-between bg-[#0B0E14]/90 backdrop-blur-xl border-b border-white/5">
            <button onClick={onClose} className="flex items-center gap-2 text-white/70 hover:text-white transition group">
              <div className="p-1.5 rounded-full bg-white/5 group-hover:bg-purple-600 transition-colors">
                <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Close</span>
            </button>
            
            {profile && profile.isPremium && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded-full">
                <Crown className="w-3 h-3 text-yellow-400 fill-current animate-pulse" />
                <span className="text-[7px] font-black uppercase tracking-widest text-yellow-400">Premium</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
               <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                    <User className="absolute inset-0 m-auto w-4 h-4 text-purple-500/50" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500 animate-pulse">Loading</span>
               </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 pb-20">
              {/* Hero Image Section - ULTRA COMPACT */}
              <div className="h-28 relative overflow-hidden shrink-0">
                 <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-[#0B0E14] to-red-900/40" />
                 {profile.profilePic && (
                   <img 
                     src={profile.profilePic} 
                     className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30" 
                     alt=""
                   />
                 )}
                 <div className="absolute -bottom-1 left-0 right-0 h-16 bg-gradient-to-t from-[#0B0E14] to-transparent" />
              </div>

              {/* Main Profile Pic - Overlapping */}
              <div className="flex justify-center -mt-14 relative z-10 px-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-purple-500 to-pink-500 shadow-xl transform hover:scale-105 transition-transform duration-300">
                   <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#0B0E14]">
                      {profile.profilePic ? (
                        <img 
                           src={profile.profilePic} 
                           alt={profile.username} 
                           className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-[#151923] flex items-center justify-center">
                          <User className="w-10 h-10 text-gray-600" />
                        </div>
                      )}
                   </div>
                </div>
              </div>

              {/* Content Section - ULTRA TIGHT */}
              <div className="px-5 flex flex-col mt-3 relative z-10 flex-1">
                 {/* Name & Title */}
                 <div className="flex flex-col items-center mb-4 text-center">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1.5 leading-none">
                       {profile.username}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                       <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-purple-500" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                            {profile.fullName || "Member"}
                          </span>
                       </div>
                       <div className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
                          <span className="text-[8px] font-black uppercase tracking-widest text-purple-400">
                            {profile.age || "--"} Y.O
                          </span>
                       </div>
                    </div>
                 </div>

                 {/* Bio - Inline format */}
                 {profile.bio && (
                   <div className="mb-5 text-center px-2">
                      <p className="text-gray-300 text-xs leading-snug italic font-medium">
                         "{profile.bio}"
                      </p>
                   </div>
                 )}

                 {/* Stats & Info Grid - ULTRA COMPACT */}
                 <div className="grid grid-cols-2 gap-2 mb-5">
                    <div className="bg-[#151923] border border-white/5 rounded-2xl p-2.5 flex items-center justify-center gap-2.5 group">
                       <Users className="w-4 h-4 text-purple-400 shrink-0" />
                       <div className="flex flex-col text-left">
                          <span className="text-sm font-black text-white leading-none mb-0.5">{profile.connectionsCount || 0}</span>
                          <span className="text-[7px] font-black uppercase tracking-[0.2em] text-gray-500">Connections</span>
                       </div>
                    </div>
                    
                    <div className="bg-[#151923] border border-white/5 rounded-2xl p-2.5 flex items-center justify-center gap-2.5 group overflow-hidden">
                       <MapPin className="w-4 h-4 text-pink-400 shrink-0" />
                       <div className="flex flex-col text-left min-w-0">
                          <span className="text-[9px] font-black text-white truncate leading-none mb-0.5">{profile.location || "Earth"}</span>
                          <span className="text-[7px] font-black uppercase tracking-[0.2em] text-gray-500">Base</span>
                       </div>
                    </div>
                 </div>

                 {/* Interests Section - ULTRA COMPACT */}
                 {profile.interests && profile.interests.length > 0 && (
                   <div className="mb-2 flex-1">
                      <div className="flex flex-wrap justify-center gap-1.5">
                         {profile.interests.map((interest) => (
                           <span key={interest} className="px-2.5 py-1 bg-[#151923] border border-white/10 text-white text-[8px] font-bold rounded-lg shadow-sm">
                              {interest}
                           </span>
                         ))}
                      </div>
                   </div>
                 )}
              </div>
            </div>
          )}

          {/* Action Bar - ULTRA COMPACT */}
          <div className="sticky bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14] to-transparent z-40 mt-auto">
            <button 
                onClick={() => { onClose(); if (onMessage) onMessage(); }}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 text-white font-black uppercase tracking-[0.2em] py-3.5 rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs">Say Hello</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProfileModal;
