import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  Ban, 
  Mail, 
  CheckCircle,
  X,
  Edit2,
  Save,
  Calendar,
  ChevronRight,
  User as UserIcon,
  Activity
} from 'lucide-react';
import { getUsers, performUserAction } from '../api/admin';
import adminApi from '../api/admin';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ username: '', email: '', password: '', role: 'moderator' });

  const currentUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers({ search, role: roleFilter, status: statusFilter });
      const data = Array.isArray(res.data) ? res.data : (res.data.users || []);
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearch = (e) => {
    if (e.key === 'Enter') fetchUsers();
  };

  const handleAction = async (userId, actionData) => {
    try {
      await performUserAction(userId, actionData);
      fetchUsers();
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser({ ...selectedUser, ...actionData });
      }
    } catch (err) {
      alert("Action failed: " + err.message);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      await adminApi.post('/users/create-staff', newStaff);
      alert("Staff member created!");
      setShowCreateStaff(false);
      setNewStaff({ username: '', email: '', password: '', role: 'moderator' });
      fetchUsers();
    } catch (err) {
      alert("Creation failed: " + (err.response?.data?.error || err.message));
    }
  };

  const startEditing = () => {
    setEditData({
      fullName: selectedUser.fullName || '',
      bio: selectedUser.bio || '',
      role: selectedUser.role || 'user'
    });
    setIsEditing(true);
  };

  const handleUpdateProfile = async () => {
    try {
      const res = await adminApi.post(`/users/${selectedUser._id}/update`, editData);
      setSelectedUser(res.data.user);
      setIsEditing(false);
      fetchUsers();
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">User Directory</h1>
          <p className="text-gray-500 font-medium text-xs">Manage members and platform roles.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-gray-100 px-4 py-2 rounded-xl shadow-sm focus-within:border-black transition-all">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              className="bg-transparent border-none outline-none text-xs ml-2 w-40 sm:w-60 font-medium"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`p-2.5 border rounded-xl transition ${showFilters ? 'bg-black text-white border-transparent' : 'bg-white text-gray-500 border-gray-100'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
          {currentUser.role === 'superadmin' && (
            <button 
              onClick={() => setShowCreateStaff(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-black/10"
            >
              <Users className="w-4 h-4" /> Create Staff
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Split View */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* Left Side: Table List */}
        <div className={`flex-1 transition-all duration-500 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex flex-col ${selectedUser ? 'hidden lg:flex' : 'flex'}`}>
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left min-w-[600px]">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">User</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Role</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [1,2,3,4,5].map(i => <tr key={i} className="animate-pulse"><td colSpan="4" className="h-16 bg-white" /></tr>)
                ) : users.map((u) => (
                  <tr 
                    key={u._id} 
                    onClick={() => setSelectedUser(u)}
                    className={`group transition-all cursor-pointer ${selectedUser?._id === u._id ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden shadow-sm border border-white/10">
                          <img src={u.profilePic} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${selectedUser?._id === u._id ? 'text-white' : 'text-black'}`}>{u.username}</p>
                          <p className={`text-[10px] ${selectedUser?._id === u._id ? 'text-white/50' : 'text-gray-400'}`}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                        selectedUser?._id === u._id ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                        u.status === 'active' ? (selectedUser?._id === u._id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600') : 'bg-rose-50 text-rose-600'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${selectedUser?._id === u._id ? 'text-white' : 'text-gray-200 group-hover:translate-x-1'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Detail Pane (Inline, not Modal) */}
        {selectedUser && (
          <div className="w-full lg:w-[450px] bg-white border border-gray-100 rounded-2xl flex flex-col shadow-xl animate-in slide-in-from-right duration-300 min-h-0">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest">Profile Details</h3>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 rounded-3xl bg-gray-50 overflow-hidden mb-4 shadow-lg border-2 border-white">
                  <img src={selectedUser.profilePic} className="w-full h-full object-cover" />
                </div>
                <h4 className="text-lg font-black">{selectedUser.username}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">ID: {selectedUser._id.slice(-6)}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedUser.onlineStatus ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Joined
                    </p>
                    <p className="text-[11px] font-bold text-black">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Status
                    </p>
                    <p className="text-[11px] font-bold text-black uppercase">{selectedUser.status}</p>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="p-5 border-2 border-gray-50 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Bio & Info</h5>
                    {!isEditing ? (
                      <button onClick={startEditing} className="p-1.5 bg-gray-50 rounded-lg hover:bg-black hover:text-white transition-all"><Edit2 className="w-3 h-3" /></button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditing(false)} className="p-1.5 bg-gray-100 rounded-lg hover:bg-red-500 hover:text-white transition-all"><X className="w-3 h-3" /></button>
                        <button onClick={handleUpdateProfile} className="p-1.5 bg-black text-white rounded-lg hover:bg-gray-800 transition-all"><Save className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <input 
                        className="w-full bg-white border border-gray-100 px-3 py-2 rounded-lg text-xs font-bold outline-none focus:border-black"
                        value={editData.fullName}
                        onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                        placeholder="Full Name"
                      />
                      <textarea 
                        className="w-full bg-white border border-gray-100 px-3 py-2 rounded-lg text-xs font-bold outline-none focus:border-black min-h-[60px]"
                        value={editData.bio}
                        onChange={(e) => setEditData({...editData, bio: e.target.value})}
                        placeholder="Short bio..."
                      />
                      <select 
                        className="w-full bg-white border border-gray-100 px-3 py-2 rounded-lg text-xs font-bold outline-none focus:border-black"
                        value={editData.role}
                        onChange={(e) => setEditData({...editData, role: e.target.value})}
                      >
                         <option value="user">User</option>
                         <option value="moderator">Moderator</option>
                         <option value="admin">Admin</option>
                         <option value="superadmin">Super Admin</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-600 font-medium leading-relaxed">
                        <span className="font-black text-black">Name:</span> {selectedUser.fullName || 'No name'}
                      </p>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed">
                        <span className="font-black text-black">Bio:</span> {selectedUser.bio || 'This user hasn\'t written a bio.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Moderation Control</label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedUser.status === 'suspended' ? (
                      <button 
                        onClick={() => handleAction(selectedUser._id, { status: 'active' })}
                        className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                      >
                        <CheckCircle className="w-3 h-3" /> Lift Suspension
                      </button>
                    ) : selectedUser.status === 'banned' ? (
                      <button 
                        onClick={() => handleAction(selectedUser._id, { status: 'active' })}
                        className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                      >
                        <CheckCircle className="w-3 h-3" /> Unban Account
                      </button>
                    ) : (
                      <>
                        <ActionButton icon={Shield} label="Suspend" active={selectedUser.status === 'suspended'} onClick={() => handleAction(selectedUser._id, { status: 'suspended' })} color="orange" />
                        <ActionButton icon={Ban} label="Ban" active={selectedUser.status === 'banned'} onClick={() => handleAction(selectedUser._id, { status: 'banned' })} color="rose" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Popover */}
      {showFilters && (
        <div className="absolute top-20 right-8 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl p-6 z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="space-y-4">
             <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={['user', 'moderator', 'admin']} />
             <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={['active', 'banned', 'suspended']} />
             <button onClick={() => { setRoleFilter(''); setStatusFilter(''); setSearch(''); fetchUsers(); setShowFilters(false); }} className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition">Reset Filters</button>
          </div>
        </div>
      )}
      {/* Create Staff Slide-over */}
      {showCreateStaff && (
        <div className="fixed inset-0 z-[200] flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md h-full bg-white p-8 flex flex-col animate-in slide-in-from-right duration-500">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black uppercase tracking-tight">Create Staff Member</h3>
               <button onClick={() => setShowCreateStaff(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-6">
               <div className="space-y-4">
                  <InputField label="Username" value={newStaff.username} onChange={(val) => setNewStaff({...newStaff, username: val})} />
                  <InputField label="Email Address" value={newStaff.email} onChange={(val) => setNewStaff({...newStaff, email: val})} />
                  <InputField 
                    label="Password" 
                    type="password" 
                    value={newStaff.password} 
                    onChange={(val) => setNewStaff({...newStaff, password: val})} 
                  />
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight -mt-2 ml-1">
                    Req: 8+ chars, 1 Uppercase, 1 Number, 1 Symbol
                  </p>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Assigned Role</label>
                    <select 
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-black outline-none px-4 py-3 rounded-xl text-xs font-bold transition-all appearance-none"
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                    >
                      <option value="moderator">Moderator (Users & Moderation)</option>
                      <option value="admin">Admin (Full Access except System)</option>
                      <option value="superadmin">Super Admin (Total Control)</option>
                    </select>
                  </div>
               </div>

               <button type="submit" className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-black/10 hover:translate-y-[-2px] transition-all">
                  Confirm Registration
               </button>
            </form>

            <div className="mt-auto p-4 bg-gray-50 rounded-2xl">
               <p className="text-[10px] text-gray-400 font-bold uppercase leading-relaxed">
                  Important: New staff members are activated immediately. Ensure the email address is correct for future password resets.
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InputField = ({ label, value, onChange, type = "text" }) => (
  <div>
     <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">{label}</label>
     <input 
        type={type} 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-50 border-2 border-transparent focus:border-black outline-none px-4 py-3 rounded-xl text-xs font-bold transition-all"
     />
  </div>
);

const FilterSelect = ({ label, value, onChange, options }) => (
  <div>
     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300 mb-2">{label}</p>
     <div className="flex flex-wrap gap-2">
        {options.map(opt => (
           <button 
              key={opt}
              onClick={() => onChange(value === opt ? '' : opt)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                 value === opt ? 'bg-black text-white border-transparent shadow-md' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
              }`}
           >
              {opt}
           </button>
        ))}
     </div>
  </div>
);

const ActionButton = ({ icon: Icon, label, active, onClick, color }) => (
  <button 
    onClick={onClick}
    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
      active 
        ? `bg-${color === 'orange' ? 'orange' : 'rose'}-500 text-white border-transparent shadow-lg` 
        : `bg-white text-gray-400 border-gray-100 hover:bg-gray-50`
    }`}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);

export default UsersPage;
