import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, ShieldCheck, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/admin', '') || 'http://localhost:5000';
      
      // Use the main auth API
      const response = await axios.post(`${baseUrl}/api/auth/login`, {
        username,
        password
      });

      const { token } = response.data;
      
      // Store token temporarily to check role
      localStorage.setItem('admin_token', token);

      // Verify if user is actually an admin
      const adminCheck = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/admin'}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (adminCheck.status === 200) {
        navigate('/');
        window.location.reload(); // Force refresh to update isAuthenticated
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Access Denied: You do not have admin permissions.');
      localStorage.removeItem('admin_token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-admin-bg p-4 font-sans">
      <div className="w-full max-w-md bg-white border border-admin-border rounded-[40px] p-10 shadow-2xl shadow-black/5 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-black rounded-[20px] flex items-center justify-center mb-6 shadow-xl shadow-black/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight uppercase italic">Ontlo Admin</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Authorized Access Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
             <div className="relative group">
                <User className="absolute left-5 top-5 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                <input 
                  type="text" 
                  required
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-50 border border-admin-border rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:ring-4 ring-black/5 focus:border-black transition-all font-medium"
                />
             </div>

             <div className="relative group">
                <Lock className="absolute left-5 top-5 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                <input 
                  type="password" 
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-admin-border rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:ring-4 ring-black/5 focus:border-black transition-all font-medium"
                />
             </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-xs font-bold text-center animate-in slide-in-from-top-2 duration-300">
               {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white font-black uppercase tracking-widest text-xs py-5 rounded-2xl shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign Into Dashboard"}
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-10 leading-relaxed">
          Forgot your credentials?<br />Contact the Super Admin for a reset.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
