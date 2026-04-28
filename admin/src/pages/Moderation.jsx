import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  UserX, 
  CheckCircle, 
  Trash2, 
  AlertCircle,
  MessageSquare,
  Clock,
  ExternalLink,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { getReports, performUserAction } from '../api/admin';
import adminApi, { API_BASE_URL } from '../api/admin';
import { io } from 'socket.io-client';

const ModerationPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await getReports();
      setReports(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    // Real-time moderation updates
    const socket = io(API_BASE_URL, {
      auth: { token: localStorage.getItem('admin_token') }
    });

    socket.on('support-update-admin', fetchReports);

    return () => socket.disconnect();
  }, []);

  const handleAction = async (id, action, reportedUserId) => {
    try {
      if (action === 'ban') {
        await performUserAction(reportedUserId, { status: 'banned' });
      }
      await adminApi.post(`/moderation/reports/${id}/resolve`, { action });
      fetchReports();
      alert(`Report ${action}ed successfully`);
    } catch (err) {
      alert("Failed to perform action");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-black tracking-tight">Moderation Queue</h1>
        <p className="text-gray-500 font-medium text-xs sm:text-sm">Review and resolve platform safety concerns.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-48 bg-white border border-gray-100 rounded-2xl animate-pulse" />)
        ) : reports.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
             <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-20" />
             <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Queue is clean. No pending reports.</p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report._id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-black/5 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-rose-50 rounded-xl">
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-black uppercase tracking-tight">Safety Alert</p>
                      <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-bold">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(report.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    report.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {report.status}
                  </span>
                </div>

                <div className="bg-gray-50/80 rounded-xl p-3.5 mb-4">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Violation Reason</p>
                   <p className="text-xs font-medium text-gray-700 leading-relaxed italic">"{report.reason}"</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                   <UserDetailBox label="Reported User" user={report.reportedUser} />
                   <UserDetailBox label="Reporter" user={report.reporter} />
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-gray-50 pt-4 mt-auto">
                 <button 
                  onClick={() => handleAction(report._id, 'ban', report.reportedUser?._id)}
                  className="flex-1 bg-black text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    Restrict Account
                 </button>
                 <button 
                  onClick={() => handleAction(report._id, 'dismiss', report.reportedUser?._id)}
                  className="flex-1 border border-gray-100 text-gray-500 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                    Dismiss
                 </button>
                 <button 
                  onClick={() => handleAction(report._id, 'delete', report.reportedUser?._id)}
                  className="p-2.5 border border-gray-100 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const UserDetailBox = ({ label, user }) => (
  <div className="p-3 border border-gray-100 rounded-xl bg-white group hover:border-black/10 transition-all cursor-pointer">
     <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
     <div className="flex items-center gap-2.5">
        <img src={user?.profilePic} className="w-6 h-6 rounded-lg object-cover bg-gray-50 shadow-sm" />
        <p className="text-xs font-bold text-black truncate">{user?.username || 'System'}</p>
        <ExternalLink className="w-3 h-3 text-gray-300 ml-auto group-hover:text-black transition-colors" />
     </div>
  </div>
);

export default ModerationPage;
