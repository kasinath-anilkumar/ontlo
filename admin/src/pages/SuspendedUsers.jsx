import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Search, 
  CheckCircle,
  X,
  Calendar,
  ChevronRight,
  Activity,
  Clock
} from 'lucide-react';
import { getUsers, performUserAction } from '../api/admin';

const SuspendedUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Force status filter to 'suspended'
      const res = await getUsers({ search, status: 'suspended' });
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

  const handleReactivate = async (userId) => {
    try {
      await performUserAction(userId, { status: 'active' });
      fetchUsers();
      setSelectedUser(null);
    } catch (err) {
      alert("Failed to reactivate: " + err.message);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-amber-600 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6" /> Suspended Users
          </h1>
          <p className="text-gray-500 font-medium text-xs">Users on temporary restriction: {users.length}</p>
        </div>
        
        <div className="flex items-center bg-white border border-gray-100 px-4 py-2 rounded-xl shadow-sm focus-within:border-amber-500 transition-all">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search suspensions..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            className="bg-transparent border-none outline-none text-xs ml-2 w-60 font-medium"
          />
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        <div className={`flex-1 transition-all duration-500 bg-white border border-amber-100 rounded-2xl overflow-hidden shadow-sm flex flex-col ${selectedUser ? 'hidden lg:flex' : 'flex'}`}>
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white z-10 border-b border-amber-50">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">User</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Suspended Date</th>
                  <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan="3" className="h-16 bg-white" /></tr>)
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-20 text-center">
                      <Clock className="w-12 h-12 text-amber-100 mx-auto mb-4" />
                      <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No users under suspension</p>
                    </td>
                  </tr>
                ) : users.map((u) => (
                  <tr 
                    key={u._id} 
                    onClick={() => setSelectedUser(u)}
                    className={`group transition-all cursor-pointer ${selectedUser?._id === u._id ? 'bg-amber-500 text-white shadow-lg' : 'hover:bg-amber-50/30'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={u.profilePic} className="w-8 h-8 rounded-lg object-cover border border-white/20" />
                        <div>
                          <p className={`text-xs font-bold ${selectedUser?._id === u._id ? 'text-white' : 'text-black'}`}>{u.username}</p>
                          <p className={`text-[10px] ${selectedUser?._id === u._id ? 'text-white/60' : 'text-gray-400'}`}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-400">
                      {new Date(u.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className={`w-4 h-4 ml-auto opacity-20 ${selectedUser?._id === u._id && 'opacity-100 text-white'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedUser && (
          <div className="w-full lg:w-[450px] bg-white border-2 border-amber-100 rounded-2xl flex flex-col shadow-xl animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-amber-50 flex items-center justify-between bg-amber-50/30">
              <h3 className="text-sm font-black uppercase tracking-widest text-amber-600">Suspension Detail</h3>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-white rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 rounded-3xl bg-gray-50 overflow-hidden mb-4 shadow-lg border-4 border-white">
                  <img src={selectedUser.profilePic} className="w-full h-full object-cover" />
                </div>
                <h4 className="text-lg font-black">{selectedUser.username}</h4>
                <div className="flex items-center gap-2 mt-2">
                   <Clock className="w-3 h-3 text-amber-500" />
                   <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Account Suspended</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100">
                   <h5 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Temporary Restriction</h5>
                   <p className="text-xs text-amber-800 leading-relaxed font-medium">
                     This user has been temporarily suspended from interacting with other users. You can review their activity and reactivate them at any time.
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Member Since
                    </p>
                    <p className="text-[11px] font-bold text-black">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Flagged Date
                    </p>
                    <p className="text-[11px] font-bold text-black">{new Date(selectedUser.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="p-5 bg-gray-50 rounded-2xl">
                  <h5 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">User Context</h5>
                  <p className="text-xs text-gray-600 font-medium italic">{selectedUser.bio || 'User bio is empty.'}</p>
                </div>

                <button 
                  onClick={() => handleReactivate(selectedUser._id)}
                  className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-xl shadow-amber-500/20"
                >
                   <CheckCircle className="w-4 h-4" /> End Suspension & Reactivate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuspendedUsers;
