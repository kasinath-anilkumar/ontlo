import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Shield, 
  Ban, 
  Mail, 
  Trash2, 
  Eye,
  CheckCircle,
  X,
  Edit2,
  Save,
  Globe,
  Calendar,
  ShieldCheck
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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers({ search, role: roleFilter, status: statusFilter });
      // Robust check: handle both [user] and { users: [user] }
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
      alert("Profile updated successfully");
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-black tracking-tight">User Directory</h1>
          <p className="text-gray-500 font-medium text-xs sm:text-sm">Manage, monitor, and edit all platform members.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center bg-white border border-gray-100 px-4 py-2.5 rounded-2xl w-full sm:w-80 shadow-sm focus-within:border-black transition-all">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              className="bg-transparent border-none outline-none text-sm ml-2 w-full font-medium"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`w-full sm:w-auto flex items-center justify-center gap-2 p-3 border rounded-2xl transition ${showFilters ? 'bg-black text-white border-transparent shadow-lg' : 'bg-white text-gray-500 border-gray-100'}`}
            >
              <Filter className="w-5 h-5" />
              <span className="sm:hidden font-black uppercase text-[10px]">Filters</span>
            </button>
            {showFilters && (
              <div className="absolute right-0 mt-3 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl p-6 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-4">
                   <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={['user', 'moderator', 'admin']} />
                   <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={['active', 'banned', 'suspended']} />
                   <button onClick={() => { setRoleFilter(''); setStatusFilter(''); setSearch(''); fetchUsers(); }} className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition">Reset Filters</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">User</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Role</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Joined</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [1,2,3,4,5].map(i => <tr key={i} className="animate-pulse"><td colSpan="5" className="h-20 bg-white" /></tr>)
              ) : users.map((user) => (
                <tr key={user._id} className="group hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedUser(user)}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shadow-sm border border-white">
                        <img src={user.profilePic || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-black">{user.username}</p>
                        <p className="text-[11px] text-gray-400 font-medium">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-tighter">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-gray-300 hover:text-black hover:bg-white hover:shadow-sm rounded-xl transition-all">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Detail Slide-over / Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full lg:max-w-xl h-full bg-white shadow-2xl p-6 lg:p-10 flex flex-col animate-in slide-in-from-right duration-500 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">User Profile Details</h2>
              <button onClick={() => {setSelectedUser(null); setIsEditing(false);}} className="p-3 bg-gray-100 rounded-2xl hover:bg-black hover:text-white transition-all"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-col items-center mb-10">
              <div className="w-32 h-32 rounded-[32px] bg-gray-100 overflow-hidden mb-6 shadow-2xl border-4 border-gray-50">
                <img src={selectedUser.profilePic} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-2xl font-black text-black mb-1">{selectedUser.username}</h3>
              <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">{selectedUser.role} • {selectedUser.status}</p>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="p-5 bg-gray-50 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Mail className="w-3 h-3" /> Email Address
                    </p>
                    <p className="text-sm font-bold text-black">{selectedUser.email}</p>
                 </div>
                 <div className="p-5 bg-gray-50 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Calendar className="w-3 h-3" /> Member Since
                    </p>
                    <p className="text-sm font-bold text-black">{new Date(selectedUser.createdAt).toDateString()}</p>
                 </div>
              </div>

              <div className="p-6 border-2 border-gray-50 rounded-3xl">
                 <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-black">Profile Information</h4>
                    {!isEditing ? (
                       <button onClick={startEditing} className="p-2 bg-gray-100 rounded-xl hover:bg-black hover:text-white transition-all"><Edit2 className="w-4 h-4" /></button>
                    ) : (
                       <button onClick={handleUpdateProfile} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"><Save className="w-4 h-4" /></button>
                    )}
                 </div>
                 
                 {isEditing ? (
                    <div className="space-y-4 animate-in fade-in zoom-in-95">
                       <div>
                          <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block">Full Name</label>
                          <input 
                            className="w-full bg-white border border-gray-100 px-4 py-3 rounded-xl text-xs font-bold outline-none focus:border-black"
                            value={editData.fullName}
                            onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block">Bio</label>
                          <textarea 
                            className="w-full bg-white border border-gray-100 px-4 py-3 rounded-xl text-xs font-bold outline-none focus:border-black min-h-[80px]"
                            value={editData.bio}
                            onChange={(e) => setEditData({...editData, bio: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block">Role</label>
                          <select 
                            className="w-full bg-white border border-gray-100 px-4 py-3 rounded-xl text-xs font-bold outline-none focus:border-black"
                            value={editData.role}
                            onChange={(e) => setEditData({...editData, role: e.target.value})}
                          >
                             <option value="user">User</option>
                             <option value="moderator">Moderator</option>
                             <option value="admin">Admin</option>
                          </select>
                       </div>
                    </div>
                 ) : (
                    <div className="space-y-4">
                       <p className="text-xs text-gray-500 leading-relaxed font-medium"><span className="font-black text-black">Name:</span> {selectedUser.fullName || 'Not provided'}</p>
                       <p className="text-xs text-gray-500 leading-relaxed font-medium"><span className="font-black text-black">Bio:</span> {selectedUser.bio || 'No bio written yet.'}</p>
                    </div>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <ActionButton icon={Shield} label="Suspended" active={selectedUser.status === 'suspended'} onClick={() => handleAction(selectedUser._id, { status: 'suspended' })} color="orange" />
                 <ActionButton icon={Ban} label="Banned" active={selectedUser.status === 'banned'} onClick={() => handleAction(selectedUser._id, { status: 'banned' })} color="rose" />
              </div>
              
              {selectedUser.status !== 'active' && (
                <button 
                  onClick={() => handleAction(selectedUser._id, { status: 'active' })}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                >
                   <CheckCircle className="w-4 h-4" /> Unban / Reactivate User
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FilterSelect = ({ label, value, onChange, options }) => (
  <div>
     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300 mb-2">{label}</p>
     <div className="flex flex-wrap gap-2">
        {options.map(opt => (
           <button 
              key={opt}
              onClick={() => onChange(value === opt ? '' : opt)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                 value === opt ? 'bg-black text-white border-transparent shadow-md shadow-black/10' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100 hover:text-black'
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
    className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
      active 
        ? `bg-${color === 'orange' ? 'orange' : 'rose'}-500 text-white border-transparent` 
        : `bg-white text-gray-400 border-gray-100 hover:bg-${color === 'orange' ? 'orange' : 'rose'}-50 hover:text-${color === 'orange' ? 'orange' : 'rose'}-600`
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

export default UsersPage;
