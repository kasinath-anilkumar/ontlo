import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Loader2 } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import API_URL from "../utils/api";
import logo from "../assets/ontlo_Logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useSocket();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Save token and user
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);

      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] relative overflow-hidden w-full absolute inset-0 z-50">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[0%] -right-[10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-[#151923]/80 backdrop-blur-xl border border-[#1e293b] rounded-3xl p-8 relative z-10 shadow-2xl">
        <div className="flex justify-center mb-8">
           <div className="flex items-center gap-2">
             <img className="w-25" src={logo} alt="Ontlo Logo" srcset="" />
           </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-2">{isLogin ? "Welcome back" : "Create an account"}</h2>
        <p className="text-sm text-gray-400 text-center mb-8">{isLogin ? "Enter your details to sign in" : "Sign up to start connecting instantly"}</p>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0B0E14] border border-[#1e293b] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Enter your username"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0B0E14] border border-[#1e293b] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Enter your password"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold hover:opacity-90 transition-opacity mt-4 flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isLogin ? "Signing In..." : "Signing Up..."}
              </>
            ) : (
              <>
                {isLogin ? "Sign In" : "Sign Up"} <Video className="w-4 h-4 fill-current" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-gray-400 hover:text-white transition-colors">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
