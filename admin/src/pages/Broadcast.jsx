import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Send, 
  History, 
  Trash2, 
  Globe, 
  Bell, 
  Info,
  CheckCircle,
  Eye,
  Zap,
  Activity
} from 'lucide-react';
import adminApi from '../api/admin';

const BroadcastPage = () => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('announcement');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await adminApi.get('/broadcasts');
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setHistory([]);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message) return;
    
    setLoading(true);
    try {
      await adminApi.post('/broadcast', { text: message, type });
      alert("Broadcast transmitted successfully!");
      setMessage('');
      fetchHistory();
    } catch (err) {
      alert("Transmission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-black tracking-tight">Global Broadcaster</h1>
        <p className="text-gray-500 font-medium text-xs sm:text-sm">Send real-time push notifications and alerts to all active users.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Composer - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-black text-white rounded-lg">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest">Message Command Center</h3>
            </div>
            
            <form onSubmit={handleSend} className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <TypeButton active={type === 'announcement'} onClick={() => setType('announcement')} label="Announcement" icon={Megaphone} />
                  <TypeButton active={type === 'alert'} onClick={() => setType('alert')} label="Security Alert" icon={Bell} color="rose" />
                  <TypeButton active={type === 'info'} onClick={() => setType('info')} label="System Info" icon={Info} color="indigo" />
                </div>
                
                <div className="relative">
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your global message here..."
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-black outline-none p-6 rounded-2xl text-sm font-medium transition-all min-h-[160px] resize-none"
                  />
                  <div className="absolute bottom-4 right-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    {message.length} characters
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading || !message}
                className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-black/10 disabled:opacity-50"
              >
                {loading ? <Zap className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
                Transmit Global Broadcast
              </button>
            </form>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
             <div className="bg-white border border-gray-100 p-4 rounded-xl flex items-center gap-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Globe className="w-4 h-4" /></div>
                <div>
                   <p className="text-[9px] text-gray-400 font-black uppercase">Reach</p>
                   <p className="text-sm font-black">All Active</p>
                </div>
             </div>
             <div className="bg-white border border-gray-100 p-4 rounded-xl flex items-center gap-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity className="w-4 h-4" /></div>
                <div>
                   <p className="text-[9px] text-gray-400 font-black uppercase">Latency</p>
                   <p className="text-sm font-black">&lt; 100ms</p>
                </div>
             </div>
             <div className="bg-white border border-gray-100 p-4 rounded-xl flex items-center gap-4">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CheckCircle className="w-4 h-4" /></div>
                <div>
                   <p className="text-[9px] text-gray-400 font-black uppercase">Success</p>
                   <p className="text-sm font-black">99.9%</p>
                </div>
             </div>
          </div>
        </div>

        {/* History - Right Column */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm h-fit">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gray-50 text-gray-400 rounded-lg">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest">Recent Transmissions</h3>
           </div>

           <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {fetching ? (
                 <div className="text-center py-10 opacity-20"><Zap className="w-6 h-6 animate-spin mx-auto" /></div>
              ) : history.length === 0 ? (
                 <div className="text-center py-10 text-gray-300 italic text-xs">No previous broadcasts</div>
              ) : history.map((item, idx) => (
                 <div key={idx} className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl group hover:border-black/10 transition-all">
                    <div className="flex justify-between items-start mb-2">
                       <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          item.type === 'alert' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                       }`}>
                          {item.type}
                       </span>
                       <span className="text-[8px] text-gray-400 font-bold uppercase">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] font-medium text-gray-700 leading-relaxed line-clamp-2">{item.text}</p>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

const TypeButton = ({ active, onClick, label, icon: Icon, color = "black" }) => {
  const colorMap = {
    black: active ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-gray-400 hover:text-black hover:bg-gray-50',
    rose: active ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50',
    indigo: active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50',
  };

  return (
    <button 
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
        active ? 'border-transparent' : 'border-gray-50 bg-white'
      } ${colorMap[color]}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
};

export default BroadcastPage;
