import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  Activity, 
  Users, 
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Target
} from 'lucide-react';
import adminApi from '../api/admin';

const AnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminApi.get('/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const engagementData = [
    { name: 'DAU', value: stats?.overview.dau || 0 },
    { name: 'MAU', value: stats?.overview.mau || 0 },
  ];

  const COLORS = ['#000000', '#6366F1'];

  if (loading) return <div className="p-8 text-center font-bold text-xs uppercase tracking-widest opacity-30">Loading Analytics...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-black tracking-tight">Advanced Analytics</h1>
        <p className="text-gray-500 font-medium text-xs sm:text-sm">In-depth behavioral analysis and retention metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Retention Summary */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm col-span-1">
           <div className="flex items-center gap-2 mb-6">
              <PieIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">User Retention</h3>
           </div>
           <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                       data={engagementData}
                       innerRadius={45}
                       outerRadius={60}
                       paddingAngle={8}
                       dataKey="value"
                       stroke="none"
                    >
                       {engagementData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                    </Pie>
                    <Tooltip />
                 </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="mt-4 pt-4 border-t border-gray-50 text-center">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Retention Score</p>
              <h4 className="text-xl font-black text-black">
                 {stats?.overview.mau ? ((stats.overview.dau / stats.overview.mau) * 100).toFixed(1) : 0}%
              </h4>
           </div>
        </div>

        {/* Growth Bar Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm col-span-3">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                 <BarChart3 className="w-4 h-4 text-emerald-500" />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">7-Day Registration Velocity</h3>
              </div>
              <div className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-lg">
                 Trend: Positive
              </div>
           </div>
           <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats?.growth.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} />
                    <Tooltip cursor={{fill: '#F9FAFB'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="users" fill="#000" radius={[4, 4, 0, 0]} barSize={32} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <MetricCard title="Daily Active (DAU)" value={stats?.overview.dau || 0} icon={Activity} color="indigo" />
         <MetricCard title="Monthly Active (MAU)" value={stats?.overview.mau || 0} icon={Users} color="emerald" />
         <MetricCard title="Target Reach" value={`${stats?.overview.growthRate}%`} icon={Target} color="amber" />
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between group hover:border-black transition-all">
     <div>
        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-2xl font-black text-black tracking-tight">{value}</h4>
     </div>
     <div className={`p-3 bg-gray-50 rounded-xl group-hover:bg-black group-hover:text-white transition-all`}>
        <Icon className="w-5 h-5" />
     </div>
  </div>
);

export default AnalyticsPage;
