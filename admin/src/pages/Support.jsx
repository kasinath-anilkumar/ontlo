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

const SupportPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await adminApi.get('/support');
        setTickets(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const resolveTicket = async (id) => {
    try {
      await adminApi.post(`/support/${id}/resolve`);
      setTickets(tickets.map(t => t._id === id ? { ...t, status: 'resolved' } : t));
    } catch (err) {
      alert("Failed to resolve ticket");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-black tracking-tight">Support Center</h1>
          <p className="text-gray-500 font-medium text-xs sm:text-sm">Manage inquiries and platform technical support.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-xl shadow-sm text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition w-full sm:w-auto">
           <Filter className="w-3.5 h-3.5" />
           Filter
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-24 bg-white border border-gray-100 rounded-xl animate-pulse" />)
        ) : tickets.length === 0 ? (
          <div className="py-32 text-center bg-white border border-gray-100 rounded-2xl shadow-sm">
             <LifeBuoy className="w-12 h-12 text-gray-300 mx-auto mb-3 opacity-30" />
             <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No active support tickets.</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket._id} className="bg-white border border-gray-100 rounded-xl p-4 lg:p-5 shadow-sm hover:border-black/5 transition-all group">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start lg:items-center gap-4 flex-1">
                     <div className={`p-3 rounded-xl shrink-0 ${
                        ticket.priority === 'critical' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'
                     }`}>
                        <MessageCircle className="w-5 h-5" />
                     </div>
                     
                     <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                           <h3 className="font-bold text-black text-sm truncate">{ticket.subject}</h3>
                           <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                              ticket.status === 'open' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                           }`}>
                              {ticket.status}
                           </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1 mb-2 font-medium">{ticket.message}</p>
                        <div className="flex items-center gap-3">
                           <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                              <User className="w-3 h-3" />
                              {ticket.user?.username || 'User'}
                           </div>
                           <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                              <Clock className="w-3 h-3" />
                              {new Date(ticket.createdAt).toLocaleDateString()}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-2 lg:pl-6 lg:border-l lg:border-gray-50">
                     <button 
                        onClick={() => resolveTicket(ticket._id)}
                        disabled={ticket.status === 'resolved'}
                        className="flex-1 lg:flex-none px-5 py-2.5 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
                     >
                        {ticket.status === 'resolved' ? 'Resolved' : 'Resolve Ticket'}
                     </button>
                     <button className="p-2.5 text-gray-400 hover:text-black bg-gray-50 rounded-xl transition-all">
                        <ArrowRight className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SupportPage;
