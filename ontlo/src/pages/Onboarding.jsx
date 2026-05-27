import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, User, Sparkles, Upload, Loader2, ChevronRight, ChevronLeft, Globe, Calendar, MapPin, Briefcase, GraduationCap, X, Plus, Zap, ShieldCheck, Video } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import API_URL, { apiFetch } from "../utils/api";
import LocationAutocomplete from "../components/common/LocationAutocomplete";
import logo from "/ontlo_Logo.webp";

const ALL_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Russian",
  "Chinese",
  "Japanese",
  "Korean",
  "Hindi",
  "Arabic",
  "Bengali",
  "Urdu",
  "Indonesian",
  "Turkish",
  "Vietnamese",
  "Tamil",
  "Telugu",
  "Marathi",
  "Gujarati",
  "Malayalam",
  "Kannada",
  "Punjabi",
  "Dutch",
  "Greek",
  "Polish",
  "Swedish",
  "Danish",
  "Finnish",
  "Norwegian",
  "Czech",
  "Hungarian",
  "Thai",
  "Ukrainian",
  "Hebrew",
  "Persian",
  "Malay",
  "Swahili",
  "Tagalog",

  // Additional popular languages
  "Sinhala",
  "Nepali",
  "Romanian",
  "Serbian",
  "Croatian",
  "Bulgarian",
  "Slovak",
  "Slovenian",
  "Lithuanian",
  "Latvian",
  "Estonian",
  "Afrikaans",
  "Icelandic",
  "Irish",
  "Welsh",
  "Catalan"
];

