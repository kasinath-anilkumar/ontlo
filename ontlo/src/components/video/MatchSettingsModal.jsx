import { X, Check, Globe, Users, Calendar, Heart, Sparkles, MapPin, Search } from "lucide-react";
import { useState, useEffect } from "react";
import API_URL, { apiFetch } from "../../utils/api";
import { useSocket } from "../../context/SocketContext";

const MatchSettingsModal = ({ onClose, currentPreferences, onSave }) => {
  const [preferences, setPreferences] = useState(currentPreferences || {
    gender: 'All',
    ageRange: { min: 18, max: 100 },
    distance: 500,
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
    <div className="fixed inset-x-0 top-0 bottom-[84px] md:bottom-0 z-[200] flex justify-end animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      {/* Drawer Container */}
      <div className="relative h-full w-[85vw] max-w-sm bg-[#0B0E14]/95 backdrop-blur-2xl border-l border-white/10 shadow-[-32px_0_64px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Decorative Gradient Header */}
        {/* <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 z-50"></div> */}

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between bg-white/5 border-b border-white/5">
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-purple-500/10 rounded-lg">
               <Sparkles className="w-4 h-4 text-purple-400" />
             </div>
             <div>
               <h3 className="text-base font-black text-white uppercase tracking-tighter italic">Match Preferences</h3>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:bg-white/10 active:scale-90"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
          
          {/* Gender Preference */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-purple-400">
                <Users size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Match With</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
              {['Male', 'Female', 'Other', 'All'].map((g) => (
                <button
                  key={g}
                  onClick={() => setPreferences({ ...preferences, gender: g })}
                  className={`py-2 rounded-lg transition-all text-[10px] font-black uppercase tracking-tighter ${
                    preferences.gender === g
                      ? "bg-white text-black shadow-sm scale-[1.02]"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </section>

          {/* Age Range */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-pink-400">
                <Calendar size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Age Range</span>
              </div>
              <span className="text-[10px] bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full font-bold">
                {preferences.ageRange.min} - {preferences.ageRange.max} yrs
              </span>
            </div>
            
            <div className="space-y-4 bg-black/20 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black text-gray-500 uppercase w-6">Min</span>
                <input
                  type="range"
                  min="18"
                  max="100"
                  value={preferences.ageRange.min}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    ageRange: { ...preferences.ageRange, min: Math.min(parseInt(e.target.value), preferences.ageRange.max) }
                  })}
                  className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pink-500"
                />
                <span className="text-[10px] font-bold text-white w-4 text-right">{preferences.ageRange.min}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black text-gray-500 uppercase w-6">Max</span>
                <input
                  type="range"
                  min="18"
                  max="100"
                  value={preferences.ageRange.max}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    ageRange: { ...preferences.ageRange, max: Math.max(parseInt(e.target.value), preferences.ageRange.min) }
                  })}
                  className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pink-500"
                />
                <span className="text-[10px] font-bold text-white w-4 text-right">{preferences.ageRange.max}</span>
              </div>
            </div>
          </section>

          {/* Distance */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-blue-400">
                <MapPin size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Max Distance</span>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold">
                {(preferences.distance || 500) >= 500 ? '500+ km' : `${preferences.distance} km`}
              </span>
            </div>
            
            <div className="bg-black/20 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black text-gray-500 uppercase w-6">Dist</span>
                <input
                  type="range"
                  min="5"
                  max="500"
                  step="5"
                  value={preferences.distance || 500}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    distance: parseInt(e.target.value)
                  })}
                  className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-[10px] font-bold text-white w-8 text-right">
                  {(preferences.distance || 500) >= 500 ? '500+' : preferences.distance}
                </span>
              </div>
            </div>
          </section>

          {/* Interests */}
          <section className="space-y-3 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-green-400">
                <Heart size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Interests ({preferences.interests?.length || 0})</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
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
                    className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                      isActive
                        ? "bg-green-500 border-green-400 text-black shadow-sm scale-105"
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
        <div className="p-4 bg-white/5 border-t border-white/5 backdrop-blur-3xl flex gap-3 items-center">
          <button 
             onClick={onClose}
             className="flex-1 py-3 text-[10px] text-gray-400 bg-white/5 rounded-xl hover:bg-white/10 hover:text-white font-black uppercase tracking-widest transition-all"
          >
             Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-[2] py-3 bg-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <><Check size={14} strokeWidth={3} /> Apply</>
            )}
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
