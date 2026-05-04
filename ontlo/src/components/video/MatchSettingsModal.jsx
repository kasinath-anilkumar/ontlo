import { X, Check, Globe, Users, Calendar, Heart } from "lucide-react";
import { useState } from "react";
import API_URL, { apiFetch } from "../../utils/api";
import { useSocket } from "../../context/SocketContext";

const MatchSettingsModal = ({ onClose, currentPreferences, onSave }) => {
  const [preferences, setPreferences] = useState(currentPreferences || {
    gender: 'All',
    ageRange: { min: 18, max: 100 },
    region: 'Global'
  });
  const [isSaving, setIsSaving] = useState(false);
  const { socket } = useSocket();

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#151923] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-black text-white uppercase tracking-wider">Match Settings</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Gender Preference */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
              <Users size={16} />
              <span className="text-xs font-black uppercase tracking-widest">I want to match with</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['Male', 'Female', 'Other', 'All'].map((g) => (
                <button
                  key={g}
                  onClick={() => setPreferences({ ...preferences, gender: g })}
                  className={`py-3 rounded-2xl border transition-all font-bold text-sm ${
                    preferences.gender === g
                      ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20"
                      : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Age Range */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-pink-400">
              <Calendar size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Age Range</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase">Min</span>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={preferences.ageRange.min}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    ageRange: { ...preferences.ageRange, min: parseInt(e.target.value) }
                  })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[10px] text-gray-500 font-bold uppercase">Max</span>
                <input
                  type="number"
                  min="18"
                  max="100"
                  value={preferences.ageRange.max}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    ageRange: { ...preferences.ageRange, max: parseInt(e.target.value) }
                  })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Region */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400">
              <Globe size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Preferred Region</span>
            </div>
            <select
              value={preferences.region}
              onChange={(e) => setPreferences({ ...preferences, region: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
            >
              <option value="Global">Global (Faster Matching)</option>
              <option value="North America">North America</option>
              <option value="Europe">Europe</option>
              <option value="Asia">Asia</option>
              <option value="South America">South America</option>
              <option value="Africa">Africa</option>
              <option value="Oceania">Oceania</option>
            </select>
          </div>

          {/* Interests */}
          <div className="space-y-4 pb-4">
            <div className="flex items-center gap-2 text-green-400">
              <Heart size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Preferred Interests</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Travel", "Music", "Gaming", "Art", "Movies", "Tech", "Cooking", "Fitness", "Photography", "Reading"].map((interest) => (
                <button
                  key={interest}
                  onClick={() => {
                    const currentInterests = preferences.interests || [];
                    const newInterests = currentInterests.includes(interest)
                      ? currentInterests.filter(i => i !== interest)
                      : [...currentInterests, interest];
                    setPreferences({ ...preferences, interests: newInterests });
                  }}
                  className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                    preferences.interests?.includes(interest)
                      ? "bg-green-600 border-green-500 text-white shadow-lg shadow-green-600/20"
                      : "bg-white/5 border-white/5 text-gray-500 hover:bg-white/10"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/20">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition shadow-xl disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><Check size={16} /> Save Preferences</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchSettingsModal;
