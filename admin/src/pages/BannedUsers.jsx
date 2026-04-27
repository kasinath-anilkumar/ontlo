import React, { useEffect, useState } from 'react';
import { 
  Ban, 
  Search, 
  CheckCircle,
  X,
  Calendar,
  ChevronRight,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { getUsers, performUserAction } from '../api/admin';

const BannedUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Force status filter to 'banned'
      const res = await getUsers({ search, status: 'banned' });
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
  }, []);

  const handleUnban = async (userId) => {
    if (!window.confirm("Are you sure you want to reactivate this user?")) return;
    try {
      await performUserAction(userId, { status: 'active' });
      fetchUsers();
      setSelectedUser(null);
    } catch (err) {
      alert("Failed to unban: " + err.message);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-rose-600 tracking-tight flex items-center gap-2">
            <Ban className="w-6 h-6" /> Banned Users
          </h1>
          <p className="text-gray-500 font-medium text-xs">Total Permanently Banned: {users.length}</p>
        </div>
        
        <div className="flex items-center bg-white border border-gray-100 px-4 py-2 rounded-xl shadow-sm focus-within:border-rose-500 transition-all">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search bans..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            className="bg-transparent border-none outline-none text-xs ml-2 w-60 font-medium"
          />
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        <div className={`flex-1 transition-all duration-500 bg-white border border-rose-100 rounded-2xl overflow-hidden shadow-sm flex flex-col ${selectedUser ? 'hidden lg:flex' : 'flex'}`}>
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white z-10 border-b border-rose-50">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">User</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Banned Date</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan="3" className="h-16 bg-white" /></tr>)
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-20 text-center">
                      <CheckCircle className="w-12 h-12 text-emerald-100 mx-auto mb-4" />
                      <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No banned users found</p>
                    </td>
                  </tr>
                ) : users.map((u) => (
                  <tr 
                    key={u._id} 
                    onClick={() => setSelectedUser(u)}
                    className={`group transition-all cursor-pointer ${selectedUser?._id === u._id ? 'bg-rose-600 text-white' : 'hover:bg-rose-50/30'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={u.profilePic} className="w-8 h-8 rounded-lg object-cover border" />
                        <div>
                          <p className={`text-xs font-bold ${selectedUser?._id === u._id ? 'text-white' : 'text-black'}`}>{u.username}</p>
                          <p className={`text-[10px] ${selectedUser?._id === u._id ? 'text-white/50' : 'text-gray-400'}`}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-400">
                      {new Date(u.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-4 h-4 ml-auto opacity-20" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedUser && (
          <div className="w-full lg:w-[450px] bg-white border-2 border-rose-100 rounded-2xl flex flex-col shadow-xl animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-rose-50 flex items-center justify-between bg-rose-50/30">
              <h3 className="text-sm font-black uppercase tracking-widest text-rose-600">Ban Record</h3>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-white rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 rounded-3xl bg-gray-50 overflow-hidden mb-4 shadow-lg border-4 border-white grayscale">
                  <img src={selectedUser.profilePic} className="w-full h-full object-cover" />
                </div>
                <h4 className="text-lg font-black">{selectedUser.username}</h4>
                <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-[8px] font-black uppercase tracking-widest mt-2">Permanently Banned</span>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100">
                   <div className="flex items-center gap-2 text-rose-600 mb-2">
                     <AlertTriangle className="w-4 h-4" />
                     <h5 className="text-[10px] font-black uppercase tracking-widest">Restricted Account</h5>
                   </div>
                   <p className="text-xs text-rose-800 leading-relaxed font-medium">
                     This account has been flagged for violations and is currently restricted from all platform services.
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Joined
                    </p>
                    <p className="text-[11px] font-bold text-black">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Last Active
                    </p>
                    <p className="text-[11px] font-bold text-black">{new Date(selectedUser.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="p-5 bg-gray-50 rounded-2xl">
                  <h5 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">User Bio</h5>
                  <p className="text-xs text-gray-600 font-medium italic">{selectedUser.bio || 'No bio provided.'}</p>
                </div>

                <button 
                  onClick={() => handleUnban(selectedUser._id)}
                  className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
                >
                   <CheckCircle className="w-4 h-4" /> Reactivate This Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BannedUsers;
