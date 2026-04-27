import { Settings, ShieldCheck, HelpCircle, LogOut, ChevronRight, User, Camera, Loader2, ChevronLeft, Check, X, MapPin, Calendar, Heart, MessageSquare } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import API_URL from "../utils/api";

const Profile = () => {
  const { user, setUser, socket } = useSocket();

  // Real-time support updates
  useEffect(() => {
    if (socket) {
      socket.on('support-update', fetchMyTickets);
      return () => socket.off('support-update');
    }
  }, [socket]);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(window.innerWidth > 768 ? "profile" : null);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    fullName: "",
    location: "",
    age: "",
    gender: "",
    bio: "",
    interests: []
  });

  const [settings, setSettings] = useState({
    emailNotifications: true,
    discoveryMode: true,
    stealthMode: false,
    language: 'en'
  });

  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketData, setTicketData] = useState({ subject: "", message: "" });
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Sync state when user loads
  useEffect(() => {
    if (user) {
      setEditData({
        fullName: user.fullName || "",
        location: user.location || "",
        age: user.age || "",
        gender: user.gender || "",
        bio: user.bio || "",
        interests: user.interests || []
      });

      if (user.settings) {
        setSettings(user.settings);
      }

      fetchMyTickets();
    }
  }, [user]);

  const fetchMyTickets = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/support/my-tickets`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setMyTickets(data);
    } catch (_) { }
  };

  const handleCreateTicket = async () => {
    setLoadingTickets(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/support/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(ticketData)
      });
      if (res.ok) {
        setTicketData({ subject: "", message: "" });
        setShowTicketForm(false);
        fetchMyTickets();
      }
    } catch (_) { } finally { setLoadingTickets(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/auth");
  };

  const handleToggleSetting = async (key) => {
    const newValue = !settings[key];
    const updatedSettings = { ...settings, [key]: newValue };

    // Optimistic UI update
    setSettings(updatedSettings);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/users/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ settings: { [key]: newValue } }),
      });

      if (response.ok) {
        const updatedUser = { ...user, settings: updatedSettings };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        // Rollback on error
        setSettings(settings);
      }
    } catch (err) {
      setSettings(settings);
      console.error("Settings error:", err);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/auth/complete-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        const result = await response.json();
        const updatedUser = { ...user, ...editData, isProfileComplete: true };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
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
      <div className="absolute top-0 left-0 w-64 h-64 bg-purple-600/5 blur-[100px] pointer-events-none"></div>

      {/* Sidebar */}
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

      {/* Main Content */}
      <div className={`flex-1 h-full bg-[#0B0E14] z-20 ${!activeTab && 'hidden md:flex'}`}>
        {activeTab ? (
          <div className="h-full flex flex-col w-full animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#1e293b]/30">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveTab(null)} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition"><ChevronLeft className="w-6 h-6" /></button>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  {activeTab === 'profile' && 'Profile Settings'}
                  {activeTab === 'settings' && 'Account Settings'}
                  {activeTab === 'safety' && 'Safety & Privacy'}
                  {activeTab === 'help' && 'Help Center'}
                </h2>
              </div>

              {activeTab === 'profile' && (
                <button
                  onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                  disabled={saving}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isEditing ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-purple-600/10 text-purple-400 border border-purple-500/20 hover:bg-purple-600 hover:text-white'}`}
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : isEditing ? <Check className="w-3 h-3" /> : null}
                  {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-10 max-w-4xl mx-auto w-full">
              {activeTab === "profile" && (
                <div className="space-y-6 sm:space-y-10">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <EditField
                      label="Full Name"
                      value={editData.fullName}
                      isEditing={isEditing}
                      onChange={(val) => setEditData({ ...editData, fullName: val })}
                      placeholder="Enter your name"
                    />
                    <EditField
                      label="Location"
                      value={editData.location}
                      isEditing={isEditing}
                      onChange={(val) => setEditData({ ...editData, location: val })}
                      placeholder="e.g. New York, USA"
                    />
                    <EditField
                      label="Age"
                      type="number"
                      value={editData.age}
                      isEditing={isEditing}
                      onChange={(val) => setEditData({ ...editData, age: val })}
                      placeholder="Your age"
                    />
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">Gender</label>
                      {isEditing ? (
                        <select
                          value={editData.gender}
                          onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                          className="w-full bg-[#151923] border border-[#1e293b] p-5 rounded-2xl text-white font-black uppercase tracking-tight focus:outline-none focus:border-purple-500/50 appearance-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      ) : (
                        <div className="bg-[#151923] border border-[#1e293b] p-5 rounded-2xl text-white font-black uppercase tracking-tight shadow-inner">{user?.gender || "Not set"}</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">Interests</label>
                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        ['Travel', 'Music', 'Gaming', 'Fitness', 'Art', 'Tech', 'Food', 'Movies'].map(tag => (
                          <button
                            key={tag}
                            onClick={() => {
                              const exists = editData.interests.includes(tag);
                              setEditData({
                                ...editData,
                                interests: exists ? editData.interests.filter(i => i !== tag) : [...editData.interests, tag]
                              });
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${editData.interests.includes(tag) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-[#151923] border-[#1e293b] text-gray-400'}`}
                          >
                            {tag}
                          </button>
                        ))
                      ) : (
                        user?.interests?.map(i => (
                          <span key={i} className="px-5 py-2 bg-[#151923] border border-[#1e293b] text-white rounded-xl text-xs font-black uppercase tracking-wider">{i}</span>
                        )) || <span className="text-gray-500 italic text-sm">No interests added</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">Bio</label>
                    {isEditing ? (
                      <textarea
                        value={editData.bio}
                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                        placeholder="Tell the world about yourself..."
                        className="w-full bg-[#151923] p-6 rounded-[32px] border border-[#1e293b] text-white text-sm leading-relaxed font-medium focus:outline-none focus:border-purple-500/50 min-h-[120px]"
                      />
                    ) : (
                      <div className="bg-[#151923] p-6 rounded-[32px] border border-[#1e293b] text-gray-300 text-sm leading-relaxed font-medium shadow-inner">
                        {user?.bio || "Tell the world about yourself..."}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6 sm:space-y-8">
                  <div className="grid grid-cols-1 gap-4">
                    <SettingItem
                      label="Email Notifications"
                      desc="Get alerts for new connections"
                      toggle
                      checked={settings.emailNotifications}
                      onToggle={() => handleToggleSetting('emailNotifications')}
                    />
                    <SettingItem
                      label="Discovery Mode"
                      desc="Appear in the matching queue"
                      toggle
                      checked={settings.discoveryMode}
                      onToggle={() => handleToggleSetting('discoveryMode')}
                    />
                    <SettingItem
                      label="Stealth Mode"
                      desc="Hide your online status"
                      toggle
                      checked={settings.stealthMode}
                      onToggle={() => handleToggleSetting('stealthMode')}
                    />
                    <SettingItem label="Language" desc={settings.language === 'en' ? 'English (US)' : 'Other'} />
                    <SettingItem label="Account Security" desc="Two-factor authentication" />
                  </div>
                </div>
              )}

              {activeTab === "safety" && showBlockedUsers && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setShowBlockedUsers(false)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition">
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Blocked Users</h3>
                  </div>

                  {loadingBlocked ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
                  ) : blockedUsers.length > 0 ? (
                    <div className="space-y-3">
                      {blockedUsers.map(u => (
                        <div key={u._id} className="flex items-center justify-between p-4 rounded-3xl bg-[#151923] border border-[#1e293b]">
                          <div className="flex items-center gap-3">
                            <img src={u.profilePic} className="w-10 h-10 rounded-full object-cover" alt="" />
                            <span className="text-sm font-black text-white">{u.username}</span>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem("token");
                                await fetch(`${API_URL}/api/users/unblock`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                                  body: JSON.stringify({ unblockUserId: u._id })
                                });
                                setBlockedUsers(blockedUsers.filter(user => user._id !== u._id));
                              } catch (_) { }
                            }}
                            className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 opacity-40">
                      <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p className="text-xs font-black uppercase tracking-widest">No blocked users</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "safety" && showGuidelines && (
                <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setShowGuidelines(false)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition">
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Reporting Guidelines</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <GuidelineItem 
                      title="Harassment & Bullying" 
                      content="Zero tolerance for stalking, persistent unwanted contact, or sexual harassment. Respect everyone's boundaries." 
                    />
                    <GuidelineItem 
                      title="Safety & Violence" 
                      content="Any threats of violence, self-harm, or promotion of illegal activities will result in an immediate permanent ban." 
                    />
                    <GuidelineItem 
                      title="Hate Speech" 
                      content="No discrimination based on race, religion, gender, or orientation. We are a platform for everyone." 
                    />
                    <GuidelineItem 
                      title="Privacy (Doxxing)" 
                      content="Never share another user's private information, social media, or phone number without their explicit consent." 
                    />
                    <GuidelineItem 
                      title="Spam & Scams" 
                      content="No commercial solicitation, fake profiles, or fraudulent activity. Be real, be authentic." 
                    />
                  </div>

                  <div className="p-6 rounded-3xl bg-purple-600/10 border border-purple-500/20">
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">How to report?</p>
                    <p className="text-gray-300 text-xs leading-relaxed font-medium">Use the "Report" button on any user's profile or chat window. Our admin team reviews all signals within 24 hours.</p>
                  </div>
                </div>
              )}

              {activeTab === "safety" && !showBlockedUsers && !showGuidelines && (
                <div className="text-center py-10">
                  <div className="w-24 h-24 rounded-[32px] bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-8 shadow-2xl">
                    <ShieldCheck className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tight italic">Safety Hub</h2>
                  <p className="text-gray-500 text-[10px] max-w-[200px] mx-auto mb-10 font-bold uppercase tracking-[0.2em] leading-relaxed opacity-60">Your secure community, protected by Ontlo AI & Moderation team.</p>
                  <div className="space-y-3 max-w-md mx-auto">
                    <button onClick={async () => {
                      setShowBlockedUsers(true);
                      setLoadingBlocked(true);
                      try {
                        const token = localStorage.getItem("token");
                        const res = await fetch(`${API_URL}/api/users/blocked/list`, {
                          headers: { "Authorization": `Bearer ${token}` }
                        });
                        const data = await res.json();
                        if (res.ok) setBlockedUsers(data);
                      } catch (_) { } finally { setLoadingBlocked(false); }
                    }} className="w-full p-5 rounded-3xl bg-[#151923] border border-[#1e293b] text-white font-black uppercase tracking-widest text-[10px] hover:border-purple-500/50 transition flex items-center justify-between">
                      <span>Blocked Users</span>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                    <button 
                      onClick={() => setShowGuidelines(true)}
                      className="w-full p-5 rounded-3xl bg-[#151923] border border-[#1e293b] text-white font-black uppercase tracking-widest text-[10px] hover:border-purple-500/50 transition flex items-center justify-between"
                    >
                      <span>Reporting Guidelines</span>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "help" && (
                <div className="space-y-6 sm:space-y-8">
                  {/* Support Header Moved to Top */}
                  <div className="p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-purple-600/20 to-blue-600/10 border border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-2xl font-black text-white mb-2 italic">Still need help?</h3>
                      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-6">Our 24/7 admin team is here for you</p>
                      <button
                        onClick={() => setShowTicketForm(!showTicketForm)}
                        className="px-6 py-3 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition shadow-lg"
                      >
                        {showTicketForm ? 'Cancel Request' : 'Write to Admin'}
                      </button>
                    </div>
                    <MessageSquare className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12" />
                  </div>

                  {showTicketForm && (
                    <div className="p-6 rounded-[32px] bg-[#151923] border border-purple-500/30 animate-in zoom-in-95 duration-200">
                      <h4 className="text-white font-black uppercase tracking-tighter mb-4">Submit a Problem</h4>
                      <div className="space-y-4">
                        <input
                          value={ticketData.subject}
                          onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
                          placeholder="Subject (e.g. Profile Issue)"
                          className="w-full bg-[#0B0E14] border border-[#1e293b] p-4 rounded-xl text-white text-xs font-bold uppercase tracking-tight focus:border-purple-500/50 outline-none"
                        />
                        <textarea
                          value={ticketData.message}
                          onChange={(e) => setTicketData({ ...ticketData, message: e.target.value })}
                          placeholder="Describe your problem..."
                          className="w-full bg-[#0B0E14] border border-[#1e293b] p-4 rounded-xl text-white text-xs font-bold focus:border-purple-500/50 outline-none min-h-[100px]"
                        />
                        <button
                          onClick={handleCreateTicket}
                          disabled={!ticketData.subject || !ticketData.message || loadingTickets}
                          className="w-full p-4 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 disabled:opacity-50 transition-all shadow-xl shadow-purple-600/20"
                        >
                          {loadingTickets ? 'Sending...' : 'Send Message'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Ticket Status Section */}
                  {myTickets.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">My Requests</h4>
                      <div className="space-y-3">
                        {myTickets.map(ticket => (
                          <div key={ticket._id} className="p-5 rounded-3xl bg-[#151923] border border-[#1e293b] hover:border-purple-500/30 transition-all group">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border ${ticket.status === 'resolved' ? 'text-green-500 border-green-500/20 bg-green-500/5' :
                                ticket.status === 'in-progress' ? 'text-blue-400 border-blue-400/20 bg-blue-400/5' :
                                  'text-amber-500 border-amber-500/20 bg-amber-500/5'
                                }`}>
                                {ticket.status}
                              </span>
                              <span className="text-[9px] text-gray-600 font-bold uppercase">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                            </div>
                            <h5 className="text-white font-black text-sm mb-1 uppercase tracking-tight">{ticket.subject}</h5>
                            <p className="text-gray-500 text-xs line-clamp-1">{ticket.message}</p>
                            {ticket.responses.length > 0 && (
                              <div className="mt-4 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10">
                                <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                  <ShieldCheck className="w-3 h-3" /> Admin Response
                                </p>
                                <p className="text-gray-300 text-xs italic">"{ticket.responses[ticket.responses.length - 1].message}"</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">Frequently Asked</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <FaqItem question="How does matching work?" answer="Our algorithm connects you with users based on your interests and location settings." />
                      <FaqItem question="Is my data secure?" answer="Yes, we use industry-standard encryption to protect all your personal information." />
                      <FaqItem question="How do I report someone?" answer="You can report any user directly from their profile or the chat window." />
                      <FaqItem question="What is Premium?" answer="Premium gives you unlimited discovery, special badges, and priority matching." />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 sm:p-12 bg-[#0B0E14] relative overflow-hidden">
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
  <button onClick={onClick} className={`flex items-center justify-between p-5 rounded-[24px] w-full transition-all group ${active ? "bg-[#151923] shadow-xl border border-[#1e293b]/50" : "hover:bg-[#151923]/40"}`}>
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-purple-600/10' : 'bg-[#0B0E14] group-hover:scale-110'}`}>{icon}</div>
      <span className={`font-black text-[10px] uppercase tracking-[0.2em] ${active ? "text-white" : "text-gray-500 group-hover:text-gray-300"}`}>{label}</span>
    </div>
    <ChevronRight className={`w-4 h-4 transition-all ${active ? 'text-white' : 'text-gray-700 group-hover:translate-x-1'}`} />
  </button>
);

const EditField = ({ label, value, isEditing, onChange, type = "text", placeholder }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">{label}</label>
    {isEditing ? (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#151923] border border-[#1e293b] p-5 rounded-2xl text-white font-black uppercase tracking-tight focus:outline-none focus:border-purple-500/50"
      />
    ) : (
      <div className="bg-[#151923] border border-[#1e293b] p-5 rounded-2xl text-white font-black uppercase tracking-tight shadow-inner">{value || "Not set"}</div>
    )}
  </div>
);

const SettingItem = ({ label, desc, toggle, checked, disabled, onToggle }) => (
  <div
    onClick={!disabled && onToggle ? onToggle : null}
    className={`flex items-center justify-between p-6 rounded-[32px] bg-[#151923]/40 border border-transparent hover:border-[#1e293b] transition-all group ${!disabled && onToggle ? 'cursor-pointer' : ''}`}
  >
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

const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-[#151923] border border-[#1e293b] rounded-2xl overflow-hidden transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-white/5 transition"
      >
        <span className="text-[11px] font-black text-white uppercase tracking-tight">{question}</span>
        <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-6 pt-2 pb-6 text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-relaxed bg-white/[0.01]">
          {answer}
        </div>
      )}
    </div>
  );
};

const GuidelineItem = ({ title, content }) => (
  <div className="p-5 rounded-3xl bg-[#151923] border border-[#1e293b] group hover:border-purple-500/30 transition-all">
    <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
      <div className="w-1 h-1 rounded-full bg-purple-500" /> {title}
    </h4>
    <p className="text-gray-500 text-xs leading-relaxed font-medium">{content}</p>
  </div>
);

export default Profile;
