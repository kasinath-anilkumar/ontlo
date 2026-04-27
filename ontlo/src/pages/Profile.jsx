import { Settings, ShieldCheck, HelpCircle, UserPlus, LogOut, Crown, ChevronRight, User, Mail, MapPin, Calendar, Heart, Camera, Loader2, Upload, ChevronLeft } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import API_URL from "../utils/api";

const Profile = () => {
  const { user, setUser } = useSocket();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(window.innerWidth > 768 ? "profile" : null); // null means show menu on mobile
  const [uploading, setUploading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/auth";
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
        const updateRes = await fetch(`${API_URL}/api/auth/complete-profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ profilePic: result.url }),
        });
        if (updateRes.ok) {
          const updatedUser = { ...user, profilePic: result.url };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-full bg-transparent overflow-hidden relative">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-600/5 blur-[100px] pointer-events-none"></div>

      {/* Sidebar / Menu List */}
      <div className={`w-full md:w-80 flex flex-col h-full bg-[#0B0E14] z-10 transition-all duration-300 ${activeTab && 'hidden md:flex'}`}>
        <div className="p-6 pb-4">
          <h1 className="text-3xl font-black text-white tracking-tight mb-8">Settings</h1>
          
          <div className="space-y-1">
            <TabButton active={activeTab === "profile"} onClick={() => setActiveTab("profile")} icon={<User className="w-5 h-5 text-purple-400" />} label="Edit Profile" />
            <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon={<Settings className="w-5 h-5 text-blue-400" />} label="Account Settings" />
            <TabButton active={activeTab === "safety"} onClick={() => setActiveTab("safety")} icon={<ShieldCheck className="w-5 h-5 text-green-400" />} label="Safety & Privacy" />
            <TabButton active={activeTab === "help"} onClick={() => setActiveTab("help")} icon={<HelpCircle className="w-5 h-5 text-orange-400" />} label="Help Center" />
          </div>

          <div className="mt-8 pt-6 border-t border-[#1e293b]/50">
             <button onClick={handleLogout} className="flex items-center justify-between w-full p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500/10 transition group">
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5" />
                  <span className="font-black uppercase tracking-widest text-[10px]">Logout</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 group-hover:translate-x-1 transition-transform" />
             </button>
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className={`flex-1 h-full bg-[#0B0E14] z-20 ${!activeTab && 'hidden md:flex'}`}>
        {activeTab ? (
          <div className="h-full flex flex-col w-full animate-in slide-in-from-right-4 duration-300">
            {/* Header for Mobile */}
            <div className="flex items-center gap-4 p-4 sm:p-6 border-b border-[#1e293b]/30">
               <button onClick={() => setActiveTab(null)} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition"><ChevronLeft className="w-6 h-6" /></button>
               <h2 className="text-xl font-black text-white uppercase tracking-tight">
                 {activeTab === 'profile' && 'Edit Profile'}
                 {activeTab === 'settings' && 'Account Settings'}
                 {activeTab === 'safety' && 'Safety & Privacy'}
                 {activeTab === 'help' && 'Help Center'}
               </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-4xl mx-auto w-full">
              {activeTab === "profile" && (
                <div className="space-y-10">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-full border-4 border-purple-500/20 overflow-hidden relative shadow-2xl">
                         <img src={user?.profilePic || "https://i.pravatar.cc/150"} className="w-full h-full object-cover" />
                         {uploading && (
                           <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                             <Loader2 className="w-8 h-8 text-white animate-spin" />
                           </div>
                         )}
                      </div>
                      <label className="absolute bottom-1 right-1 w-10 h-10 bg-white text-black rounded-full border-4 border-[#0B0E14] flex items-center justify-center cursor-pointer hover:scale-110 transition shadow-lg">
                        <Camera className="w-5 h-5" />
                        <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={uploading} />
                      </label>
                    </div>
                    <div className="text-center sm:text-left">
                      <h1 className="text-3xl font-black text-white mb-1 uppercase tracking-tighter">{user?.fullName || user?.username}</h1>
                      <p className="text-purple-400 font-bold uppercase tracking-[0.2em] text-[10px]">@{user?.username}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InfoField label="Full Name" value={user?.fullName || "Not set"} />
                    <InfoField label="Location" value={user?.location || "Not set"} />
                    <InfoField label="Age" value={user?.age || "Not set"} />
                    <InfoField label="Gender" value={user?.gender || "Not set"} />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">Interests</label>
                    <div className="flex flex-wrap gap-2">
                      {user?.interests?.map(i => (
                        <span key={i} className="px-5 py-2 bg-[#151923] border border-[#1e293b] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:border-purple-500/50 transition-colors">{i}</span>
                      )) || <span className="text-gray-500 italic text-sm">No interests added</span>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">Bio</label>
                    <div className="bg-[#151923] p-6 rounded-[32px] border border-[#1e293b] text-gray-300 text-sm leading-relaxed font-medium shadow-inner">
                      {user?.bio || "Tell the world about yourself..."}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-8">
                   <div className="grid grid-cols-1 gap-4">
                     <SettingItem label="Email Notifications" desc="Get alerts for new connections" toggle />
                     <SettingItem label="Discovery Mode" desc="Appear in the matching queue" toggle checked />
                     <SettingItem label="Stealth Mode" desc="Hide your online status" toggle />
                     <SettingItem label="Language" desc="English (US)" />
                     <SettingItem label="Account Security" desc="Two-factor authentication" />
                   </div>
                </div>
              )}

              {activeTab === "safety" && (
                <div className="text-center py-10">
                  <div className="w-24 h-24 rounded-[32px] bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-8 shadow-2xl">
                    <ShieldCheck className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Safety Center</h2>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto mb-10 font-medium uppercase tracking-widest leading-loose">Your security is our top priority. Manage your blocked list and privacy settings here.</p>
                  <div className="space-y-3 max-w-md mx-auto">
                     <button className="w-full p-5 rounded-3xl bg-[#151923] border border-[#1e293b] text-white font-black uppercase tracking-widest text-[10px] hover:border-purple-500/50 transition flex items-center justify-between">
                       <span>Blocked Users</span>
                       <ChevronRight className="w-4 h-4 text-gray-600" />
                     </button>
                     <button className="w-full p-5 rounded-3xl bg-[#151923] border border-[#1e293b] text-white font-black uppercase tracking-widest text-[10px] hover:border-purple-500/50 transition flex items-center justify-between">
                       <span>Privacy Policy</span>
                       <ChevronRight className="w-4 h-4 text-gray-600" />
                     </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#0B0E14] relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.03),transparent_70%)]"></div>
             <User className="w-20 h-20 text-gray-800 mb-6 opacity-20" />
             <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter opacity-40">Select a Setting</h2>
          </div>
        )}
      </div>

    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center justify-between p-5 rounded-[24px] w-full transition-all group ${active ? "bg-[#151923] shadow-xl border border-[#1e293b]/50" : "hover:bg-[#151923]/40"}`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-purple-600/10' : 'bg-[#0B0E14] group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className={`font-black text-[10px] uppercase tracking-[0.2em] ${active ? "text-white" : "text-gray-500 group-hover:text-gray-300"}`}>{label}</span>
    </div>
    <ChevronRight className={`w-4 h-4 transition-all ${active ? 'text-white' : 'text-gray-700 group-hover:translate-x-1'}`} />
  </button>
);

const InfoField = ({ label, value }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">{label}</label>
    <div className="bg-[#151923] border border-[#1e293b] p-5 rounded-2xl text-white font-black uppercase tracking-tight shadow-inner">{value}</div>
  </div>
);

const SettingItem = ({ label, desc, toggle, checked, disabled }) => (
  <div className="flex items-center justify-between p-6 rounded-[32px] bg-[#151923]/40 border border-transparent hover:border-[#1e293b] transition-all group">
    <div>
      <h4 className="text-white font-black uppercase tracking-tight text-sm mb-1">{label}</h4>
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{desc}</p>
    </div>
    {toggle ? (
      <div className={`w-12 h-7 rounded-full relative transition-all duration-300 ${checked ? "bg-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.3)]" : "bg-gray-800"} ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}>
        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${checked ? "right-1" : "left-1"}`}></div>
      </div>
    ) : (
      <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white transition-all transform group-hover:translate-x-1" />
    )}
  </div>
);

export default Profile;
