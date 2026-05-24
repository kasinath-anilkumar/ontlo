import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, MoreHorizontal, Send, X, Users, Smile, Trash2, ChevronDown, Camera, Maximize2, Minimize2, Check } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import Skeleton from './ui/Skeleton';
import API_URL, { apiFetch } from '../utils/api';

const getOptimizedUrl = (url, width = 1200) => {
  if (!url || typeof url !== 'string' || !url.includes('/upload/')) return url;
  if (url.includes('/upload/q_auto')) return url;
  return url.replace('/upload/', `/upload/q_auto:good,f_auto,w_${width}/`);
};

const PostFeed = ({ initialPosts, hideHeader = false, scrollToId = null, onPostDeleted }) => {
  const navigate = useNavigate();
  const { user } = useSocket();
  const [posts, setPosts] = useState(initialPosts || []);
  const [loading, setLoading] = useState(!initialPosts);

  useEffect(() => {
    if (!initialPosts) {
      fetchFeed();
    }
  }, [initialPosts]);

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

  const fetchFeed = async () => {
    try {
      const res = await apiFetch(`${API_URL}/api/posts/feed`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch feed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await apiFetch(`${API_URL}/api/posts/${postId}/like`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(posts.map(post =>
          post._id === postId
            ? { ...post, likes: data.isLiked ? [...post.likes, user._id] : post.likes.filter(id => id !== user._id) }
            : post
        ));
      }
    } catch (err) {
      console.error('Failed to like post', err);
    }
  };

  const handleComment = async (postId, text) => {
    if (!text.trim()) return;
    try {
      const res = await apiFetch(`${API_URL}/api/posts/${postId}/comment`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const newComment = await res.json();
        // Update local state instantly
        setPosts(posts.map(post =>
          post._id === postId
            ? { ...post, comments: [...(post.comments || []), newComment] }
            : post
        ));
        return true;
      }
    } catch (err) {
      console.error('Failed to post comment', err);
    }
    return false;
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await apiFetch(`${API_URL}/api/posts/${postId}/comment/${commentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPosts(posts.map(post =>
          post._id === postId
            ? { ...post, comments: post.comments.filter(c => c._id !== commentId) }
            : post
        ));
      }
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const res = await apiFetch(`${API_URL}/api/posts/${postId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Remove the post from local state instantly
        setPosts(posts.filter(post => post._id !== postId));
        if (onPostDeleted) onPostDeleted(postId);
      }
    } catch (err) {
      console.error('Failed to delete post', err);
    }
  };

  const handleReply = async (postId, commentId, text) => {
    if (!text.trim()) return;
    try {
      const res = await apiFetch(`${API_URL}/api/posts/${postId}/comment/${commentId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const newReply = await res.json();
        setPosts(posts.map(post =>
          post._id === postId
            ? {
              ...post,
              comments: post.comments.map(c =>
                c._id === commentId
                  ? { ...c, replies: [...(c.replies || []), newReply] }
                  : c
              )
            }
            : post
        ));
        return true;
      }
    } catch (err) {
      console.error('Failed to reply', err);
    }
    return false;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map(i => (
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

      <div className="flex flex-col gap-6">
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
            <div className="w-full max-w-xl mx-auto px-6 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 ">
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

  const originalRatio = post.width && post.height ? post.width / post.height : 1;
  const instagramRatio = Math.min(Math.max(originalRatio, 0.8), 1.91);

  const handleDoubleTap = (e) => {
    e.preventDefault();
    if (!isLiked) {
      onLike();
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);
  };

  // Lock scroll when modal is open to stabilize DOM for external scripts
  useEffect(() => {
    if (showFullComments) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showFullComments]);

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
    <div className="bg-transparent border-b border-white/[0.05] pb-8 mb-4 animate-in fade-in duration-700 w-full max-w-xl mx-auto flex flex-col my-4">
      {/* Author Header */}
      <div className="flex-none flex items-center justify-between p-2 pt-0 sm:px-2 md:px-0">
        <div
          onClick={() => navigate("/profile", { state: { userProfile: post.user } })}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 group-hover:border-purple-500 transition">
            <img src={getOptimizedUrl(post.user?.profilePic, 200) || 'https://via.placeholder.com/150'} className="w-full h-full object-contain" alt="User" loading="lazy" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-[13px] font-bold text-white tracking-tight group-hover:text-purple-400 transition">{post.user?.username}</h4>
              <div className="w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                <Send size={7} className="text-white fill-current" />
              </div>
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
        <div className="flex-none px-2 pb-2 sm:px-2 md:px-0">
          <p className="text-sm text-gray-300 leading-relaxed font-medium">
            {post.caption}
          </p>
        </div>
      )}

      {/* Media */}
      <div
        onDoubleClick={handleDoubleTap}
        className="w-full bg-[#151923]/30 relative flex items-center justify-center overflow-hidden my-3 group select-none touch-manipulation"
        style={{
          aspectRatio: cropMode === 'cover' ? instagramRatio : originalRatio
        }}
      >
        <img
          src={getOptimizedUrl(post.imageUrl, 2000)}
          className={`w-full h-full ${cropMode === 'cover' ? 'object-cover' : 'object-contain'} transition-all duration-500 ease-out pointer-events-none`}
          alt="Post Media"
          loading="lazy"
        />

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
        {post.width && post.height && (
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
          <button onClick={onLike} className={`flex items-center gap-2 transition-all ${isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-white'}`}>
            <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
            <span className="text-sm font-bold tracking-tight">{post.likes?.length || 0} Likes</span>
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
                    src={getOptimizedUrl(comment.user?.profilePic, 100) || 'https://via.placeholder.com/150'}
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

      {/* FULL COMMENT SECTION MODAL / OVERLAY - PORTALED TO TOP LEVEL */}
      {showFullComments && createPortal(
        <>
          {/* Backdrop */}
          <div
            onClick={() => {
              setShowFullComments(false);
              setReplyingTo(null);
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] animate-in fade-in duration-300"
          />

          <div className="fixed bottom-0 top-auto left-0 right-0 h-[75vh] md:h-auto md:inset-y-0 md:left-64 md:right-0 md:xl:right-80 z-[100] bg-[#0B0E14] border-t md:border-t-0 border-white/10 md:border-r md:border-white/5 rounded-t-[24px] md:rounded-t-none animate-in slide-in-from-bottom duration-300 md:animate-in md:fade-in flex flex-col shadow-2xl overflow-hidden">
            {/* Grab Handle for Mobile */}
            <div className="md:hidden w-full flex justify-center py-2.5 shrink-0 bg-[#0B0E14]">
              <div className="w-12 h-1 bg-white/20 rounded-full"></div>
            </div>

            {/* Modal Header */}
            {/* <div className="flex items-center justify-between p-4 px-5 border-b border-white/5 bg-[#0B0E14] sticky top-0 z-10">
              <h3 className="text-[11px] font-thin text-white">Comments</h3>
              <button
                onClick={() => {
                  setShowFullComments(false);
                  setReplyingTo(null);
                }}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div> */}

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-32">
              {filteredComments.map((comment, idx) => {
                const commentUserId = typeof comment.user === 'object' ? comment.user?._id : comment.user;
                const canDelete = currentUser?._id === post.user?._id || currentUser?._id === commentUserId;

                return (
                  <div key={idx} className="space-y-4">
                    <div className="flex gap-3 relative group/comment">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                        <img src={getOptimizedUrl(comment.user?.profilePic, 200) || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="User" loading="lazy" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-[13px] text-gray-200">
                              <span className="font-bold text-white mr-2">{typeof comment.user === 'object' ? comment.user?.username : 'User'}</span>
                              {comment.text}
                            </p>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{new Date(comment.createdAt).toLocaleDateString()}</span>
                              <button
                                onClick={() => setReplyingTo({ commentId: comment._id, username: typeof comment.user === 'object' ? comment.user?.username : 'User' })}
                                className="text-[10px] font-black text-gray-500 hover:text-purple-400"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                          {canDelete && (
                            <button onClick={() => onDeleteComment(post._id, comment._id)} className="text-gray-800 hover:text-red-500 transition-colors p-1">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies in Modal - Premium Thread UI */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-4 space-y-4 pt-2 border-l border-white/10 pl-6 mt-1">
                        {comment.replies.filter(reply => {
                          const rUid = typeof reply.user === 'object' ? reply.user?._id : reply.user;
                          if (post.user?._id === currentUser?._id) return true;
                          if (rUid === currentUser?._id) return true;
                          if (rUid === post.user?._id && commentUserId === currentUser?._id) return true;
                          return false;
                        }).map((reply, ridx) => (
                          <div key={ridx} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/5 flex-shrink-0 mt-0.5">
                              <img
                                src={reply.user?.profilePic || 'https://via.placeholder.com/150'}
                                className="w-full h-full object-cover"
                                alt="User"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-[11px] text-gray-300 leading-normal">
                                <span className="font-bold text-white mr-2">{reply.user?.username}</span>
                                {reply.text}
                              </p>
                              <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-1 inline-block">
                                {new Date(reply.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
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

            {/* Modal Sticky Input Box */}
            <div className="sticky bottom-0 w-full p-4 bg-[#0B0E14] border-t border-white/10 z-20 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
              {replyingTo && (
                <div className="flex items-center justify-between px-4 py-2 border-l-2 border-purple-500 mb-2 animate-in slide-in-from-bottom-2 duration-300">
                  <span className="text-[10px] text-purple-400 font-bold tracking-widest">Replying to {replyingTo.username}</span>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-500"><X size={14} /></button>
                </div>
              )}
              <div className="flex items-center gap-3 bg-[#151923] rounded-2xl px-4 py-2 border border-white/[0.03] shadow-2xl">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleSubmitComment}
                  placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Add a comment..."}
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-700"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                  className={`p-2 transition-all ${commentText.trim() ? 'text-purple-400 scale-110' : 'text-gray-800'}`}
                >
                  <Send size={20} className="rotate-[-10deg] fill-current opacity-80" />
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

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
              <img src={currentUser?.profilePic || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="User" />
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
                <Smile size={16} className="text-gray-700 hover:text-purple-400 transition-colors cursor-pointer" />
                <div className="min-w-[24px] flex justify-center">
                  {commentText.trim() && !isSubmitting && (
                    <button
                      onClick={handleSubmitComment}
                      className="p-1 text-purple-400 hover:text-purple-300 transition-colors animate-in fade-in zoom-in duration-300"
                    >
                      <Send size={18} className="rotate-[-10deg] fill-current opacity-80" />
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

