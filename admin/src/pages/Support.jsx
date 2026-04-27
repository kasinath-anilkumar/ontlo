import React, { useEffect, useState } from 'react';
import { 
  LifeBuoy, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  User,
  Filter,
  ArrowRight
} from 'lucide-react';
import adminApi from '../api/admin';
import { io } from 'socket.io-client';

const SupportPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTicket, setReplyTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();

    // Setup real-time socket for admin
    const socket = io('http://localhost:5000', {
      auth: { token: localStorage.getItem('admin_token') }
    });

    socket.on('support-update-admin', fetchTickets);

    return () => socket.disconnect();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await adminApi.get('/support/all');
      setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage) return;
    setSubmitting(true);
    try {
      await adminApi.post(`/support/reply/${replyTicket._id}`, { message: replyMessage });
      setReplyTicket(null);
      setReplyMessage("");
      fetchTickets();
    } catch (err) {
      alert("Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await adminApi.patch(`/support/status/${id}`, { status });
      setTickets(tickets.map(t => t._id === id ? { ...t, status } : t));
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-black tracking-tight uppercase italic">Support Command</h1>
          <p className="text-gray-500 font-medium text-xs sm:text-sm">Real-time resolution of user-reported signals.</p>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={fetchTickets} className="px-5 py-2.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all">Refresh Feed</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-32 bg-white border border-gray-100 rounded-2xl animate-pulse" />)
        ) : tickets.length === 0 ? (
          <div className="py-32 text-center bg-white border border-gray-100 rounded-[32px] shadow-sm">
             <LifeBuoy className="w-12 h-12 text-gray-300 mx-auto mb-3 opacity-30" />
             <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No active signals detected.</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket._id} className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all">
               <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 min-w-0">
                     <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                           <img src={ticket.user?.profilePic} className="w-5 h-5 rounded-full object-cover" />
                           <span className="text-[10px] font-black uppercase text-black">{ticket.user?.username}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                           ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                           ticket.status === 'in-progress' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                           'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                           {ticket.status}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(ticket.createdAt).toLocaleString()}</span>
                     </div>
                     
                     <h3 className="text-lg font-black text-black mb-2 uppercase tracking-tighter italic">{ticket.subject}</h3>
                     <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
                        <p className="text-sm text-gray-600 font-medium leading-relaxed italic">"{ticket.message}"</p>
                     </div>

                     {ticket.responses.length > 0 && (
                        <div className="space-y-3 mb-6">
                           <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Previous Responses</h4>
                           {ticket.responses.map((resp, idx) => (
                              <div key={idx} className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
                                 <p className="text-emerald-700 text-xs font-medium italic">"{resp.message}"</p>
                                 <p className="text-[8px] text-emerald-600/50 font-black uppercase mt-1">SENT BY ADMIN • {new Date(resp.createdAt).toLocaleTimeString()}</p>
                              </div>
                           ))}
                        </div>
                     )}

                     <div className="flex flex-wrap gap-2">
                        <button 
                           onClick={() => setReplyTicket(ticket)}
                           className="px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-xl shadow-black/10"
                        >
                           Reply to User
                        </button>
                        {ticket.status !== 'resolved' && (
                           <button 
                              onClick={() => updateStatus(ticket._id, 'resolved')}
                              className="px-6 py-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-xl shadow-emerald-500/10"
                           >
                              Mark Resolved
                           </button>
                        )}
                        {ticket.status === 'pending' && (
                           <button 
                              onClick={() => updateStatus(ticket._id, 'in-progress')}
                              className="px-6 py-3 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-xl shadow-indigo-500/10"
                           >
                              Set In-Progress
                           </button>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Reply Modal */}
      {replyTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-2xl font-black text-black uppercase tracking-tighter italic">Reply to {replyTicket.user?.username}</h2>
                 <button onClick={() => setReplyTicket(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <CheckCircle2 className="w-6 h-6 text-gray-300" />
                 </button>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">The Issue</p>
              <p className="p-4 bg-gray-50 rounded-2xl text-xs text-gray-500 italic mb-6 border border-gray-100">"{replyTicket.message}"</p>
              
              <textarea 
                 value={replyMessage}
                 onChange={(e) => setReplyMessage(e.target.value)}
                 placeholder="Type your official response..."
                 className="w-full h-40 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm focus:outline-none focus:border-black transition-all mb-6 outline-none"
              />
              
              <div className="flex gap-3">
                 <button 
                  onClick={handleReply}
                  disabled={submitting || !replyMessage}
                  className="flex-1 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                 >
                    {submitting ? 'Sending Signal...' : 'Send Official Response'}
                 </button>
                 <button 
                  onClick={() => setReplyTicket(null)}
                  className="px-8 py-4 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all"
                 >
                    Cancel
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SupportPage;
