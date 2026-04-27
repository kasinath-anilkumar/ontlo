import { Mic, Video, PhoneOff, Heart } from "lucide-react";

const VideoControls = () => {
  return (
    <div className="absolute bottom-6 w-full flex justify-center gap-4">

      <button className="bg-gray-800 p-4 rounded-full">
        <Mic />
      </button>

      <button className="bg-gray-800 p-4 rounded-full">
        <Video />
      </button>

      <button className="bg-red-500 p-5 rounded-full">
        <PhoneOff />
      </button>

      <button className="bg-pink-500 p-4 rounded-full">
        <Heart />
      </button>

    </div>
  );
};

export default VideoControls;