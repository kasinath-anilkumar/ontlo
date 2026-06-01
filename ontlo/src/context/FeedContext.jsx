import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import API_URL, { apiFetch } from '../utils/api';

const FeedContext = createContext();

export const useFeed = () => useContext(FeedContext);

export const FeedProvider = ({ children }) => {
  const { socket, user } = useSocket();
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // Clear posts on logout
  useEffect(() => {
    if (!user) {
      setPosts([]);
      setPostsLoading(true);
    }
  }, [user]);

  // Fetch posts feed
  const fetchFeed = async (force = false) => {
    if (!force && posts.length > 0) return; // cache hit
    setPostsLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/api/posts/feed`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch posts feed:', err);
    } finally {
      setPostsLoading(false);
    }
  };

  // Setup Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewPost = (newPost) => {
      setPosts((prev) => {
        // Prevent duplicate entries
        if (prev.some(p => p._id === newPost._id)) return prev;
        return [newPost, ...prev];
      });
    };

    const handlePostUpdated = ({ postId, likes, comments }) => {
      setPosts((prev) =>
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
      setPosts((prev) => prev.filter((post) => post._id !== postId));
    };

    socket.on('new-post', handleNewPost);
    socket.on('post-updated', handlePostUpdated);
    socket.on('post-deleted', handlePostDeleted);

    return () => {
      socket.off('new-post', handleNewPost);
      socket.off('post-updated', handlePostUpdated);
      socket.off('post-deleted', handlePostDeleted);
    };
  }, [socket]);

  // Actions
  const handleLike = async (postId) => {
    const currentUserId = user?._id || user?.id;
    if (!currentUserId) return;

    let originalLikes = [];

    // 1. Update UI optimistically
    setPosts((prev) =>
      prev.map((post) => {
        if (post._id === postId) {
          originalLikes = post.likes || [];
          const isCurrentlyLiked = originalLikes.includes(currentUserId);
          return {
            ...post,
            likes: isCurrentlyLiked
              ? originalLikes.filter((id) => id !== currentUserId)
              : [...originalLikes, currentUserId]
          };
        }
        return post;
      })
    );

    // 2. Fire API call in background
    try {
      const res = await apiFetch(`${API_URL}/api/posts/${postId}/like`, {
        method: 'POST'
      });
      if (!res.ok) {
        // Rollback on non-ok status
        setPosts((prev) =>
          prev.map((post) =>
            post._id === postId ? { ...post, likes: originalLikes } : post
          )
        );
      } else {
        const data = await res.json();
        // Sync with absolute state from database response
        setPosts((prev) =>
          prev.map((post) =>
            post._id === postId
              ? {
                  ...post,
                  likes: data.isLiked
                    ? [...(post.likes.filter((id) => id !== currentUserId)), currentUserId]
                    : post.likes.filter((id) => id !== currentUserId)
                }
              : post
          )
        );
      }
    } catch (err) {
      console.error('Failed to like post:', err);
      // Rollback on network/execution failure
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId ? { ...post, likes: originalLikes } : post
        )
      );
    }
  };

  const handleComment = async (postId, text) => {
    if (!text.trim()) return false;
    try {
      const res = await apiFetch(`${API_URL}/api/posts/${postId}/comment`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const newComment = await res.json();
        setPosts((prev) =>
          prev.map((post) =>
            post._id === postId
              ? { ...post, comments: [...(post.comments || []), newComment] }
              : post
          )
        );
        return newComment;
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
    return false;
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await apiFetch(`${API_URL}/api/posts/${postId}/comment/${commentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPosts((prev) =>
          prev.map((post) =>
            post._id === postId
              ? { ...post, comments: post.comments.filter((c) => c._id !== commentId) }
              : post
          )
        );
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const res = await apiFetch(`${API_URL}/api/posts/${postId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((post) => post._id !== postId));
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const handleReply = async (postId, commentId, text) => {
    if (!text.trim()) return false;
    try {
      const res = await apiFetch(`${API_URL}/api/posts/${postId}/comment/${commentId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const newReply = await res.json();
        setPosts((prev) =>
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
        return newReply;
      }
    } catch (err) {
      console.error('Failed to reply:', err);
    }
    return false;
  };

  return (
    <FeedContext.Provider
      value={{
        posts,
        setPosts,
        postsLoading,
        fetchFeed,
        handleLike,
        handleComment,
        handleDeleteComment,
        handleDeletePost,
        handleReply
      }}
    >
      {children}
    </FeedContext.Provider>
  );
};
