import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Video, 
  Loader2, 
  ShieldCheck, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Sparkles, 
  User, 
  Lock, 
  ArrowRight,
  Globe,
  Zap
} from "lucide-react";
import { useSocket } from "../context/SocketContext";
import API_URL, { apiFetch } from "../utils/api";
import logo from "../assets/ontlo_Logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useSocket();

  const [reqs, setReqs] = useState({
    length: false,
    upper: false,
    number: false,
    symbol: false
  });

  useEffect(() => {
    setReqs({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[@$!%*?&#]/.test(password)
    });
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!isLogin) {
      const allPassed = Object.values(reqs).every(val => val === true);
      if (!allPassed) {
        setError("Please strengthen your password.");
        return;
      }
    }

    setIsLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const fullUrl = `${API_URL}${endpoint}`;
    console.log(`[AUTH] Attempting ${isLogin ? 'Login' : 'Register'} at: ${fullUrl}`);

    try {
      const response = await apiFetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong");

      localStorage.setItem("user", JSON.stringify(data.user));
      if (data.token) localStorage.setItem("token", data.token);
      console.log('[AUTH] Login Success! User data saved. Navigating...');
      setUser(data.user);
      
      const target = data.user.isProfileComplete ? "/" : "/setup-profile";
      console.log(`[AUTH] Target path: ${target}`);
      navigate(target);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#05070A] text-white flex flex-col lg:flex-row relative overflow-hidden font-sans select-none">
      
      {/* Dynamic Background Elements - Shared */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.03),transparent_70%)]"></div>
      </div>

      {/* LEFT SECTION - Branding (Desktop Only) */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-12 xl:px-20 relative z-10">
        <div className="max-w-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <img src={logo} alt="Logo" className="w-10 h-10" />
            </div>
            <div className="h-6 w-px bg-white/10"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Beyond your Circle</span>
          </div>

          <h1 className="text-5xl xl:text-6xl font-black mb-4 leading-tight tracking-tighter uppercase italic">
            YOU’RE NOT ALONE.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x">STARTS Start a.</span>
            <br />Conversation.
          </h1>

          <p className="text-gray-400 text-base mb-8 leading-relaxed font-medium max-w-md">
            Just a simple way to connect and be you.
            That’s it.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <FeatureCard icon={<Zap className="w-4 h-4 text-yellow-400" />} title="Instant" desc="no more waiting" />
            <FeatureCard icon={<ShieldCheck className="w-4 h-4 text-green-400" />} title="Secure" desc="Your safety is our priority" />
            <FeatureCard icon={<Globe className="w-4 h-4 text-blue-400" />} title="Global" desc="Meet people around the world" />
            <FeatureCard icon={<Video className="w-4 h-4 text-purple-400" />} title="Video Call" desc="Not some photos" />
          </div>
        </div>
      </div>

      {/* RIGHT SECTION - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10 lg:bg-white/[0.01] lg:backdrop-blur-sm border-l border-white/5">
        
        {/* Mobile Logo (Visible only on small screens) */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 lg:hidden">
           <img src={logo} alt="Logo" className="w-10 h-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
        </div>

        <div className="w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-700">
          <div className="bg-[#0D1117]/60 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 sm:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] relative overflow-hidden group">
            
            {/* Subtle glow effect on hover */}
            <div className="absolute -inset-2 bg-gradient-to-r from-purple-600/0 via-purple-600/5 to-pink-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>

            {/* Header */}
            <div className="mb-8 relative">
              {!isLogin && (
                <div className="flex items-center gap-1.5 mb-6">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-700 ${i === 1 ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-white/5'}`}></div>
                  ))}
                </div>
              )}
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                {isLogin ? "Login" : "Create Account"}
              </h2>
              <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.4em] mt-1.5">
                {isLogin ? "Enter your credentials" : "Onboarding Phase 1 of 5"}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              
              {/* USERNAME */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] ml-5">
                  Username
                </label>
                <div className="relative group/input">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within/input:text-purple-400 transition-colors">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-[20px] pl-12 pr-5 py-3.5 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all font-bold text-xs placeholder:text-gray-700"
                    placeholder="e.g. cyber_punk"
                    required
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] ml-5">
                  Password
                </label>
                <div className="relative group/input">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within/input:text-purple-400 transition-colors">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-[20px] pl-12 pr-12 py-3.5 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all font-bold text-xs placeholder:text-gray-700"
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* SECURITY MATRIX */}
              {!isLogin && (
                <div className="pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <ReqItem label="8+ Chars" active={reqs.length} />
                    <ReqItem label="Uppercase" active={reqs.upper} />
                    <ReqItem label="Numbers" active={reqs.number} />
                    <ReqItem label="Special" active={reqs.symbol} />
                  </div>
                </div>
              )}

              {!isLogin && (
                <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.1em] text-center px-4 mb-2">
                  By clicking Sign Up, you agree to our{' '}
                  <button type="button" onClick={() => navigate('/terms')} className="text-purple-500 hover:underline">Terms of Service</button>
                  {' '}and acknowledge our{' '}
                  <button type="button" onClick={() => navigate('/privacy')} className="text-purple-500 hover:underline">Privacy Policy</button>.
                </p>
              )}

              {/* BUTTON */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 rounded-[20px] bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/10 flex justify-center items-center gap-3 disabled:opacity-50 mt-2 group/btn"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Log In" : "Sign Up"} 
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }} 
                className="group text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 mx-auto"
              >
                <div className="w-8 h-px bg-white/5 group-hover:w-12 group-hover:bg-purple-500/50 transition-all"></div>
                {isLogin ? "Create Account" : "Back to Login"}
                <div className="w-8 h-px bg-white/5 group-hover:w-12 group-hover:bg-purple-500/50 transition-all"></div>
              </button>
            </div>
          </div>

          <div className="mt-8 text-center space-x-4">
            <button 
              onClick={() => navigate('/privacy')}
              className="text-[8px] font-black text-gray-700 hover:text-indigo-400 uppercase tracking-[0.3em] transition-all"
            >
              Privacy Policy
            </button>
            <span className="text-gray-800">•</span>
            <button 
              onClick={() => navigate('/terms')}
              className="text-[8px] font-black text-gray-700 hover:text-indigo-400 uppercase tracking-[0.3em] transition-all"
            >
              Terms of Service
            </button>
          </div>
          
          <p className="text-center text-[8px] text-gray-800 font-black uppercase tracking-[0.4em] mt-8 leading-relaxed opacity-40">
            Ontlo Universal Identity Layer<br/>Quantum-Safe Authentication
          </p>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="p-4 rounded-[24px] bg-white/5 border border-white/5 backdrop-blur-xl hover:border-white/10 transition-all group">
    <div className="mb-2">{icon}</div>
    <h3 className="text-xs font-black uppercase tracking-widest text-white mb-0.5">{title}</h3>
    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{desc}</p>
  </div>
);

const ReqItem = ({ label, active }) => (
  <div className={`flex items-center gap-2.5 px-3 py-2 rounded-[12px] border transition-all duration-500 ${active ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-white/5 border-white/5 text-gray-700'}`}>
    {active ? <Check size={10} strokeWidth={4} /> : <div className="w-2 h-2 rounded-full border-2 border-current opacity-20" />}
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </div>
);

export default Auth;
