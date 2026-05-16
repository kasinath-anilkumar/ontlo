import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, User, Sparkles, Upload, Loader2, ChevronRight, ChevronLeft, Globe, Calendar, MapPin } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import API_URL, { apiFetch } from "../utils/api";
import LocationAutocomplete from "../components/common/LocationAutocomplete";

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    dob: "",
    gender: "Male",
    location: "",
    lat: null,
    lng: null,
    interests: [],
    bio: "",
    profilePic: ""
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useSocket();

  // Redirect if no registration data found
  useEffect(() => {
    const tempReg = localStorage.getItem("temp_reg");
    const token = localStorage.getItem("token");

    // If we have a token but no user, we might be in the middle of onboarding for an old account
    // But since we want to create at last, we should have temp_reg
    if (!tempReg && !token) {
      navigate("/auth");
    }
  }, [navigate]);

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth() - birth.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleDobChange = (val) => {
    const age = calculateAge(val);
    setFormData(prev => ({ ...prev, dob: val, age: age }));
  };

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large (max 5MB)");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, profilePic: reader.result });
      setUploading(false);
    };
    reader.onerror = () => {
      alert("Failed to read file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const tempReg = JSON.parse(localStorage.getItem("temp_reg") || "{}");

      // If we are updating an existing account (backwards compatibility)
      const token = localStorage.getItem("token");
      const endpoint = token ? "/api/auth/complete-profile" : "/api/auth/register";

      const payload = token ? formData : { ...tempReg, ...formData };

      const response = await apiFetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create account");

      // Save user and token
      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.token) localStorage.setItem("token", data.token);

      // Clear temp reg
      localStorage.removeItem("temp_reg");

      setUser(data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const commonInterests = ["Travel", "Music", "Gaming", "Art", "Movies", "Tech", "Cooking", "Fitness", "Photography", "Reading"];

  return (
    <div className="min-h-screen bg-[#05070A] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Immersive 3D Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-600/10 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-pink-600/10 rounded-full blur-[150px] animate-pulse delay-700"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.05),transparent_50%)]"></div>
      </div>

      <div className="w-full max-w-[480px] relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-[#0D1117]/60 backdrop-blur-3xl border border-white/5 rounded-[40px] p-6 sm:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] relative overflow-hidden group">

          {/* Enhanced Progress Header */}
          <div className="flex items-center gap-3 mb-10">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step + 1 >= i ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5'}`}></div>
            ))}
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight italic mb-1.5">
              {step === 1 ? "Profile Picture" : step === 2 ? "Personal Details" : step === 3 ? "Origins" : "Pick Your Interests"}
            </h1>
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">
              Onboarding Phase {step + 1} of 5
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-in zoom-in-95">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
              <div className="relative group">
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-[32px] sm:rounded-[48px] bg-black border-4 border-white/5 overflow-hidden flex items-center justify-center transition-all group-hover:border-purple-500/50 shadow-2xl relative">
                  {formData.profilePic ? (
                    <img src={formData.profilePic} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Camera className="w-10 h-10 text-white" />
                      <p className="text-[8px] font-black uppercase tracking-widest text-white">No Image</p>
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
                      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 w-12 h-12 sm:w-14 sm:h-14 bg-white text-black rounded-[20px] sm:rounded-[24px] flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-2xl border-4 border-[#0D1117] z-30">
                  <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                  <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={uploading} />
                </label>
              </div>
              <p className="mt-8 text-[9px] text-gray-500 font-black uppercase tracking-widest leading-relaxed text-center">
                JPG, PNG OR WEBP<br />MAX SIZE 5MB
              </p>

              <button
                onClick={() => setStep(2)}
                className="w-full mt-8 py-4 sm:py-5 bg-white text-black font-black rounded-[20px] sm:rounded-[24px] uppercase tracking-widest text-[10px] sm:text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
              >
                {formData.profilePic ? "Continue" : "Skip"}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
              <InputField label="Full Name" value={formData.fullName} onChange={(val) => setFormData({ ...formData, fullName: val })} placeholder="Enter your full name" icon={<User className="w-4 h-4" />} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InputField label="Date of Birth" type="date" value={formData.dob} onChange={handleDobChange} placeholder="Date of birth" icon={<Calendar className="w-4 h-4" />} />

                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-4">Gender</label>
                  <div className="relative group">
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-[24px] px-6 py-4 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all text-xs font-bold appearance-none cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>
                </div>
              </div>

              {formData.dob && (
                <div className="px-6 py-3 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Age</span>
                  <span className="text-sm font-black text-purple-400">{formData.age} Years</span>
                </div>
              )}
              <div className="flex gap-4 mt-8 sm:mt-10">
                <button onClick={() => setStep(1)} className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] sm:rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95"><ChevronLeft className="w-6 h-6" /></button>
                <button onClick={() => setStep(3)} disabled={!formData.fullName || !formData.dob || formData.age < 18} className="flex-1 bg-white text-black font-black rounded-[20px] sm:rounded-[24px] uppercase tracking-widest text-[10px] sm:text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">Continue <ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
              <LocationAutocomplete value={formData.location} onChange={(val, lat, lng) => setFormData({ ...formData, location: val, lat, lng })} />
              <div className="space-y-2">
                <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-4">About You (Bio)</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Share your story..."
                  rows="4"
                  className="w-full bg-white/5 border border-white/10 text-white rounded-[28px] px-6 py-5 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all text-sm font-medium resize-none placeholder:text-gray-700 min-h-[140px]"
                />
              </div>

              <div className="flex gap-4 mt-8 sm:mt-10">
                <button onClick={() => setStep(2)} className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] sm:rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95"><ChevronLeft className="w-6 h-6" /></button>
                <button onClick={() => setStep(4)} disabled={!formData.location} className="flex-1 bg-white text-black font-black rounded-[20px] sm:rounded-[24px] uppercase tracking-widest text-[10px] sm:text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">Next<ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-wrap gap-2 mb-10 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                {commonInterests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => handleInterestToggle(interest)}
                    className={`px-5 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${formData.interests.includes(interest)
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-lg shadow-purple-600/20"
                        : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                      }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={() => setStep(3)} className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] sm:rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95"><ChevronLeft className="w-6 h-6" /></button>
                <button
                  onClick={handleSubmit}
                  disabled={formData.interests.length < 3 || loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black rounded-[20px] sm:rounded-[24px] uppercase tracking-widest text-[10px] sm:text-[11px] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-purple-600/20"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Complete Setup<Sparkles className="w-5 h-5 fill-current" /></>}
                </button>
              </div>
            </div>
          )}

        </div>

        <p className="text-center text-[8px] text-gray-800 font-black uppercase tracking-[0.4em] mt-10 leading-relaxed opacity-40">
          Universal Identity Layer v4.0<br />Ontlo Authentication Protocol
        </p>
      </div>
    </div>
  );
};

const InputField = ({ label, value, onChange, placeholder, type = "text", icon }) => (
  <div className="space-y-2">
    <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-4">{label}</label>
    <div className="relative group">
      {icon && <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-400 transition-colors">{icon}</div>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-white/5 border border-white/10 text-white rounded-[20px] sm:rounded-[24px] ${icon ? 'pl-12 sm:pl-14' : 'px-5 sm:px-6'} py-3.5 sm:py-4 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all text-xs sm:text-sm font-medium placeholder:text-gray-700`}
        placeholder={placeholder}
        required
      />
    </div>
  </div>
);


export default Onboarding;