const ALL_INTERESTS = [
  "Travel",
  "Music",
  "Gaming",
  "Art",
  "Movies",
  "Tech",
  "Cooking",
  "Fitness",
  "Photography",
  "Reading",
  "Fashion",
  "Sports",
  "Writing",
  "Dancing",
  "Yoga",
  "Hiking",
  "Coding",
  "Design",
  "Anime",
  "Crypto",
  "AI",
  "Startup",
  "Finance",
  "Food",
  "Coffee",
  "Astronomy",
  "History",
  "Philosophy",
  "Psychology",
  "Volunteering",
  "Skateboarding",
  "Surfing",
  "Gardening",
  "Pets",
  "Meditation",
  "Board Games",
  "Theater",
  "Architecture",
  "Automotive",
  "Nature",

  // Modern additions
  "Content Creation",
  "Podcasts",
  "UI/UX",
  "Machine Learning",
  "Cybersecurity",
  "Space",
  "Streetwear",
  "K-Pop",
  "Manga",
  "Self Improvement",
  "Entrepreneurship",
  "Investing",
  "Minimalism",
  "Digital Art",
  "Videography",
  "Football",
  "Basketball",
  "Cars",
  "Motorcycles",
  "Camping",
  "Nightlife",
  "Memes",
  "Streaming",
  "Esports"
];

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
    profilePic: "",
    occupation: "",
    education: "",
    languages: ["English"]
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [langQuery, setLangQuery] = useState("");
  const [interestQuery, setInterestQuery] = useState("");
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

  const handleLanguageToggle = (lang) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
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
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);

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

  return (
    <div className="h-screen w-full bg-[#05070A] text-white flex flex-col lg:flex-row relative overflow-hidden font-sans select-none">
      
      {/* Dynamic Background Elements - Shared */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="hidden md:block absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] md:animate-pulse"></div>
        <div className="hidden md:block absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/10 rounded-full blur-[120px] md:animate-pulse delay-1000"></div>
        <div className="hidden md:block absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.03),transparent_70%)]"></div>
      </div>

      {/* LEFT SECTION - Branding (Desktop Only) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-12 xl:px-20 relative z-10">
        <div className="max-w-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <img src={logo} alt="Logo" className="w-10 h-10" />
            </div>
            <div className="h-6 w-px bg-white/10"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Beyond your Circle</span>
          </div>

          <h1 className="text-5xl xl:text-6xl font-black mb-4 leading-tight tracking-tighter uppercase italic">
            Start From Here.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x">Find Your Peoples</span>
            <br />
          </h1>

          <p className="text-gray-400 text-base mb-8 leading-relaxed font-medium max-w-md">
            Just a simple way to connect and be you. That’s it.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <FeatureCard icon={<Zap className="w-4 h-4 text-yellow-400" />} title="Instant" desc="no more waiting" />
            <FeatureCard icon={<ShieldCheck className="w-4 h-4 text-green-400" />} title="Secure" desc="Your safety is our priority" />
            <FeatureCard icon={<Globe className="w-4 h-4 text-blue-400" />} title="Global" desc="Meet people around the world" />
            <FeatureCard icon={<Video className="w-4 h-4 text-purple-400" />} title="Video Call" desc="Not some photos" />
          </div>
        </div>
      </div>

      {/* RIGHT SECTION - Onboarding Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10 lg:bg-white/[0.01] lg:backdrop-blur-sm lg:border-l lg:border-white/5">
        <div className="w-full max-w-[460px] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-700 my-auto">
          
          {/* Mobile Logo in natural flow */}
          <div className="flex items-center justify-center gap-3 mb-6 lg:hidden">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <img src={logo} alt="Logo" className="w-8 h-8 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
            </div>
          </div>

          <div className="w-full relative overflow-hidden group py-4">

          {/* Enhanced Progress Header */}
          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-10">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step + 1 >= i ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5'}`}></div>
            ))}
          </div>

          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight italic mb-1.5">
              {step === 1 ? "Profile Picture" : step === 2 ? "Personal Details" : step === 3 ? "Origins" : "Pick Your Interests"}
            </h1>
            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">
              Onboarding Phase {step + 1} of 5
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-in zoom-in-95">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-4 duration-500 my-2 overflow-visible pb-2">
              <div className="my-auto flex flex-col items-center justify-center py-4">
                <div className="relative group">
                  <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-[32px] sm:rounded-[48px] bg-black border-4 border-white/5 overflow-hidden flex items-center justify-center transition-all group-hover:border-purple-500/50 shadow-2xl relative">
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
                <p className="mt-6 text-[9px] text-gray-500 font-black uppercase tracking-widest leading-relaxed text-center">
                  JPG, PNG OR WEBP<br />MAX SIZE 5MB
                </p>
              </div>

              <div className="pt-4 mt-auto pb-1">
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-4 sm:py-5 bg-white text-black font-black rounded-[20px] sm:rounded-[24px] uppercase tracking-widest text-[10px] sm:text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5"
                >
                  {formData.profilePic ? "Continue" : "Skip"}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-500 my-2 overflow-visible">
              <div className="space-y-4 sm:space-y-6 my-auto py-2 overflow-y-auto custom-scrollbar pr-1 max-h-[55vh]">
                <InputField label="Full Name" value={formData.fullName} onChange={(val) => setFormData({ ...formData, fullName: val })} placeholder="Enter your full name" icon={<User className="w-4 h-4" />} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <InputField label="Date of Birth" type="date" value={formData.dob} onChange={handleDobChange} placeholder="Date of birth" icon={<Calendar className="w-4 h-4" />} />

                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-4">Gender</label>
                    <div className="relative group">
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-[24px] px-6 py-3.5 sm:py-4 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all text-xs font-bold appearance-none cursor-pointer"
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
              </div>

              <div className="space-y-3 pt-4 mt-auto">
                {(!formData.fullName || !formData.dob || formData.age < 18) && (
                  <div className="text-[10px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl text-center flex items-center justify-center gap-2 animate-in fade-in">
                    <span>⚠️</span>
                    <span>
                      {!formData.fullName ? "Please enter your full name" : !formData.dob ? "Please select your date of birth" : "You must be at least 18 years old to join"}
                    </span>
                  </div>
                )}
                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] sm:rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95 flex-shrink-0"><ChevronLeft className="w-6 h-6" /></button>
                  <button onClick={() => setStep(3)} disabled={!formData.fullName || !formData.dob || formData.age < 18} className="flex-1 bg-white text-black font-black rounded-[20px] sm:rounded-[24px] uppercase tracking-widest text-[10px] sm:text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">Continue <ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-500 my-2 overflow-visible">
              <div className="space-y-4 sm:space-y-6 my-auto py-2 overflow-y-auto custom-scrollbar pr-1 max-h-[55vh]">
                <LocationAutocomplete value={formData.location} onChange={(val, lat, lng) => setFormData({ ...formData, location: val, lat, lng })} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <InputField label="Occupation / Job" value={formData.occupation} onChange={(val) => setFormData({ ...formData, occupation: val })} placeholder="e.g. Entrepreneur, Engineer" icon={<Briefcase className="w-4 h-4" />} />
                  <InputField label="Education / School" value={formData.education} onChange={(val) => setFormData({ ...formData, education: val })} placeholder="e.g. Stanford University" icon={<GraduationCap className="w-4 h-4" />} />
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-4">About You (Bio)</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Share your story..."
                    rows="3"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-[28px] px-6 py-4 sm:py-5 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all text-sm font-medium resize-none placeholder:text-gray-700 min-h-[90px] sm:min-h-[140px]"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 mt-auto">
                {!formData.location && (
                  <div className="text-[10px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl text-center flex items-center justify-center gap-2 animate-in fade-in">
                    <span>⚠️</span>
                    <span>Please search and select your location from the suggestions</span>
                  </div>
                )}
                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] sm:rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95 flex-shrink-0"><ChevronLeft className="w-6 h-6" /></button>
                  <button onClick={() => setStep(4)} disabled={!formData.location} className="flex-1 bg-white text-black font-black rounded-[20px] sm:rounded-[24px] uppercase tracking-widest text-[10px] sm:text-[11px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3">Next<ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-500 my-2 overflow-visible">
              <div className="space-y-5 my-auto py-2 overflow-y-auto custom-scrollbar pr-1 max-h-[55vh]">
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-4">Languages Spoken</label>
                  
                  {/* Selected languages pills */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.languages?.map((lang) => (
                      <span
                        key={lang}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 border border-purple-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-purple-600/20 flex items-center gap-1.5 animate-in zoom-in-95"
                      >
                        {lang}
                        <button type="button" onClick={() => handleLanguageToggle(lang)} className="hover:bg-black/20 rounded-full p-0.5 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Autocomplete input */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={langQuery}
                      onChange={(e) => setLangQuery(e.target.value)}
                      placeholder="Type a language (e.g. Spanish, Arabic)..."
                      className="w-full bg-white/5 border border-white/10 text-white rounded-[20px] pl-10 pr-4 py-3 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all text-xs font-semibold placeholder:text-gray-600"
                    />
                    {langQuery.trim() && (
                      <div className="absolute left-0 right-0 bottom-full mb-2 bg-[#0D1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-40 overflow-y-auto custom-scrollbar">
                        {ALL_LANGUAGES.filter(l => l.toLowerCase().includes(langQuery.toLowerCase()) && !formData.languages?.includes(l)).length > 0 ? (
                          ALL_LANGUAGES.filter(l => l.toLowerCase().includes(langQuery.toLowerCase()) && !formData.languages?.includes(l)).map(lang => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => {
                                handleLanguageToggle(lang);
                                setLangQuery("");
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-white hover:bg-purple-600/20 hover:text-purple-400 transition-colors flex items-center justify-between border-b border-white/5 last:border-none"
                            >
                              <span>{lang}</span>
                              <Plus className="w-3.5 h-3.5 text-purple-400" />
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-xs text-gray-500 italic text-center font-medium">No languages found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-4">Interests & Hobbies</label>
                  
                  {/* Selected interests pills */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.interests?.map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-purple-600/20 flex items-center gap-1.5 animate-in zoom-in-95"
                      >
                        {interest}
                        <button type="button" onClick={() => handleInterestToggle(interest)} className="hover:bg-black/20 rounded-full p-0.5 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Autocomplete input */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={interestQuery}
                      onChange={(e) => setInterestQuery(e.target.value)}
                      placeholder="Type an interest (e.g. AI, Crypto, Hiking)..."
                      className="w-full bg-white/5 border border-white/10 text-white rounded-[20px] pl-10 pr-4 py-3 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all text-xs font-semibold placeholder:text-gray-600"
                    />
                    {interestQuery.trim() && (
                      <div className="absolute left-0 right-0 bottom-full mb-2 bg-[#0D1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-40 overflow-y-auto custom-scrollbar">
                        {ALL_INTERESTS.filter(i => i.toLowerCase().includes(interestQuery.toLowerCase()) && !formData.interests?.includes(i)).length > 0 ? (
                          ALL_INTERESTS.filter(i => i.toLowerCase().includes(interestQuery.toLowerCase()) && !formData.interests?.includes(i)).map(interest => (
                            <button
                              key={interest}
                              type="button"
                              onClick={() => {
                                handleInterestToggle(interest);
                                setInterestQuery("");
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-white hover:bg-purple-600/20 hover:text-purple-400 transition-colors flex items-center justify-between border-b border-white/5 last:border-none"
                            >
                              <span>{interest}</span>
                              <Plus className="w-3.5 h-3.5 text-purple-400" />
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-xs text-gray-500 italic text-center font-medium">No interests found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 mt-auto border-t border-white/5">
                {formData.interests.length < 3 && (
                  <div className="text-[10px] font-bold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl text-center flex items-center justify-center gap-2 animate-in fade-in">
                    <span>⚠️</span>
                    <span>Please select at least {3 - formData.interests.length} more interest(s) to continue</span>
                  </div>
                )}
                <div className="flex gap-4">
                  <button onClick={() => setStep(3)} className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] sm:rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95 flex-shrink-0"><ChevronLeft className="w-6 h-6" /></button>
                  <button
                    onClick={handleSubmit}
                    disabled={formData.interests.length < 3 || loading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black rounded-[20px] sm:rounded-[24px] uppercase tracking-widest text-[10px] sm:text-[11px] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-purple-600/20"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Complete Setup</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="p-4 rounded-[24px] bg-white/5 border border-white/5 backdrop-blur-xl hover:border-white/10 transition-all group">
    <div className="mb-2">{icon}</div>
    <h3 className="text-xs font-black uppercase tracking-widest text-white mb-0.5">{title}</h3>
    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{desc}</p>
  </div>
);

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
