import { Star, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Favorites = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full bg-[#0B0E14] rounded-3xl border border-[#1e293b] p-6 lg:p-10 overflow-y-auto w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
        <Star className="w-10 h-10 text-yellow-500" />
      </div>
      <h1 className="text-3xl font-black text-white mb-4">Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Favorites</span></h1>
      <p className="text-gray-400 max-w-sm mb-8 leading-relaxed">
        Save people you click with to your favorites to find them easily later.
      </p>
      <button onClick={() => navigate("/connections")} className="px-10 py-4 border border-[#1e293b] text-white font-black rounded-2xl hover:bg-[#151923] transition-all">
        View All Connections
      </button>
    </div>
  );
};

export default Favorites;
