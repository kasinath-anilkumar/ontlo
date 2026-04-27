import { X, MapPin, Calendar, Activity, ShieldAlert, Loader2, MessageSquare, Heart, Users, Star, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import API_URL from "../../utils/api";

const ProfileModal = ({ userId, onClose, onMessage }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/${userId}`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 px-4">
      <div className="bg-[#0B0E14] w-full max-w-sm rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5 relative animate-in zoom-in-95 duration-300">
        
        {/* Close Button - Floating */}
        <button onClick={onClose} className="absolute top-5 right-5 z-20 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-white transition">
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-40 flex items-center justify-center">
             <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Hero Header Background */}
            <div className="h-40 bg-gradient-to-br from-purple-600 via-pink-600 to-red-500 relative">
               <div className="absolute inset-0 bg-black/20" />
               <div className="absolute -bottom-1 left-0 right-0 h-20 bg-gradient-to-t from-[#0B0E14] to-transparent" />
            </div>

            {/* Profile Avatar Overlay */}
            <div className="px-6 -mt-16 relative z-10 flex flex-col items-center">
               <div className="w-32 h-32 rounded-[32px] p-1 bg-[#0B0E14] shadow-2xl">
                  <div className="w-full h-full rounded-[28px] overflow-hidden border-2 border-white/10">
                     <img 
                        src={profile.profilePic || "https://i.pravatar.cc/150"} 
                        alt={profile.username} 
                        className="w-full h-full object-cover" 
                     />
                  </div>
               </div>
               
               {/* Online Badge */}
               {profile.onlineStatus && (
                 <div className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Online now</span>
                 </div>
               )}
            </div>

            {/* Info Section */}
            <div className="px-8 pt-4 pb-10 flex flex-col items-center text-center">
               <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1 flex items-center gap-2">
                  {profile.username}
                  {profile.isPremium && <Crown className="w-5 h-5 text-yellow-400 fill-current" />}
               </h2>
               <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">
                  {profile.fullName || "Member"} • {profile.age || "--"} Y.O
               </p>

               {profile.bio && (
                 <p className="text-gray-300 text-sm leading-relaxed mb-6 italic">
                    "{profile.bio}"
                 </p>
               )}

               {/* Stats Grid */}
               <div className="grid grid-cols-2 w-full gap-4 mb-8">
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex flex-col items-center">
                     <Users className="w-4 h-4 text-purple-400 mb-1" />
                     <span className="text-white font-black text-lg">{profile.connectionsCount || 0}</span>
                     <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Connections</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex flex-col items-center">
                     <MapPin className="w-4 h-4 text-pink-400 mb-1" />
                     <span className="text-white font-black text-sm truncate w-full">{profile.location || "Earth"}</span>
                     <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Location</span>
                  </div>
               </div>

               {/* Interests Pill */}
               {profile.interests && profile.interests.length > 0 && (
                 <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {profile.interests.slice(0, 3).map((interest, idx) => (
                      <span key={idx} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                         {interest}
                      </span>
                    ))}
                    {profile.interests.length > 3 && (
                      <span className="px-3 py-1 bg-white/5 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                         +{profile.interests.length - 3} More
                      </span>
                    )}
                 </div>
               )}

               {/* Action Button */}
               <button 
                  onClick={() => { onClose(); if (onMessage) onMessage(); }}
                  className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 text-white font-black uppercase tracking-widest py-5 rounded-[24px] shadow-xl shadow-purple-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                  <MessageSquare className="w-4 h-4" />
                  Say Hello
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
