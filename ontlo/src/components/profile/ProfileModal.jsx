import { X, MapPin, Calendar, Activity, ShieldAlert, Loader2 } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#0B0E14] w-full sm:max-w-md h-[85vh] sm:h-auto sm:rounded-3xl rounded-t-3xl overflow-y-auto overflow-x-hidden shadow-2xl relative flex flex-col animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 border-t sm:border border-[#1e293b]">
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-10 bg-[#0B0E14]/80 backdrop-blur-md flex items-center justify-between p-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">{profile?.username || 'Loading...'}</h2>
            {profile?.isPremium && <ShieldAlert className="w-4 h-4 text-purple-500" />}
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-20">
             <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : (
          <div className="p-6">
            {/* Header: Photo and Stats */}
            <div className="flex items-center justify-between mb-6">
              {/* Profile Photo */}
              <div className="relative shrink-0">
                 <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                    <div className="w-full h-full rounded-full border-[3px] border-[#0B0E14] overflow-hidden bg-[#151923]">
                      <img src={profile.profilePic || "https://i.pravatar.cc/150"} alt={profile.username} className="w-full h-full object-cover" />
                    </div>
                 </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6 sm:gap-8 ml-6">
                <div className="flex flex-col items-center">
                  <span className="text-white font-bold text-lg">{profile.connectionsCount || 0}</span>
                  <span className="text-gray-400 text-xs font-medium">Connections</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-white font-bold text-lg">{profile.age || '--'}</span>
                  <span className="text-gray-400 text-xs font-medium">Age</span>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="mb-6">
              <h1 className="text-white font-bold text-sm mb-1">{profile.fullName || profile.username}</h1>
              <p className="text-gray-400 text-sm mb-2">{profile.gender === 'Prefer not to say' ? '' : profile.gender}</p>
              {profile.bio && <p className="text-white text-sm whitespace-pre-wrap">{profile.bio}</p>}
              {profile.location && (
                <div className="mt-2 flex items-center gap-1 text-gray-400 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{profile.location}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-6">
              <button 
                onClick={() => { onClose(); if (onMessage) onMessage(); }}
                className="flex-1 bg-[#1e293b] hover:bg-[#334155] text-white font-bold py-2 rounded-lg transition"
              >
                Message
              </button>
            </div>

            {/* Interests / Highlights (Optional if available) */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="border-t border-[#1e293b] pt-6">
                <h3 className="text-white font-bold mb-4">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, idx) => (
                    <span key={idx} className="bg-[#151923] text-purple-400 border border-[#1e293b] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
