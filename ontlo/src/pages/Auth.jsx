import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Loader2, ShieldCheck, Check, X, Eye, EyeOff, Sparkles } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import API_URL from "../utils/api";
import logo from "../assets/ontlo_Logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
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
        setError("Security check failed. Please strengthen your password.");
        return;
      }
      if (!dob) {
        setError("Date of birth is required.");
        return;
      }
    }

    setIsLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, ...(isLogin ? {} : { dob }) }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      navigate(data.user.isProfileComplete ? "/" : "/setup-profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070A] p-4 relative overflow-hidden font-sans">
      {/* Immersive Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-600/10 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-pink-600/10 rounded-full blur-[150px] animate-pulse delay-700"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.05),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02]"></div>
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="bg-[#0D1117]/40 backdrop-blur-3xl border border-white/5 rounded-[48px] p-6 sm:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
          
          {/* Progress Header for Registration */}
          {!isLogin && (
            <div className="flex items-center gap-2 mb-10">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i === 1 ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-white/5'}`}></div>
              ))}
            </div>
          )}

          <div className="flex flex-col items-center mb-8">
            <img className="w-20 sm:w-24 mb-4 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" src={logo} alt="Ontlo Logo" />
            <h2 className="text-xl font-black text-white uppercase tracking-tight italic mb-1">
              {isLogin ? "Welcome Back" : "Personal Information"}
            </h2>
            {!isLogin && (
               <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">
                  Onboarding Phase 1 of 5
               </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-in zoom-in-95">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

  {/* USERNAME */}
  <div className="space-y-1.5 sm:space-y-2">
    <label className="block text-[8px] sm:text-[9px] font-black text-gray-500 uppercase tracking-[0.15em] ml-2 sm:ml-4">
      Username
    </label>
    <input 
      type="text" 
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      className="w-full bg-white/5 border border-white/10 text-white 
        rounded-xl sm:rounded-[20px] 
        px-4 sm:px-6 py-3 sm:py-4
        text-[13px] sm:text-sm
        focus:outline-none focus:border-purple-500/50 focus:bg-white/10 
        transition-all font-medium placeholder:text-gray-700"
      placeholder="Pick a username"
      required
    />
  </div>

  {/* PASSWORD */}
  <div className="space-y-1.5 sm:space-y-2 relative">
    <label className="block text-[8px] sm:text-[9px] font-black text-gray-500 uppercase tracking-[0.15em] ml-2 sm:ml-4">
      Password
    </label>
    <input 
      type={showPassword ? "text" : "password"} 
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="w-full bg-white/5 border border-white/10 text-white 
        rounded-xl sm:rounded-[20px] 
        px-4 sm:px-6 py-3 sm:py-4 pr-10 sm:pr-12
        text-[13px] sm:text-sm
        focus:outline-none focus:border-purple-500/50 focus:bg-white/10 
        transition-all font-medium placeholder:text-gray-700"
      placeholder="••••••••"
      required
    />

    <button 
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 sm:right-5 top-[34px] sm:top-[38px] text-gray-500 hover:text-white transition-colors"
    >
      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  </div>

  {/* DOB */}
  {!isLogin && (
    <div className="space-y-1.5 sm:space-y-2">
      <label className="block text-[8px] sm:text-[9px] font-black text-gray-500 uppercase tracking-[0.15em] ml-2 sm:ml-4">
        Date of Birth
      </label>
      <input
        type="date"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
        className="w-full bg-white/5 border border-white/10 text-white 
          rounded-xl sm:rounded-[20px] 
          px-4 sm:px-6 py-3 sm:py-4
          text-[13px] sm:text-sm
          focus:outline-none focus:border-purple-500/50 focus:bg-white/10 
          transition-all font-medium"
        required={!isLogin}
      />
    </div>
  )}

  {/* SECURITY MATRIX */}
  {!isLogin && (
    <div className="bg-black/40 border border-white/5 rounded-xl sm:rounded-2xl
      p-2 sm:p-4
      space-y-1.5 sm:space-y-3
      animate-in fade-in zoom-in-95 duration-500 w-full">

      <p className="text-[7px] sm:text-[10px] font-black text-gray-500 uppercase tracking-wider px-1">
        Security Matrix
      </p>

      <div className="grid grid-cols-2 gap-1 sm:gap-2">
        <ReqItem label="8+ Chars" active={reqs.length} />
        <ReqItem label="Uppercase" active={reqs.upper} />
        <ReqItem label="Numeric" active={reqs.number} />
        <ReqItem label="Special" active={reqs.symbol} />
      </div>
    </div>
  )}

  {/* BUTTON */}
  <button 
    type="submit" 
    disabled={isLoading}
    className="w-full py-3 sm:py-4 
      rounded-xl sm:rounded-[20px] 
      bg-white text-black font-black uppercase 
      tracking-[0.15em] sm:tracking-[0.2em] 
      text-[9px] sm:text-[10px]
      hover:scale-[1.02] active:scale-95 
      transition-all shadow-xl shadow-white/10 mt-2 
      flex justify-center items-center gap-2 sm:gap-3 
      disabled:opacity-50"
  >
    {isLoading ? (
      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
    ) : (
      <>
        {isLogin ? "Login" : "Signup"} 
        <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      </>
    )}
  </button>

</form>

          <div className="mt-10 text-center">
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }} 
              className="group text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 mx-auto"
            >
              <div className="w-8 h-px bg-white/5 group-hover:bg-purple-500/50 transition-all"></div>
              {isLogin ? "New User? Create Account" : "Registered? Sign In"}
              <div className="w-8 h-px bg-white/5 group-hover:bg-purple-500/50 transition-all"></div>
            </button>
          </div>
        </div>

        <p className="text-center text-[8px] text-gray-800 font-black uppercase tracking-[0.4em] mt-8 leading-relaxed opacity-40">
          Ontlo Intelligence Network<br/>Universal Identity Layer
        </p>
      </div>
    </div>
  );
};

const ReqItem = ({ label, active }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-[12px] border transition-all ${active ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-white/5 border-white/5 text-gray-700'}`}>
    {active ? <Check size={10} strokeWidth={3} /> : <div className="w-2.5 h-2.5 rounded-full border border-current opacity-20" />}
    <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
  </div>
);

export default Auth;
