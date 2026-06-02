import { Camera, Check, ChevronLeft, ChevronRight, HelpCircle, Loader2, LogOut, MessageSquare, Settings as SettingsIcon, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import API_URL, { apiFetch } from "../utils/api";
import LocationAutocomplete from "../components/common/LocationAutocomplete";

const Settings = () => {
  const { user, setUser, socket } = useSocket();
  const navigate = useNavigate();

  // Real-time support updates
  useEffect(() => {
    if (socket) {
      socket.on('support-update', fetchMyTickets);
      return () => socket.off('support-update');
    }
  }, [socket]);

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
    dob: "",
    age: "",
    gender: "",
    bio: "",
    locationCoordinates: { type: "Point", coordinates: [0, 0] },
    occupation: "",
    education: ""
  });

  const [settings, setSettings] = useState({
    emailNotifications: true,
    discoveryMode: true,
    stealthMode: false,
    language: 'en'
  });
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [savingLowBandwidth, setSavingLowBandwidth] = useState(false);

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
        dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : "",
        age: user.age || "",
        gender: user.gender || "",
        bio: user.bio || "",
        locationCoordinates: user.locationCoordinates || { type: "Point", coordinates: [0, 0] },
        occupation: user.occupation || "",
        education: user.education || ""
      });

      if (user.settings) {
        setSettings(user.settings);
      }

      setLowBandwidth(Boolean(user.lowBandwidth));

      fetchMyTickets();
    }
  }, [user]);

  const fetchMyTickets = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`${API_URL}/api/support/my-tickets`, {
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
      const res = await apiFetch(`${API_URL}/api/support/create`, {
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
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/auth");
  };

  const handleToggleLowBandwidth = async () => {
    const newValue = !lowBandwidth;
    setLowBandwidth(newValue);
    setSavingLowBandwidth(true);
    try {
      const token = localStorage.getItem("token");
      const response = await apiFetch(`${API_URL}/api/users/profile/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lowBandwidth: newValue }),
      });
      if (response.ok) {
        const data = await response.json();
        const updatedUser = { ...user, ...data };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setLowBandwidth(Boolean(updatedUser.lowBandwidth));
      } else {
        setLowBandwidth(!newValue);
      }
    } catch {
      setLowBandwidth(!newValue);
    } finally {
      setSavingLowBandwidth(false);
    }
  };

  const handleToggleSetting = async (key) => {
    const newValue = !settings[key];
    const updatedSettings = { ...settings, [key]: newValue };

    // Optimistic UI update
    setSettings(updatedSettings);

    try {
      const token = localStorage.getItem("token");
      const response = await apiFetch(`${API_URL}/api/users/settings`, {
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
      const response = await apiFetch(`${API_URL}/api/users/profile/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        const mergedUser = { ...user, ...updatedUser };
        localStorage.setItem("user", JSON.stringify(mergedUser));
        setUser(mergedUser);
        setIsEditing(false);
      } else {
        const errorData = await response.json().catch(() => null);
        console.error("Save profile failed", errorData);
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
      const response = await apiFetch(`${API_URL}/api/upload/profile-pic`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: data
      });
      const result = await response.json();
      if (response.ok) {
        const updateRes = await apiFetch(`${API_URL}/api/users/profile/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ profilePic: result.url }),
        });
        if (updateRes.ok) {
          const updatedUser = await updateRes.json();
          const mergedUser = { ...user, ...updatedUser };
          localStorage.setItem("user", JSON.stringify(mergedUser));
          setUser(mergedUser);
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
        <div className="p-4 sm:p-6 pb-4">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/profile")} className="p-2 -ml-2 text-gray-400 hover:text-white transition">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Settings</h1>
            </div>
            {/* <button
              onClick={() => navigate("/create-post")}
              className="w-10 h-10 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-purple-400 hover:text-purple-300 transition-all shadow-lg"
              title="Create Post"
            >
              <Plus size={20} />
            </button> */}
          </div>
          <div className="space-y-1">
            <TabButton active={activeTab === "profile"} onClick={() => setActiveTab("profile")} icon={<User className="w-5 h-5 text-purple-400" />} label="Edit Profile" />
            <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon={<SettingsIcon className="w-5 h-5 text-blue-400" />} label="Account Settings" />
            <TabButton active={activeTab === "safety"} onClick={() => setActiveTab("safety")} icon={<ShieldCheck className="w-5 h-5 text-green-400" />} label="Safety & Privacy" />
            <TabButton active={activeTab === "help"} onClick={() => setActiveTab("help")} icon={<HelpCircle className="w-5 h-5 text-orange-400" />} label="Help Center" />
            <TabButton active={activeTab === "Terms & Conditions"} onClick={() => setActiveTab("Terms & Conditions")} icon={<ShieldCheck className="w-5 h-5 text-blue-400" />} label="Terms & Conditions" />
            <TabButton active={activeTab === "Privacy Policy"} onClick={() => setActiveTab("Privacy Policy")} icon={<ShieldCheck className="w-5 h-5 text-blue-400" />} label="Privacy Policy" />
          </div>
          <div className="pt-2 border-t border-[#1e293b]/50">
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
            <div className="sticky top-0 z-40 bg-[#0B0E14]/90 backdrop-blur-xl flex items-center justify-between p-4 sm:p-6 border-b border-[#1e293b]/30">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveTab(null)} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition"><ChevronLeft className="w-6 h-6" /></button>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  {activeTab === 'profile' && 'Profile Settings'}
                  {activeTab === 'settings' && 'Account Settings'}
                  {activeTab === 'safety' && 'Safety & Privacy'}
                  {activeTab === 'help' && 'Help Center'}
                  {activeTab === 'Terms & Conditions' && 'Terms & Conditions'}
                  {activeTab === 'Privacy Policy' && 'Privacy Policy'}
                </h2>
              </div>

              {activeTab === 'profile' && (
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        if (user) {
                          setEditData({
                            fullName: user.fullName || "",
                            location: user.location || "",
                            dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : "",
                            age: user.age || "",
                            gender: user.gender || "",
                            bio: user.bio || "",
                            locationCoordinates: user.locationCoordinates || { type: "Point", coordinates: [0, 0] },
                            occupation: user.occupation || "",
                            education: user.education || ""
                          });
                        }
                      }}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-all border border-gray-700/50"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                    disabled={saving}
                    className={`px-4 py-2 rounded-xl text-[10px] transition-all flex items-center gap-2 ${isEditing ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-purple-600/10 text-purple-400 border border-purple-500/20 hover:bg-purple-600 hover:text-white'}`}
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : isEditing ? <Check className="w-3 h-3" /> : null}
                    {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full scrollbar-hide">
              {activeTab === "profile" && (
                <div className="space-y-4 pb-6">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-full border-2 border-purple-500/20 overflow-hidden relative shadow-xl">
                        {user?.profilePic ? (
                          <img src={user.profilePic} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#151923] flex items-center justify-center">
                            <User className="w-10 h-10 text-gray-600" />
                          </div>
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      {isEditing && (
                        <label className="absolute bottom-1 right-1 w-9 h-9 bg-white text-black rounded-full border-2 border-[#0B0E14] flex items-center justify-center cursor-pointer hover:scale-110 transition shadow-lg">
                          <Camera className="w-4 h-4" />
                          <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={uploading} />
                        </label>
                      )}
                    </div>
                    <div className="text-center sm:text-left">
                      <h1 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">{user?.fullName || user?.username}</h1>
                      <p className="text-purple-400 font-semibold uppercase tracking-[0.25em] text-[10px]">@{user?.username}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <EditField
                      label="Full Name"
                      value={editData.fullName}
                      isEditing={isEditing}
                      onChange={(val) => setEditData({ ...editData, fullName: val })}
                      placeholder="Enter your name"
                    />
                    <LocationAutocomplete
                      label="Location"
                      value={editData.location}
                      isEditing={isEditing}
                      onChange={(val, lat, lng) => {
                        const updates = { ...editData, location: val };
                        if (lat !== null && lng !== null) {
                          updates.locationCoordinates = {
                            type: "Point",
                            coordinates: [lng, lat]
                          };
                        }
                        setEditData(updates);
                      }}
                      placeholder="e.g. New York, USA"
                    />
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] ml-1">Date of Birth</label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editData.dob}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const birth = new Date(val);
                              const today = new Date();
                              let calculatedAge = today.getFullYear() - birth.getFullYear();
                              const month = today.getMonth() - birth.getMonth();
                              if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
                                calculatedAge--;
                              }
                              setEditData({ ...editData, dob: val, age: calculatedAge });
                            } else {
                              setEditData({ ...editData, dob: val });
                            }
                          }}
                          className="w-full bg-[#151923] border border-[#1e293b] p-3 rounded-2xl text-white font-semibold uppercase tracking-tight text-sm focus:outline-none focus:border-purple-500/50"
                        />
                      ) : (
                        <div className="bg-[#151923] border border-[#1e293b] p-3 rounded-2xl text-white font-semibold uppercase tracking-tight text-sm shadow-inner">
                          {user?.dob ? new Date(user.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : (user?.age ? `${user.age} years old` : "Not set")}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] ml-1">Gender</label>
                      {isEditing ? (
                        <select
                          value={editData.gender}
                          onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                          className="w-full bg-[#151923] border border-[#1e293b] p-3 rounded-2xl text-white font-semibold uppercase tracking-tight text-sm focus:outline-none focus:border-purple-500/50 appearance-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      ) : (
                        <div className="bg-[#151923] border border-[#1e293b] p-3 rounded-2xl text-white font-semibold uppercase tracking-tight text-sm shadow-inner">{user?.gender || "Not set"}</div>
                      )}
                    </div>
                    <EditField
                      label="Occupation / Job"
                      value={editData.occupation}
                      isEditing={isEditing}
                      onChange={(val) => setEditData({ ...editData, occupation: val })}
                      placeholder="e.g. Entrepreneur, Engineer"
                    />
                    <EditField
                      label="Education / School"
                      value={editData.education}
                      isEditing={isEditing}
                      onChange={(val) => setEditData({ ...editData, education: val })}
                      placeholder="e.g. Stanford University"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] ml-1">Bio</label>
                    {isEditing ? (
                      <textarea
                        value={editData.bio}
                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                        placeholder="Tell the world about yourself..."
                        className="w-full bg-[#151923] p-3 rounded-3xl border border-[#1e293b] text-white text-sm leading-relaxed font-medium focus:outline-none focus:border-purple-500/50 min-h-[80px]"
                      />
                    ) : (
                      <div className="bg-[#151923] p-4 rounded-3xl border border-[#1e293b] text-gray-300 text-sm leading-relaxed font-medium shadow-inner">
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
                    <SettingItem
                      label="Low bandwidth mode"
                      desc="Lower video quality for calls on slow networks (also auto-detected)"
                      toggle
                      checked={lowBandwidth}
                      onToggle={handleToggleLowBandwidth}
                      disabled={savingLowBandwidth}
                    />

                    <div className="mt-4 pt-4 border-t border-[#1e293b]/50">
                      <button
                        onClick={async () => {
                          if (window.confirm("ARE YOU SURE? This will permanently delete your account and all associated data in compliance with the DPDP Act 2023. This action cannot be undone.")) {
                            try {
                              const token = localStorage.getItem("token");
                              const res = await apiFetch(`${API_URL}/api/users/account`, {
                                method: "DELETE",
                                headers: { "Authorization": `Bearer ${token}` }
                              });
                              if (res.ok) {
                                handleLogout();
                              }
                            } catch (err) {
                              console.error("Delete account error:", err);
                              alert("Failed to delete account. Please contact support.");
                            }
                          }
                        }}
                        className="w-full p-3 rounded-md bg-red-500/5 border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-between group"
                      >
                        <div className="text-left">
                          <h4 className="font-black uppercase tracking-tight text-sm mb-1">Delete Account</h4>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Permanently remove your data</p>
                        </div>
                        <X className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:rotate-90 transition-all" />
                      </button>

                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem("token");
                            const res = await apiFetch(`${API_URL}/api/users/export`, {
                              headers: { "Authorization": `Bearer ${token}` }
                            });
                            if (res.ok) {
                              const blob = await res.blob();
                              const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `ontlo_my_data.json`;
                                a.click();
                                window.URL.revokeObjectURL(url);
                            }
                          } catch (err) {
                            console.error("Export error:", err);
                            alert("Failed to export data.");
                          }
                        }}
                        className="w-full p-3 rounded-md bg-purple-500/5 border border-purple-500/20 text-purple-400 hover:bg-purple-500/10 transition-all flex items-center justify-between group mt-4"
                      >
                        <div className="text-left">
                          <h4 className="font-black uppercase tracking-tight text-sm mb-1">Export My Data</h4>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Download a copy of your personal data</p>
                        </div>
                        <Globe className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-all" />
                      </button>
                    </div>
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
                                await apiFetch(`${API_URL}/api/users/unblock/${u._id}`, {
                                  method: "POST",
                                  headers: { "Authorization": `Bearer ${token}` }
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
                        const res = await apiFetch(`${API_URL}/api/users/blocked/list`, {
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
                  <div className="p-6 sm:p-8 rounded-md bg-gradient-to-br from-purple-600/20 to-blue-600/10 border border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-2xl font-black text-white mb-2 italic">Contact Us</h3>
                      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-6">Replay within 24 hours</p>
                      <button
                        onClick={() => setShowTicketForm(!showTicketForm)}
                        className="px-6 py-3 rounded-md bg-white text-black text-[10px] font-black hover:scale-105 transition tracking-wide shadow-lg"
                      >
                        {showTicketForm ? 'Cancel Request' : 'write your concern'}
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
                      <FaqItem question="How does matching work?" answer="Our algorithm connects you with users based on your match preferences such as gender, age range, and distance." />
                      <FaqItem question="Is my data secure?" answer="Yes, we use industry-standard encryption to protect all your personal information." />
                      <FaqItem question="How do I report someone?" answer="You can report any user directly from their profile or the chat window." />
                      <FaqItem question="What is Premium?" answer="Premium gives you unlimited discovery, special badges, and priority matching." />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Terms & Conditions" && (
                <div className="text-gray-300 space-y-4 text-sm leading-relaxed text-justify mx-2 md:mx-0">
                  <h4 className="text-white font-black uppercase tracking-tighter mb-4">
                    Terms & Conditions
                  </h4>
                  <p>Welcome to Ontlo. By accessing or using our platform, you agree to comply with and be bound by the following terms and conditions.</p>
                  <h5 className="text-white font-semibold">1. Eligibility</h5>
                  <p>You must be at least 18 years old to use Ontlo.</p>
                  <h5 className="text-white font-semibold">2. User Accounts</h5>
                  <p>You are responsible for maintaining the confidentiality of your account.</p>
                  <h5 className="text-white font-semibold">3. Acceptable Use</h5>
                  <p>You agree not to misuse the platform. No harassment, abusive behavior, or spam.</p>
                </div>
              )}

              {activeTab === "Privacy Policy" && (
                <div className="text-gray-300 space-y-4 text-sm leading-relaxed text-justify mx-2 md:mx-0">
                  <h4 className="text-white font-black uppercase tracking-tighter mb-4">
                    Privacy Policy
                  </h4>
                  <p className="text-gray-500 text-xs mb-4">Last Updated: May 2026</p>
                  <p>At Ontlo, your privacy is important to us. We protect your data with standard encryption.</p>
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
  <button onClick={onClick} className={`flex items-center justify-between p-4 sm:p-2 rounded-[20px] sm:rounded-[24px] w-full transition-all group ${active ? "bg-[#151923] shadow-xl border border-[#1e293b]/50" : "hover:bg-[#151923]/40"}`}>
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-purple-600/10' : 'bg-[#0B0E14] group-hover:scale-110'}`}>{icon}</div>
      <span className={`font-black text-[10px] uppercase tracking-[0.2em] ${active ? "text-white" : "text-gray-500 group-hover:text-gray-300"}`}>{label}</span>
    </div>
    <ChevronRight className={`w-4 h-4 transition-all ${active ? 'text-white' : 'text-gray-700 group-hover:translate-x-1'}`} />
  </button>
);

const EditField = ({ label, value, isEditing, onChange, type = "text", placeholder }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] ml-1">{label}</label>
    {isEditing ? (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#151923] border border-[#1e293b] p-3 rounded-2xl text-white font-semibold uppercase tracking-tight text-sm focus:outline-none focus:border-purple-500/50"
      />
    ) : (
      <div className="bg-[#151923] border border-[#1e293b] p-3 rounded-2xl text-white font-semibold uppercase tracking-tight text-sm shadow-inner">{value || "Not set"}</div>
    )}
  </div>
);

const SettingItem = ({ label, desc, toggle, checked, disabled, onToggle }) => (
  <div
    onClick={!disabled && onToggle ? onToggle : null}
    className={`flex items-center justify-between p-5 rounded-md bg-[#151923]/40 border border-transparent hover:border-[#1e293b] transition-all group ${!disabled && onToggle ? 'cursor-pointer' : ''}`}
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

export default Settings;
