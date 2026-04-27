import { Home, Video, Users, MessageCircle } from "lucide-react";

const BottomNav = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0F1423] border-t border-gray-800 flex justify-around py-3 lg:hidden">
      <NavItem icon={<Home size={20} />} />
      <NavItem icon={<Video size={20} />} />
      <NavItem icon={<Users size={20} />} />
      <NavItem icon={<MessageCircle size={20} />} />
    </div>
  );
};

const NavItem = ({ icon }) => (
  <div className="text-gray-400">{icon}</div>
);

export default BottomNav;