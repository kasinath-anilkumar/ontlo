import React, { useEffect, useState } from 'react';
import { 
  History, 
  User, 
  Globe, 
  Monitor,
  AlertCircle,
  Clock,
  Search,
  Filter
} from 'lucide-react';
import adminApi from '../api/admin';

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/logs', { params: { action, search } });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [action]);

  const handleSearch = (e) => {
    if (e.key === 'Enter') fetchLogs();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-black tracking-tight">Activity Logs</h1>
        <p className="text-gray-500 font-medium text-xs sm:text-sm">Real-time audit trail of platform events.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {/* Controls - Responsive Layout */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
               <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-xl">
                  <History className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Audit Trail</span>
               </div>
               
               <div className="flex items-center bg-white border border-gray-100 px-3 py-1.5 rounded-xl w-full sm:w-64 focus-within:border-black transition-all">
                  <Search className="w-3 h-3 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search User ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleSearch}
                    className="ml-2 text-xs bg-transparent focus:outline-none w-full font-medium"
                  />
               </div>

               <div className="flex items-center bg-white border border-gray-100 px-3 py-1.5 rounded-xl w-full sm:w-auto">
                  <Filter className="w-3 h-3 text-gray-400 mr-2" />
                  <select 
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer w-full"
                  >
                    <option value="">All Actions</option>
                    <option value="login">Logins</option>
                    <option value="suspicious_activity">Alerts</option>
                    <option value="admin_action">Admin</option>
                  </select>
               </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Live Stream</span>
            </div>
        </div>

        {/* Log List - Responsive Items */}
        <div className="divide-y divide-gray-50">
           {loading ? (
             [1,2,3,4,5].map(i => <div key={i} className="p-5 h-20 bg-white animate-pulse" />)
           ) : logs.length === 0 ? (
             <div className="p-20 text-center text-gray-300 font-bold uppercase tracking-widest text-[10px] italic">No logs recorded yet.</div>
           ) : (
             logs.map((log) => (
               <div key={log._id} className="p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className={`p-2.5 rounded-xl shrink-0 ${
                        log.action === 'login' ? 'bg-indigo-50 text-indigo-500' : 
                        log.action === 'suspicious_activity' ? 'bg-rose-50 text-rose-500' : 
                        'bg-gray-100 text-gray-500'
                     }`}>
                        {log.action === 'login' ? <User className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                     </div>
                     
                     <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                           <span className="text-xs font-black text-black uppercase tracking-tight truncate">{log.action.replace('_', ' ')}</span>
                           <span className="text-[9px] font-black text-gray-300">/</span>
                           <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest truncate">{log.userId?.username || 'System'}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-gray-400 font-bold uppercase tracking-tight">
                           <div className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              <span>{log.ip || 'Local'}</span>
                           </div>
                           <div className="flex items-center gap-1">
                              <Monitor className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{log.userAgent || 'Agent'}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-none border-gray-50 pt-3 sm:pt-0">
                     <div className="flex items-center gap-1.5 text-[11px] font-black text-black">
                        <Clock className="w-3 h-3 text-gray-300" />
                        {new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </div>
                     <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                        {new Date(log.createdAt).toLocaleDateString([], {month: 'short', day: 'numeric'})}
                     </p>
                  </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};

export default LogsPage;
