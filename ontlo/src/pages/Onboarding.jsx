import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, User, Sparkles, Upload, Loader2 } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import API_URL from "../utils/api";

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    dob: "",
    gender: "",
    location: "",
    interests: [],
    bio: "",
    profilePic: ""
  });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, setUser } = useSocket();

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest) 
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const data = new FormData();
    data.append("image", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/upload/profile-pic`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: data
      });

      const result = await response.json();
      if (response.ok) {
        setFormData({ ...formData, profilePic: result.url });
      } else {
        alert(result.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to connect to upload server");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/auth/complete-profile`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save profile");

      const updatedUser = { ...user, ...data.user, isProfileComplete: true };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      navigate("/");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const commonInterests = ["Travel", "Music", "Gaming", "Art", "Movies", "Tech", "Cooking", "Fitness", "Photography", "Reading"];

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[10%] -left-[5%] w-[40%] h-[40%] bg-pink-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-xl bg-[#151923]/80 backdrop-blur-2xl border border-[#1e293b] rounded-[40px] p-8 md:p-12 shadow-2xl relative z-10">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-10">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-[#1e293b]"}`}></div>
          ))}
        </div>

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
            <h1 className="text-3xl font-black text-white mb-2">Show your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Face</span></h1>
            <p className="text-gray-400 mb-8">Upload a photo to your Cloudinary profile.</p>
            
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-40 h-40 rounded-full border-4 border-[#1e293b] bg-[#0B0E14] overflow-hidden flex items-center justify-center transition group-hover:border-purple-500/50 relative">
                  {formData.profilePic ? (
                    <img src={formData.profilePic} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-12 h-12 text-gray-600" />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-1 right-1 w-10 h-10 bg-purple-600 rounded-full border-4 border-[#151923] flex items-center justify-center text-white cursor-pointer hover:bg-purple-700 transition">
                  <Upload className="w-5 h-5" />
                  <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={uploading} />
                </label>
              </div>
              <p className="mt-4 text-xs text-gray-500">{uploading ? "Uploading to Cloudinary..." : "JPG, PNG or WEBP (Max 5MB)"}</p>
            </div>
            
            <button 
              onClick={() => setStep(2)}
              disabled={uploading}
              className="w-full mt-10 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 transition disabled:opacity-50"
            >
              {formData.profilePic ? "Continue" : "Skip for now"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h1 className="text-3xl font-black text-white mb-2">Build your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Identity</span></h1>
            <p className="text-gray-400 mb-8">Tell us the basics to start matching.</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="text" 
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    placeholder="Enter your name"
                    className="w-full bg-[#0B0E14] border border-[#1e293b] text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block ml-1">Age</label>
                  <input 
                    type="number" 
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    placeholder="25"
                    className="w-full bg-[#0B0E14] border border-[#1e293b] text-white rounded-2xl px-4 py-4 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block ml-1">Gender</label>
                  <select 
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="w-full bg-[#0B0E14] border border-[#1e293b] text-white rounded-2xl px-4 py-4 focus:outline-none focus:border-purple-500 transition-colors appearance-none"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 mt-10">
              <button onClick={() => setStep(1)} className="flex-1 border border-[#1e293b] text-white font-bold py-4 rounded-2xl hover:bg-[#1e293b] transition">Back</button>
              <button onClick={() => setStep(3)} disabled={!formData.fullName || !formData.age} className="flex-1 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 transition disabled:opacity-50">Continue</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h1 className="text-3xl font-black text-white mb-2">Where are you <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">from?</span></h1>
            <p className="text-gray-400 mb-8">Help us find people near you.</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block ml-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="text" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="City, Country"
                    className="w-full bg-[#0B0E14] border border-[#1e293b] text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block ml-1">About You (Bio)</label>
                <textarea 
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Share a bit about yourself..."
                  rows="4"
                  className="w-full bg-[#0B0E14] border border-[#1e293b] text-white rounded-2xl px-4 py-4 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                ></textarea>
              </div>
            </div>
            
            <div className="flex gap-4 mt-10">
              <button onClick={() => setStep(2)} className="flex-1 border border-[#1e293b] text-white font-bold py-4 rounded-2xl hover:bg-[#1e293b] transition">Back</button>
              <button onClick={() => setStep(4)} disabled={!formData.location} className="flex-1 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 transition disabled:opacity-50">Next</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h1 className="text-3xl font-black text-white mb-2">What <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Excites</span> you?</h1>
            <p className="text-gray-400 mb-8">Choose at least 3 interests.</p>
            
            <div className="flex flex-wrap gap-2 mb-10">
              {commonInterests.map((interest) => (
                <button
                  key={interest}
                  onClick={() => handleInterestToggle(interest)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border ${
                    formData.interests.includes(interest)
                      ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white border-transparent shadow-lg shadow-purple-600/20"
                      : "bg-[#0B0E14] border-[#1e293b] text-gray-400 hover:text-white"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => setStep(3)} className="flex-1 border border-[#1e293b] text-white font-bold py-4 rounded-2xl hover:bg-[#1e293b] transition">Back</button>
              <button 
                onClick={handleSubmit} 
                disabled={formData.interests.length < 3 || loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black py-4 rounded-2xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Saving..." : <>Finish Setup <Sparkles className="w-5 h-5 fill-current" /></>}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Onboarding;
