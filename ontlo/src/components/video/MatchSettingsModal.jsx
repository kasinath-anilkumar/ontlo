import { X, Check, Globe, Users, Calendar, Heart, Sparkles, MapPin, Search } from "lucide-react";
import { useState, useEffect } from "react";
import API_URL, { apiFetch } from "../../utils/api";
import { useSocket } from "../../context/SocketContext";

const MatchSettingsModal = ({ onClose, currentPreferences, onSave }) => {
  const [preferences, setPreferences] = useState(currentPreferences || {
    gender: 'All',
    ageRange: { min: 18, max: 100 },
    region: 'Global',
    interests: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const { socket } = useSocket();

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`${API_URL}/api/users/match-preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });
      
      if (res.ok) {
        const data = await res.json();
        if (socket) {
          socket.emit('update-match-preferences', data.matchPreferences);
        }
        onSave(data.matchPreferences);
        onClose();
      }
    } catch (error) {
      console.error("Failed to save preferences", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-[#0B0E14] sm:bg-[#0B0E14]/90 sm:backdrop-blur-2xl border-t sm:border border-white/10 rounded-t-[40px] sm:rounded-[40px] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom duration-500">
        
        {/* Decorative Gradient Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 z-50"></div>

        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between bg-white/5 border-b border-white/5">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-purple-500/10 rounded-xl">
               <Sparkles className="w-5 h-5 text-purple-400" />
             </div>
             <div>
               <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Match Preferences</h3>
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tune your discovery experience</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:bg-white/10 active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          
          {/* Gender Preference - Premium Toggle Design */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400">
                <Users size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Match With</span>
              </div>
              <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full font-bold">{preferences.gender}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 bg-black/40 p-1.5 rounded-[24px] border border-white/5">
              {['Male', 'Female', 'Other', 'All'].map((g) => (
                <button
                  key={g}
                  onClick={() => setPreferences({ ...preferences, gender: g })}
                  className={`py-3.5 rounded-[18px] transition-all text-xs font-black uppercase tracking-tighter ${
                    preferences.gender === g
                      ? "bg-white text-black shadow-[0_8px_16px_rgba(255,255,255,0.1)] scale-[1.02]"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </section>

          {/* Age Range - Visual Inputs */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-pink-400">
                <Calendar size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Age Range</span>
              </div>
              <span className="text-[10px] bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full font-bold">
                {preferences.ageRange.min} - {preferences.ageRange.max}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 group">
                <div className="relative">
                   <input
                     type="number"
                     min="18"
                     max={preferences.ageRange.max}
                     value={preferences.ageRange.min}
                     onChange={(e) => setPreferences({
                       ...preferences,
                       ageRange: { ...preferences.ageRange, min: Math.max(18, parseInt(e.target.value) || 18) }
                     })}
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-pink-500/50 transition-all text-center"
                   />
                   <span className="absolute -top-2 left-4 px-2 bg-[#0B0E14] text-[9px] font-black text-gray-500 uppercase">Min Age</span>
                </div>
              </div>
              <div className="w-4 h-px bg-white/10"></div>
              <div className="flex-1 group">
                <div className="relative">
                   <input
                     type="number"
                     min={preferences.ageRange.min}
                     max="100"
                     value={preferences.ageRange.max}
                     onChange={(e) => setPreferences({
                       ...preferences,
                       ageRange: { ...preferences.ageRange, max: Math.min(100, parseInt(e.target.value) || 100) }
                     })}
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-pink-500/50 transition-all text-center"
                   />
                   <span className="absolute -top-2 left-4 px-2 bg-[#0B0E14] text-[9px] font-black text-gray-500 uppercase">Max Age</span>
                </div>
              </div>
            </div>
          </section>

          {/* Region - Custom Select Style */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <Globe size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Discovery Region</span>
              </div>
              <MapPin className="w-4 h-4 text-gray-600" />
            </div>
            <div className="relative">
              <select
                value={preferences.region}
                onChange={(e) => setPreferences({ ...preferences, region: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white font-bold focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer transition-all hover:bg-white/10 shadow-inner"
              >
                <option value="Global" className="bg-[#0B0E14]">🌎 Global (Instant Match)</option>
                <option value="North America" className="bg-[#0B0E14]">🇺🇸 North America</option>
                <option value="Europe" className="bg-[#0B0E14]">🇪🇺 Europe</option>
                <option value="Asia" className="bg-[#0B0E14]">🌏 Asia</option>
                <option value="South America" className="bg-[#0B0E14]">🇧🇷 South America</option>
                <option value="Africa" className="bg-[#0B0E14]">🇿🇦 Africa</option>
                <option value="Oceania" className="bg-[#0B0E14]">🇦🇺 Oceania</option>
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-2 h-2 border-r-2 border-b-2 border-gray-500 rotate-45"></div>
              </div>
            </div>
          </section>

          {/* Interests - Modern Chip Cloud */}
          <section className="space-y-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-400">
                <Heart size={16} />
                <span className="text-[11px] font-black uppercase tracking-widest">Interests Filter</span>
              </div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{preferences.interests?.length || 0} Selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Travel", "Music", "Gaming", "Art", "Movies", "Tech", "Cooking", "Fitness", "Photography", "Reading", "Anime", "Crypto", "Fashion", "Nature"].map((interest) => {
                const isActive = preferences.interests?.includes(interest);
                return (
                  <button
                    key={interest}
                    onClick={() => {
                      const currentInterests = preferences.interests || [];
                      const newInterests = isActive
                        ? currentInterests.filter(i => i !== interest)
                        : [...currentInterests, interest];
                      setPreferences({ ...preferences, interests: newInterests });
                    }}
                    className={`px-4 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                      isActive
                        ? "bg-green-500 border-green-400 text-black shadow-[0_8px_20px_rgba(34,197,94,0.3)] scale-105"
                        : "bg-white/5 border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300"
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-white/5 border-t border-white/5 backdrop-blur-3xl">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-5 bg-white text-black rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-3 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <><Check size={18} strokeWidth={3} /> Apply Changes</>
            )}
          </button>
          
          <button 
             onClick={onClose}
             className="w-full mt-4 py-2 text-[10px] text-gray-600 hover:text-gray-400 font-black uppercase tracking-widest transition-colors"
          >
             Dismiss Changes
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
};

export default MatchSettingsModal;
