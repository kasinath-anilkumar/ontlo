import React, { useEffect, useState } from 'react';
import { 
  Server, 
  Cpu, 
  Database, 
  RefreshCcw,
  ShieldCheck,
  Loader2,
  Activity
} from 'lucide-react';
import adminApi from '../api/admin';

const SystemPage = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/system/health');
      setHealth(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await adminApi.post('/audit');
      setHealth(prev => ({
        ...prev,
        lastAudit: res.data.timestamp,
        securityStatus: res.data.status,
        dbLatency: res.data.latency
      }));
      alert(`Audit Complete! System Score: ${res.data.score}/100`);
    } catch (err) {
      alert("Audit failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds) => {
    if (!seconds) return '...';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-black tracking-tight">System Health</h1>
          <p className="text-gray-500 font-medium text-xs sm:text-sm">Real-time infrastructure and security status.</p>
        </div>
        <button 
          onClick={fetchHealth}
          className="p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition shadow-sm"
        >
           <RefreshCcw className={`w-4 h-4 text-black ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatusCard title="Server Core" icon={Server} color="emerald" platform={health?.platform}>
           <HealthStat label="Uptime" value={formatUptime(health?.uptime)} />
           <HealthStat label="Node.js" value={health?.nodeVersion} />
           <HealthStat label="API Status" value="Healthy" status="success" />
        </StatusCard>

        <StatusCard title="Database" icon={Database} color="blue" platform="MongoDB Atlas">
           <HealthStat label="Connection" value={health?.dbStatus} status={health?.dbStatus === 'Connected' ? 'success' : 'error'} />
           <HealthStat label="Records" value={health ? (health.userCount + health.reportCount).toLocaleString() : '...'} />
           <HealthStat label="Latency" value={health?.dbLatency || "24ms"} />
        </StatusCard>

        <StatusCard title="Resources" icon={Cpu} color="purple" platform="System Load">
           <HealthStat label="Heap Used" value={health?.memory ? `${Math.round(health.memory.heapUsed / 1024 / 1024)} MB` : '...'} />
           <HealthStat label="RSS" value={health?.memory ? `${Math.round(health.memory.rss / 1024 / 1024)} MB` : '...'} />
           <div className="pt-2">
              <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                 <div className="h-full bg-purple-500 w-[45%]" />
              </div>
           </div>
        </StatusCard>
      </div>

      <div className="bg-black text-white rounded-2xl p-6 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative overflow-hidden">
         <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
               <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
               <h2 className="text-xl font-black tracking-tight mb-1">Security Protocol</h2>
               <p className="text-gray-400 text-[11px] font-medium max-w-sm">
                 Status: <span className={health ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                   {loading ? 'Scanning...' : (health?.securityStatus || 'Ready')}
                 </span>. 
                 {health ? ` Audit: ${new Date(health.lastAudit).toLocaleTimeString()}` : ''}
               </p>
            </div>
         </div>
         <button 
            onClick={runAudit}
            className="w-full lg:w-auto px-8 py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 relative z-10 flex items-center justify-center gap-2"
            disabled={loading}
         >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Run Full Audit
         </button>
         <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

const StatusCard = ({ title, icon: Icon, color, platform, children }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:border-black/5 transition-all">
     <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 bg-${color}-50 text-${color}-600 rounded-xl`}>
           <Icon className="w-5 h-5" />
        </div>
        <div>
           <h3 className="font-black text-sm">{title}</h3>
           <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{platform || '...'}</p>
        </div>
     </div>
     <div className="space-y-4">
        {children}
     </div>
  </div>
);

const HealthStat = ({ label, value, status }) => (
  <div className="flex items-center justify-between">
     <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
     <div className="flex items-center gap-2">
        {status && <div className={`w-1 h-1 rounded-full ${status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />}
        <span className="text-xs font-black text-black">{value || '...'}</span>
     </div>
  </div>
);

export default SystemPage;
