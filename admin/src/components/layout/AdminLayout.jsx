import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import adminApi from '../../api/admin';
import { 
  LayoutDashboard, 
  Users, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Activity,
  UserCheck,
  Megaphone,
  LifeBuoy,
  ChevronRight,
  Command,
  Menu,
  X
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'User Management', icon: Users, path: '/users' },
    { name: 'Moderation', icon: ShieldAlert, path: '/moderation' },
    { name: 'Broadcaster', icon: Megaphone, path: '/broadcast' },
    { name: 'Support Center', icon: LifeBuoy, path: '/support' },
    { name: 'Analytics', icon: Activity, path: '/analytics' },
    { name: 'System Health', icon: Activity, path: '/system' },
    { name: 'Safety Logs', icon: UserCheck, path: '/logs' },
    { name: 'App Config', icon: Settings, path: '/config' },
  ];

  const fetchNotifications = async () => {
    try {
      const res = await adminApi.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close sidebar on navigation (Mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const markAllRead = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  return (
    <div className="flex h-screen bg-[#F9FAFB] font-sans selection:bg-black selection:text-white overflow-hidden" onClick={() => { setShowProfile(false); setShowNotifications(false); }}>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fully Responsive */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 w-64 bg-white border-r border-gray-100 flex flex-col z-[70] transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg shadow-black/10">
              <Command className="text-white w-5 h-5" />
            </div>
            <span className="text-base sm:text-lg font-black tracking-tight text-black uppercase italic">Ontlo<span className="text-gray-300">.</span></span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5 custom-scrollbar">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-3">Main Menu</p>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all group ${
                  isActive 
                    ? 'bg-black text-white shadow-md shadow-black/10' 
                    : 'text-gray-400 hover:bg-gray-50 hover:text-black'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-black'}`} />
                  {item.name}
                </div>
                {isActive && <ChevronRight className="w-3 h-3 text-white/40" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-50">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[11px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Responsive */}
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 shrink-0 relative z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }}
              className="lg:hidden p-2.5 bg-gray-50 text-black rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center bg-gray-100/50 px-4 py-2 rounded-xl w-[250px] lg:w-[350px] border border-transparent focus-within:border-black focus-within:bg-white transition-all">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-xs ml-2 w-full text-black font-medium placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            {/* Notifications */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                className={`p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100'}`}
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Alerts</h3>
                    <button onClick={markAllRead} className="text-[9px] font-black uppercase text-indigo-600 hover:underline">Clear</button>
                  </div>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                       <div className="py-8 text-center text-gray-300 font-bold italic text-[11px]">No alerts</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className="p-3 hover:bg-gray-50 rounded-xl transition cursor-pointer border border-transparent group">
                        <p className="text-[11px] font-bold text-black">{n.text}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{n.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-gray-100" />
            
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                className="flex items-center gap-2 lg:gap-3 group"
              >
                <div className="text-right hidden lg:block">
                  <p className="text-xs font-black text-black leading-none">Super Admin</p>
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Ontario HQ</p>
                </div>
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-black border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-[10px] lg:text-xs">SA</div>
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-3 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-0.5">
                    <button className="w-full text-left px-3 py-2 text-[11px] font-bold text-gray-600 hover:bg-gray-50 hover:text-black rounded-lg transition">Settings</button>
                    <div className="h-px bg-gray-50 my-2" />
                    <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-[11px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-lg transition">Log Out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
