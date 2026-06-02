import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  X, 
  Image as ImageIcon, 
  Video, 
  Smile, 
  MapPin, 
  Globe, 
  ChevronDown, 
  Send,
  Camera,
  Star,
  Users as UsersIcon
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import API_URL, { apiFetch } from '../utils/api';

const CreatePost = () => {
  const navigate = useNavigate();
  const { user } = useSocket();
  const fileInputRef = useRef(null);

  const [caption, setCaption] = useState('');
  const [images, setImages] = useState([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [visibility, setVisibility] = useState('Connections');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter((file) => file.type.startsWith('image/'));
    if (!validFiles.length) {
      e.target.value = '';
      return;
    }

    const nextImages = [];
    let processed = 0;
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        nextImages.push({ file, preview: reader.result });
        processed += 1;
        if (processed === validFiles.length) {
          setImages((prev) => {
            const merged = [...prev, ...nextImages].slice(0, 10);
            setCurrentPreviewIndex(Math.max(0, merged.length - nextImages.length));
            return merged;
          });
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!images.length && !caption.trim()) return;
    setLoading(true);
    try {
      const uploadedImages = [];
      for (const image of images) {
        const formData = new FormData();
        formData.append('image', image.file);
        const uploadRes = await apiFetch(`${API_URL}/api/upload/post-image`, {
          method: 'POST',
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Upload failed');
        const uploadData = await uploadRes.json();
        uploadedImages.push({
          imageUrl: uploadData.url,
          width: uploadData.width,
          height: uploadData.height
        });
      }

      const postRes = await apiFetch(`${API_URL}/api/posts`, {
        method: 'POST',
        body: JSON.stringify({ 
          imageUrl: uploadedImages[0]?.imageUrl || null,
          width: uploadedImages[0]?.width || null,
          height: uploadedImages[0]?.height || null,
          images: uploadedImages,
          caption, 
          visibility: visibility.toLowerCase() === 'everyone' ? 'connections' : visibility.toLowerCase() 
        })
      });

      if (postRes.ok) {
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to create post', err);
      alert('Failed to share post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-[#0B0E14] flex flex-col animate-in fade-in duration-500 overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-600/5 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-pink-600/5 blur-[80px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
        
        {/* Top Header Bar - Fixed */}
        <div className="flex-none p-4 md:p-6 flex items-center justify-between border-b border-white/5 bg-[#0B0E14]/80 backdrop-blur-xl relative z-50">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-90 relative z-[60] cursor-pointer pointer-events-auto"
            >
              <ChevronLeft size={18} className="text-white" />
            </button>
            <h1 className="text-sm md:text-lg font-thin tracking-wide  text-white/80">Post Moments</h1>
          </div>
          
          <button 
            disabled={(!images.length && !caption.trim()) || loading}
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black uppercase tracking-widest text-[8px] md:text-[9px] shadow-lg shadow-purple-500/10 active:scale-95 transition-all disabled:opacity-20 flex items-center gap-2"
          >
            {loading ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Post</span>
            )}
          </button>
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Side: Editor */}
          <div className="flex-1 flex flex-col p-5 md:p-10 pb-24 md:pb-10 space-y-4 md:space-y-8 overflow-hidden md:border-r md:border-white/5">
            
            {/* User Info - Compact */}
            <div className="flex-none flex items-center gap-3">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full p-0.5">
                <img 
                  src={user?.profilePic} 
                  className="w-full h-full rounded-full border-2 border-[#0B0E14] object-cover" 
                  alt="Profile"
                />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/90">
                  <span>{user?.username || 'User'}</span>
                </h3>
                <div className="flex items-center gap-1 text-[7px] md:text-[8px] font-black text-purple-400 uppercase tracking-widest">
                  {visibility === 'Connections' ? <UsersIcon size={8} /> : <Star size={8} />}
                  <span>{visibility}</span>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <textarea 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What's happening?"
                className="w-full h-full bg-transparent border-none text-lg md:text-2xl font-medium text-gray-100 placeholder:text-gray-800 focus:ring-0 resize-none p-0 scrollbar-hide leading-relaxed"
                maxLength={500}
              />
            </div>

            {/* Bottom Toolbar & Mobile Privacy */}
            <div className="flex-none space-y-4 pt-4 border-t border-white/5">
              {/* Privacy Pills (Mobile Only) */}
              <div className="flex md:hidden items-center gap-2">
                <button 
                  key="privacy-connections"
                  onClick={() => setVisibility('Connections')}
                  className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all border ${visibility === 'Connections' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/5 text-gray-500'}`}
                >
                  <span>Connections</span>
                </button>
                <button 
                  key="privacy-favorites"
                  onClick={() => setVisibility('Favorites')}
                  className={`px-3 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all border ${visibility === 'Favorites' ? 'bg-pink-600 border-pink-500 text-white' : 'bg-white/5 border-white/5 text-gray-500'}`}
                >
                  <span>Favorites</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <ToolbarBtn 
                    icon={<ImageIcon size={18} />} 
                    onClick={() => fileInputRef.current?.click()}
                    active={images.length > 0}
                    label="Photo"
                  />
                  
                  {/* Thumbnail Preview (Mobile) */}
                  {images.length > 0 && (
                    <div key="mobile-thumb" className="md:hidden relative w-10 h-10 rounded-lg overflow-hidden border border-white/20 animate-in zoom-in">
                      <img src={images[currentPreviewIndex]?.preview} className="w-full h-full object-cover" alt="Thumb" />
                      <button 
                        onClick={() => {
                          setImages((prev) => {
                            const next = prev.filter((_, idx) => idx !== currentPreviewIndex);
                            setCurrentPreviewIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
                            return next;
                          });
                        }}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-[8px] md:text-[9px] font-black text-gray-700 uppercase tracking-[0.2em]">
                  <span>{caption.length} / 500</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Desktop Only Panel */}
          <div className="hidden md:flex w-80 bg-white/[0.01] p-6 flex-col h-full overflow-hidden">
            <div className="flex-1 flex flex-col space-y-8 overflow-y-auto scrollbar-hide">
              <div className="space-y-3">
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Preview</h4>
                <div className="aspect-square w-full bg-white/5 rounded-3xl border-2 border-dashed border-white/5 flex items-center justify-center overflow-hidden relative group">
                  {images.length > 0 ? (
                    <>
                      <img src={images[currentPreviewIndex]?.preview} className="w-full h-full object-cover" alt="Post Preview" />
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentPreviewIndex((prev) => (prev - 1 + images.length) % images.length)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 backdrop-blur-xl rounded-full flex items-center justify-center text-white"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <button
                            onClick={() => setCurrentPreviewIndex((prev) => (prev + 1) % images.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 backdrop-blur-xl rounded-full flex items-center justify-center text-white"
                          >
                            <ChevronLeft size={14} className="rotate-180" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => {
                          setImages((prev) => {
                            const next = prev.filter((_, idx) => idx !== currentPreviewIndex);
                            setCurrentPreviewIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
                            return next;
                          });
                        }}
                        className="absolute top-3 right-3 w-8 h-8 bg-black/60 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-3 cursor-pointer">
                      <Camera size={24} className="text-gray-700" />
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-700">Add Image</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">Privacy</h4>
                <div className="space-y-2">
                  <VisibilityOption 
                    active={visibility === 'Connections'} 
                    onClick={() => setVisibility('Connections')}
                    icon={<UsersIcon size={14} />}
                    title="Connections"
                    desc="Standard"
                  />
                  <VisibilityOption 
                    active={visibility === 'Favorites'} 
                    onClick={() => setVisibility('Favorites')}
                    icon={<Star size={14} />}
                    title="Favorites"
                    desc="Inner Circle"
                  />
                </div>
              </div>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            multiple
            onChange={handleFileChange} 
          />
        </div>
      </div>
    </div>
  );
};

const VisibilityOption = ({ active, onClick, icon, title, desc }) => (
  <div 
    onClick={onClick}
    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${active ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-transparent hover:border-white/10'}`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-purple-500 text-white' : 'bg-[#0B0E14] text-gray-600'}`}>
        {icon}
      </div>
      <div>
        <h4 className={`text-[10px] font-black uppercase tracking-tight ${active ? 'text-white' : 'text-gray-400'}`}>{title}</h4>
        <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">{desc}</p>
      </div>
    </div>
    <div className={`w-4 h-4 rounded-full border-2 transition-all ${active ? 'border-purple-500 bg-purple-500 scale-110 shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'border-gray-800'}`} />
  </div>
);

const ToolbarBtn = ({ icon, onClick, active, label }) => (
  <div className="group/btn relative flex flex-col items-center">
    <button 
      onClick={onClick}
      className={`p-3 rounded-2xl transition-all duration-300 ${active ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'}`}
    >
      {icon}
    </button>
    <span className="absolute -bottom-6 text-[8px] font-black uppercase tracking-widest text-gray-500 opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
      {label}
    </span>
  </div>
);

export default CreatePost;
