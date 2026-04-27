import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Heart, 
  ShieldAlert, 
  TrendingUp, 
  Zap,
  Globe
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import adminApi from '../api/admin';
import { io } from 'socket.io-client';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);

  const fetchStats = async () => {
    try {
      const res = await adminApi.get('/stats');
      setStats(res.data);
      if (res.data.overview) setOnlineCount(res.data.overview.onlineUsers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const socket = io('http://localhost:5000', {
      auth: { token: localStorage.getItem('admin_token') }
    });

    socket.on('online-count', (data) => setOnlineCount(data.count));
    socket.on('support-update-admin', fetchStats);
    socket.on('notification-update', fetchStats);

    return () => socket.disconnect();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
      <Zap className="w-8 h-8 animate-pulse text-black" />
      <p className="text-[9px] font-black uppercase tracking-[0.2em] animate-pulse">Syncing...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">System Overview</h1>
          <p className="text-gray-500 font-medium text-xs sm:text-sm">Real-time infrastructure and user analytics.</p>
        </div>
        <div className="px-3 py-1.5 bg-white border border-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400">
          Sync: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Compact Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Users" value={stats?.overview.totalUsers} icon={Users} trend="+12%" gradient="from-blue-500 to-indigo-600" />
        <StatCard title="Online Now" value={onlineCount} icon={Globe} trend="Live" gradient="from-emerald-400 to-teal-500" />
        <StatCard title="Match Success" value={`${stats?.overview.matchSuccess}%`} icon={Heart} trend="+5%" gradient="from-rose-500 to-pink-600" />
        <StatCard title="Pending Reports" value={stats?.overview.pendingReports} icon={ShieldAlert} trend="Action" gradient="from-amber-400 to-orange-500" isAlert={stats?.overview.pendingReports > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Chart - Tightened */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-black tracking-tight">User Engagement</h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Daily registration and activity trends.</p>
            </div>
            <select className="bg-gray-50 border-none outline-none text-[10px] font-bold px-3 py-1.5 rounded-lg">
              <option>7 Days</option>
              <option>30 Days</option>
            </select>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.growth.chartData || []}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="users" stroke="#000" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Goal - Tightened */}
        <div className="bg-black text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-black tracking-tight mb-1">Growth Target</h3>
            <p className="text-gray-400 text-[11px] font-medium leading-relaxed mb-6">On track for 10k users this quarter.</p>
            
            <div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2 text-gray-500">
                <span>Monthly Goal</span>
                <span>{stats?.overview.growthRate}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.max(0, stats?.overview.growthRate)}%` }} />
              </div>
            </div>
          </div>
          
          <button onClick={() => window.location.href = '/analytics'} className="w-full bg-white text-black py-3.5 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-gray-100 transition-colors relative z-10 mt-6">
            View Deep Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, trend, gradient, isAlert }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm group hover:border-black/10 transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-black/5`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={`text-[9px] font-black uppercase tracking-widest ${isAlert ? 'text-rose-500' : 'text-emerald-500'}`}>
        {trend}
      </span>
    </div>
    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">{title}</p>
    <h4 className="text-xl sm:text-2xl font-black text-black tracking-tight">{value}</h4>
  </div>
);

export default Dashboard;
