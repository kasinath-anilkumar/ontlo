import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, MoreHorizontal, Send, X, Users, Smile, Trash2, ChevronDown, Camera, Maximize2, Minimize2, Check, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useFeed } from '../context/FeedContext';
import Skeleton from './ui/Skeleton';
import API_URL, { apiFetch } from '../utils/api';

const getOptimizedUrl = (url, width = 1200) => {
  if (!url || typeof url !== 'string' || !url.includes('/upload/')) return url;
  if (url.includes('/upload/q_auto')) return url;
  return url.replace('/upload/', `/upload/q_auto:good,f_auto,w_${width}/`);
};

const getPostImages = (post) => {
  if (Array.isArray(post.images) && post.images.length > 0) {
    return post.images;
  }
  if (post.imageUrl) {
    return [{ imageUrl: post.imageUrl, width: post.width, height: post.height }];
  }
  return [];
};

const SHEET_HEIGHT = {
  dismiss: 28,
  half: 55,
  default: 75,
  full: 92,
  maxPx: 720,
};

const CommentsSheet = ({ open, onClose, children, footer }) => {
  const [heightVh, setHeightVh] = useState(SHEET_HEIGHT.default);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startY: 0, startHeight: SHEET_HEIGHT.default });
  const heightVhRef = useRef(heightVh);

  useEffect(() => {
    heightVhRef.current = heightVh;
  }, [heightVh]);

  useEffect(() => {
    if (open) setHeightVh(SHEET_HEIGHT.default);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const snapSheetHeight = (height) => {
    if (height < SHEET_HEIGHT.dismiss) {
      onClose();
      return SHEET_HEIGHT.default;
    }
    if (height < 48) return SHEET_HEIGHT.half;
    if (height < 68) return SHEET_HEIGHT.default;
    return SHEET_HEIGHT.full;
  };

  const beginDrag = (clientY) => {
    setIsDragging(true);
    dragRef.current = { startY: clientY, startHeight: heightVhRef.current };
  };

  const moveDrag = (clientY) => {
    const deltaVh = ((clientY - dragRef.current.startY) / window.innerHeight) * 100;
    const next = Math.min(
      SHEET_HEIGHT.full,
      Math.max(22, dragRef.current.startHeight - deltaVh)
    );
    setHeightVh(next);
  };

  const endDrag = () => {
    setIsDragging(false);
    setHeightVh(snapSheetHeight(heightVhRef.current));
  };

  useEffect(() => {
    if (!isDragging) return undefined;

    const onMouseMove = (e) => moveDrag(e.clientY);
    const onMouseUp = () => endDrag();
    const onTouchMove = (e) => {
      e.preventDefault();
      moveDrag(e.touches[0].clientY);
    };
    const onTouchEnd = () => endDrag();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] animate-in fade-in duration-200"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col bg-[#0B0E14] border-t border-white/10 rounded-t-[24px] shadow-2xl overflow-hidden md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[min(100%,32rem)] md:rounded-2xl md:border md:border-white/10"
        style={{
          height: `min(${heightVh}vh, ${SHEET_HEIGHT.maxPx}px)`,
          transition: isDragging ? 'none' : 'height 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div
          className="shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => {
            e.preventDefault();
            beginDrag(e.clientY);
          }}
          onTouchStart={(e) => beginDrag(e.touches[0].clientY)}
        >
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 rounded-full bg-white/25" />
          </div>
          <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white tracking-wide">Comments</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg"
              aria-label="Close comments"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>

        <div className="shrink-0 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-[#0B0E14]">
          {footer}
        </div>
      </div>
    </>,
    document.body
  );
};

const PostFeed = ({ initialPosts, hideHeader = false, scrollToId = null, onPostDeleted }) => {
  const navigate = useNavigate();
  const { user, socket } = useSocket();
  const {
    posts: contextPosts,
    postsLoading: contextLoading,
    fetchFeed,
    handleLike: contextHandleLike,
    handleComment: contextHandleComment,
    handleDeleteComment: contextHandleDeleteComment,
    handleDeletePost: contextHandleDeletePost,
    handleReply: contextHandleReply
  } = useFeed();

  const isLocalMode = !!initialPosts;
  const [localPosts, setLocalPosts] = useState(initialPosts || []);
  const [localLoading, setLocalLoading] = useState(!initialPosts);

  const posts = isLocalMode ? localPosts : contextPosts;
  const loading = isLocalMode ? localLoading : contextLoading;
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === 'PrintScreen' ||
        (e.key === 's' && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
        (e.key === 's' && (e.metaKey || e.ctrlKey))
      ) {
        if (e.key === 'PrintScreen') {
          setShowScreenshotWarning(true);
        } else {
          e.preventDefault();
          setShowScreenshotWarning(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isLocalMode && contextPosts.length === 0) {
      fetchFeed();
    }
  }, [isLocalMode, contextPosts.length]);

  useEffect(() => {
    if (scrollToId && posts.length > 0) {
      const doScroll = () => {
        const el = document.getElementById(`post-${scrollToId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      };
      setTimeout(doScroll, 50);
      setTimeout(doScroll, 350);
    }
  }, [scrollToId, posts]);

  // Handle Socket Events (only in Local Mode, e.g. Profile view)
  useEffect(() => {
    if (!isLocalMode || !socket) return;

    const handleNewPost = (newPost) => {
      setLocalPosts((prev) => {
        if (prev.some((p) => p._id === newPost._id)) return prev;
        return [newPost, ...prev];
      });
    };

    const handlePostUpdated = ({ postId, likes, comments }) => {
      setLocalPosts((prev) =>
        prev.map((post) => {
          if (post._id === postId) {
            const updated = { ...post };
            if (likes !== undefined) updated.likes = likes;
            if (comments !== undefined) updated.comments = comments;
            return updated;
          }
          return post;
        })
      );
    };

    const handlePostDeleted = ({ postId }) => {
      setLocalPosts((prev) => prev.filter((post) => post._id !== postId));
      if (onPostDeleted) onPostDeleted(postId);
    };

    socket.on('new-post', handleNewPost);
    socket.on('post-updated', handlePostUpdated);
    socket.on('post-deleted', handlePostDeleted);

    return () => {
      socket.off('new-post', handleNewPost);
      socket.off('post-updated', handlePostUpdated);
      socket.off('post-deleted', handlePostDeleted);
    };
  }, [socket, isLocalMode, onPostDeleted]);

  // Wrapped Actions
  const handleLike = async (postId) => {
    contextHandleLike(postId);
    if (isLocalMode) {
      const currentUserId = user?._id || user?.id;
      setLocalPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: post.likes.includes(currentUserId)
                  ? post.likes.filter((id) => id !== currentUserId)
                  : [...post.likes, currentUserId]
              }
            : post
        )
      );
    }
  };

  const handleComment = async (postId, text) => {
    const newComment = await contextHandleComment(postId, text);
    if (newComment && isLocalMode) {
      setLocalPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, comments: [...(post.comments || []), newComment] }
            : post
        )
      );
    }
    return !!newComment;
  };

  const handleDeleteComment = async (postId, commentId) => {
    await contextHandleDeleteComment(postId, commentId);
    if (isLocalMode) {
      setLocalPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, comments: post.comments.filter((c) => c._id !== commentId) }
            : post
        )
      );
    }
  };

  const handleDeletePost = async (postId) => {
    await contextHandleDeletePost(postId);
    if (isLocalMode) {
      setLocalPosts((prev) => prev.filter((post) => post._id !== postId));
      if (onPostDeleted) onPostDeleted(postId);
    }
  };

  const handleReply = async (postId, commentId, text) => {
    const newReply = await contextHandleReply(postId, commentId, text);
    if (newReply && isLocalMode) {
      setLocalPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                comments: post.comments.map((c) =>
                  c._id === commentId
                    ? { ...c, replies: [...(c.replies || []), newReply] }
                    : c
                )
              }
            : post
        )
      );
    }
    return !!newReply;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[#151923]/60 rounded-3xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton circle={true} className="w-10 h-10" />
              <div className="space-y-2">
                <Skeleton className="w-24 h-3" />
                <Skeleton className="w-16 h-2" />
              </div>
            </div>
            <Skeleton className="w-full aspect-[4/5] rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Feed Header - Conditionally Hidden for Profile View */}
      {/* {!hideHeader && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-black text-white tracking-tight">Connection Feed</h2>
            <span className="px-1.5 py-0.5 bg-purple-600 text-[8px] font-black uppercase tracking-widest rounded-md text-white">New</span>
          </div>
        </div>
      )} */}

      <div className="flex flex-col gap-2">
        {posts.length === 0 ? (
          <div className="bg-[#151923]/40 border border-dashed border-white/5 rounded-[32px] p-12 text-center">
            <Camera size={32} className="mx-auto mb-4 text-gray-700" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">No moments yet</h3>
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Connect with more people to see their posts</p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <div key={post._id} id={`post-${post._id}`}>
                <PostCard
                  post={post}
                  onLike={() => handleLike(post._id)}
                  onComment={handleComment}
                  onDeleteComment={handleDeleteComment}
                  onDeletePost={handleDeletePost}
                  onReply={handleReply}
                  currentUser={user}
                />
              </div>
            ))}

            {/* Premium "You're All Caught Up" Message */}
            <div className="w-full max-w-xl mt-12 mx-auto px-6 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 ">
              <div className="relative mb-6">
                {/* Glowing background ring */}
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 rounded-full blur-[20px] opacity-40 animate-pulse" />

                {/* Check circle */}
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-500 flex items-center justify-center shadow-2xl overflow-hidden border border-white/20">
                  <div className="absolute inset-0 bg-black/10" />
                  <Check className="w-12 h-12 text-white relative z-10 animate-in zoom-in duration-700 delay-300 drop-shadow-md" strokeWidth={3} />
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
                You're All Caught Up
              </h2>

              <p className="text-sm sm:text-base text-gray-400 font-medium max-w-sm leading-relaxed">
                You've seen all new moments from your connections. Check back later for more!
              </p>
            </div>
          </>
        )}
      </div>

      {showScreenshotWarning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#151923]/95 backdrop-blur-xl border border-red-500/40 p-8 rounded-[32px] shadow-2xl text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-white font-black text-xl mb-2 uppercase tracking-tight">Private Content</h3>
            <p className="text-gray-400 text-xs leading-relaxed mb-6">
              Screenshots and screen recordings are discouraged to protect the privacy of your connections in Ontlo.
            </p>
            <button
              onClick={() => setShowScreenshotWarning(false)}
              className="w-full py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const PostCard = ({ post, onLike, onComment, onDeleteComment, onDeletePost, onReply, currentUser }) => {
  const navigate = useNavigate();
  const currentUserId = currentUser?._id || currentUser?.id;
  const isLiked = post.likes?.includes(currentUserId);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCommentMenu, setActiveCommentMenu] = useState(null);
  const [isPostMenuOpen, setIsPostMenuOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, username }
  const [showFullComments, setShowFullComments] = useState(false);
  const [cropMode, setCropMode] = useState('cover'); // 'cover' or 'contain'
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const touchStartRef = useRef(null);

  const postImages = getPostImages(post);
  const activeImage = postImages[activeImageIndex] || {};
  const activeImageUrl = activeImage.imageUrl ? getOptimizedUrl(activeImage.imageUrl, 2000) : '';

  const originalRatio = activeImage.width && activeImage.height ? activeImage.width / activeImage.height : 1;
  const instagramRatio = Math.min(Math.max(originalRatio, 0.8), 1.91);

  const goToPrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + postImages.length) % postImages.length);
  };

  const goToNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % postImages.length);
  };

  useEffect(() => {
    setActiveImageIndex(0);
  }, [post._id]);

  useEffect(() => {
    setImageLoaded(false);
  }, [activeImageUrl, activeImageIndex]);

  const handleCarouselTouchStart = (e) => {
    if (postImages.length <= 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleCarouselTouchEnd = (e) => {
    if (!touchStartRef.current || postImages.length <= 1) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const SWIPE_THRESHOLD = 50;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (deltaX < 0) goToNextImage();
    else goToPrevImage();
  };

  const handleDoubleTap = (e) => {
    e.preventDefault();
    if (!isLiked) {
      onLike();
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);
  };

  const handleSubmitComment = async (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      if (!commentText.trim() || isSubmitting) return;
      setIsSubmitting(true);

      let success = false;
      if (replyingTo) {
        success = await onReply(post._id, replyingTo.commentId, commentText);
      } else {
        success = await onComment(post._id, commentText);
      }

      if (success) {
        setCommentText('');
        setReplyingTo(null);
      }
      setIsSubmitting(false);
    }
  };

  // Privacy Filter for comments
  const filteredComments = (post.comments || []).filter(comment => {
    const commentUserId = typeof comment.user === 'object' ? comment.user?._id : comment.user;
    return post.user?._id === currentUserId || commentUserId === currentUserId;
  });

  // Latest 2 comments for the feed preview
  const previewComments = filteredComments.slice(-2);

  return (
    <div className="bg-transparent border-b border-white/[0.05] pb-4 animate-in fade-in duration-700 w-full max-w-xl mx-auto flex flex-col ">
      {/* Author Header */}
      <div className="flex-none flex items-center justify-between p-2 pt-0 sm:px-2 md:px-0">
        <div
          onClick={() => navigate("/profile", { state: { userProfile: post.user } })}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 group-hover:border-purple-500 transition">
            <img src={getOptimizedUrl(post.user?.profilePic, 200)} className="w-full h-full object-contain" alt="User" loading="lazy" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] text-white tracking-wider group-hover:text-purple-400 transition">{post.user?.username}</h4>
              {/* <div className="w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                <Send size={7} className="text-white fill-current" />
              </div> */}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              <span>{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-gray-800">•</span>
              <div className="flex items-center gap-1">
                <Users size={10} />
                <span>Connections</span>
              </div>
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setIsPostMenuOpen(!isPostMenuOpen)}
            className="text-gray-700 hover:text-white transition-colors p-2"
          >
            <MoreHorizontal size={20} />
          </button>

          {isPostMenuOpen && (
            <div className="absolute right-0 top-10 z-50 bg-[#151923] border border-white/10 rounded-sm shadow-sm overflow-hidden min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
              {currentUserId === post.user?._id && (
                <button
                  onClick={() => {
                    onDeletePost(post._id);
                    setIsPostMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm   text-red-500 hover:bg-white/5 transition-colors"
                >
                  Delete
                </button>
              )}
              <button className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-white/5 transition-colors">
                Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="flex-none px-2 pb-0 sm:px-2 md:px-0">
          <p className="text-sm text-gray-300 leading-relaxed font-medium">
            {post.caption}
          </p>
        </div>
      )}

      {/* Media */}
      <div
        onDoubleClick={handleDoubleTap}
        onTouchStart={handleCarouselTouchStart}
        onTouchEnd={handleCarouselTouchEnd}
        className="w-full bg-[#151923]/30 relative flex items-center justify-center overflow-hidden my-3 group select-none touch-pan-y"
        style={{
          aspectRatio: cropMode === 'cover' ? instagramRatio : originalRatio
        }}
      >
        {!imageLoaded && activeImageUrl && (
          <Skeleton className="absolute inset-0 w-full h-full rounded-none z-10" />
        )}
        {activeImageUrl && (
          <img
            key={activeImageUrl}
            src={activeImageUrl}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
            className={`w-full h-full ${cropMode === 'cover' ? 'object-cover' : 'object-contain'} transition-opacity duration-300 ease-out pointer-events-none ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            alt="Post Media"
            loading="lazy"
            decoding="async"
          />
        )}

        {postImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevImage}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/45 text-white rounded-full z-20"
              aria-label="Previous image"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goToNextImage}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/45 text-white rounded-full z-20"
              aria-label="Next image"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
              {postImages.map((_, idx) => (
                <button
                  key={`${post._id}-dot-${idx}`}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${activeImageIndex === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
                  aria-label={`Open image ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}



        {/* Double Tap Heart Animation Overlay */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <Heart
              size={110}
              className="
        text-pink-500
        fill-pink-500
        opacity-0
        scale-50
        animate-[heartPop_900ms_cubic-bezier(0.22,1,0.36,1)_forwards]
        drop-shadow-[0_0_12px_rgba(236,72,153,0.7)]
      "
              style={{
                filter:
                  'drop-shadow(0 0 12px rgba(236,72,153,0.7)) drop-shadow(0 0 30px rgba(236,72,153,0.35))',
              }}
            />

            <style>
              {`
        @keyframes heartPop {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }

          15% {
            transform: scale(1.25);
            opacity: 1;
          }

          30% {
            transform: scale(0.92);
          }

          45% {
            transform: scale(1.08);
          }

          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
      `}
            </style>
          </div>
        )}

        {/* Aspect Ratio / Crop Toggle Button */}
        {activeImage.width && activeImage.height && (
          <button
            onClick={() => setCropMode(prev => prev === 'cover' ? 'contain' : 'cover')}
            className="absolute bottom-4 left-4 p-2.5 bg-black/40 hover:bg-black/60 active:scale-95 text-white/80 hover:text-white rounded-xl backdrop-blur-md border border-white/10 transition-all z-20 flex items-center justify-center opacity-70 md:opacity-0 md:group-hover:opacity-100 duration-300 shadow-lg"
            title={cropMode === 'cover' ? "Show full image" : "Crop to feed"}
          >
            {cropMode === 'cover' ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
        )}
      </div>

      {/* Interactions & Comments Footer */}
      <div className="flex-none space-y-2 pt-2 pb-2">
        <div className="flex items-center gap-6 px-2 sm:px-2 md:px-0">
          <button
            onClick={onLike}
            className={`flex items-center gap-2 transition-all ${isLiked ? "" : "text-gray-400 hover:text-white"
              }`}
          >
            <Heart
              size={24}
              className={isLiked ? "text-transparent" : ""}
              fill={isLiked ? "url(#likeGradient)" : "none"}
              stroke={isLiked ? "url(#likeGradient)" : "currentColor"}
            />

            <span className="text-sm font-bold tracking-tight">
              {post.likes?.length || 0} Likes
            </span>

            <svg width="0" height="0">
              <defs>
                <linearGradient id="likeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff255f" />
                  <stop offset="50%" stopColor="#c026ff" />
                  <stop offset="100%" stopColor="#5b2dff" />
                </linearGradient>
              </defs>
            </svg>
          </button>
          <button onClick={() => setShowFullComments(true)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-all">
            <MessageCircle size={24} />
            <span className="text-sm font-bold tracking-tight">{filteredComments.length} Comments</span>
          </button>
        </div>

        {/* Feed Preview Comments */}
        {filteredComments.length > 0 && (
          <div className="px-5 sm:px-4 md:px-0 pt-1 space-y-1.5">
            {filteredComments.length > 2 && (
              <button
                onClick={() => setShowFullComments(true)}
                className="text-[12px] font-bold text-gray-600 hover:text-gray-400 transition-colors py-0.5"
              >
                View all {filteredComments.length} comments
              </button>
            )}
            {previewComments.map((comment, idx) => (
              <div key={idx} className="flex gap-2 items-start animate-in fade-in duration-300">
                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 mt-0.5 border border-white/10">
                  <img
                    src={getOptimizedUrl(comment.user?.profilePic, 100)}
                    className="w-full h-full object-cover"
                    alt="User"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[12px] text-gray-300 leading-snug">
                    <span className="font-normal text-white mr-2">
                      {typeof comment.user === 'object' ? comment.user?.username : 'User'}
                    </span>
                    {comment.text}
                  </p>
                  <button
                    onClick={() => {
                      setReplyingTo({ commentId: comment._id, username: typeof comment.user === 'object' ? comment.user?.username : 'User' });
                      setShowFullComments(true);
                    }}
                    className="text-[9px] font-semibold text-gray-600 hover:text-purple-400 mt-0.5"
                  >
                    Reply..
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CommentsSheet
        open={showFullComments}
        onClose={() => {
          setShowFullComments(false);
          setReplyingTo(null);
        }}
        footer={
          <>
            {replyingTo && (
              <div className="flex items-center justify-between px-4 py-2 border-l-2 border-purple-500 mb-2">
                <span className="text-[10px] text-purple-400 font-bold tracking-widest">
                  Replying to {replyingTo.username}
                </span>
                <button type="button" onClick={() => setReplyingTo(null)} className="text-gray-500">
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 bg-[#151923] rounded-2xl px-4 py-2 border border-white/[0.03]">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleSubmitComment}
                placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : 'Add a comment...'}
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-700"
              />
              <button
                type="button"
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
                className={`p-2 transition-all ${commentText.trim() ? 'scale-110' : 'text-gray-800'}`}
              >
                <Send
                  size={20}
                  className="rotate-[45deg] opacity-80"
                  style={
                    commentText.trim()
                      ? { stroke: 'url(#sendGradient2)', fill: 'url(#sendGradient2)' }
                      : {}
                  }
                />
              </button>
              <svg width="0" height="0" aria-hidden="true">
                <defs>
                  <linearGradient id="sendGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff255f" />
                    <stop offset="50%" stopColor="#c026ff" />
                    <stop offset="100%" stopColor="#5b2dff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </>
        }
      >
        {filteredComments.length === 0 ? (
          <div className="flex items-center justify-center py-16 opacity-40">
            <p className="text-lg text-gray-500">No comments yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredComments.map((comment, idx) => {
              const commentUserId =
                typeof comment.user === 'object' ? comment.user?._id : comment.user;

              const canDelete =
                currentUser?._id === post.user?._id || currentUser?._id === commentUserId;

              return (
                <div key={comment._id || idx} className="space-y-4">
                  <div className="flex gap-3 relative group/comment">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                      <img
                        src={getOptimizedUrl(comment.user?.profilePic, 200)}
                        className="w-full h-full object-cover"
                        alt="User"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <p className="text-[13px] text-gray-200 break-words">
                            <span className="font-bold text-white mr-2">
                              {typeof comment.user === 'object' ? comment.user?.username : 'User'}
                            </span>
                            {comment.text}
                          </p>

                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setReplyingTo({
                                  commentId: comment._id,
                                  username:
                                    typeof comment.user === 'object'
                                      ? comment.user?.username
                                      : 'User',
                                })
                              }
                              className="text-[10px] font-black text-gray-500 hover:text-purple-400"
                            >
                              Reply
                            </button>
                          </div>
                        </div>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => onDeleteComment(post._id, comment._id)}
                            className="text-gray-800 hover:text-red-500 transition-colors p-1 shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-4 space-y-4 pt-2 border-l border-white/10 pl-6 mt-1">
                      {comment.replies
                        .filter((reply) => {
                          const rUid = typeof reply.user === 'object' ? reply.user?._id : reply.user;

                          if (post.user?._id === currentUser?._id) return true;
                          if (rUid === currentUser?._id) return true;
                          if (rUid === post.user?._id && commentUserId === currentUser?._id) return true;

                          return false;
                        })
                        .map((reply, ridx) => (
                          <div key={reply._id || ridx} className="flex gap-3 items-start">
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/5 shrink-0 mt-0.5">
                              <img
                                src={reply.user?.profilePic}
                                className="w-full h-full object-cover"
                                alt="User"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] text-gray-300 leading-normal break-words">
                                <span className="font-bold text-white mr-2">{reply.user?.username}</span>
                                {reply.text}
                              </p>

                              <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-1 inline-block">
                                {new Date(reply.createdAt).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CommentsSheet>

      {/* Main Feed Comment Input (When Modal is Closed) */}
      {!showFullComments && (
        <div className="px-5 pt-4">
          <div className="min-h-auto">
            {replyingTo && (
              <div className="flex items-center justify-between px-4 py-1.5 bg-purple-500/10 border-l-2 border-purple-500 mb-2 animate-in slide-in-from-bottom-2 duration-300">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">
                  <span>Replying to </span>
                  <span className="text-white">{replyingTo.username}</span>
                </span>
                <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white p-1">
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-white/5 flex-shrink-0">
              <img src={currentUser?.profilePic} className="w-full h-full object-cover" alt="User" />
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleSubmitComment}
                disabled={isSubmitting}
                placeholder={isSubmitting ? "Sending..." : (replyingTo ? `Reply to ${replyingTo.username}...` : "Add a comment...")}
                className="w-full bg-[#11141D] border border-white/[0.03] focus:border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-gray-700 outline-none transition-all pr-14 disabled:opacity-50"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="min-w-[24px] flex justify-center">
                  {commentText.trim() && !isSubmitting && (
                    <button
                      onClick={handleSubmitComment}
                      className="p-1 transition-all animate-in fade-in zoom-in duration-300 hover:scale-110"
                    >
                      <svg width="0" height="0">
                        <defs>
                          <linearGradient id="sendGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff255f" />
                            <stop offset="50%" stopColor="#c026ff" />
                            <stop offset="100%" stopColor="#5b2dff" />
                          </linearGradient>
                        </defs>
                      </svg>

                      <Send
                        size={18}
                        className="rotate-[45deg] opacity-90"
                        style={{
                          stroke: "url(#sendGradient)",
                          fill: "url(#sendGradient)",
                        }}
                      />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostFeed;

