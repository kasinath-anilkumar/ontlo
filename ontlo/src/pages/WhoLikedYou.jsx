import { Users, Heart, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";

const WhoLikedYou = () => {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    // In a real app, this would fetch from /api/likes
    // For now, we'll show an empty state or premium gate
    setLoading(false);
  }, []);

  return (
    <div className="h-full bg-[#0B0E14] rounded-3xl border border-[#1e293b] p-6 lg:p-10 overflow-y-auto w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center">
      <div className="py-20 text-gray-500 italic">
        <Users className="w-16 h-16 text-gray-800 mx-auto mb-4" />
        <p>No new likes at the moment. Keep matching!</p>
      </div>
    </div>
  );
};

export default WhoLikedYou;
