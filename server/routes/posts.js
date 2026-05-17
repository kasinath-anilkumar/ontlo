const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Connection = require('../models/Connection');
const auth = require('../middleware/auth');
const { moderateText } = require('../utils/moderation');

// ======================================================
// GET CONNECTION FEED
// ======================================================
router.get('/feed', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    // 1. Find all active connections for the user
    const connections = await Connection.find({
      users: userId,
      status: 'active'
    }).lean();

    // 2. Extract IDs of connected users
    const connectionIds = connections.map(conn => 
      conn.users.find(id => id.toString() !== userId.toString())
    );

    // Add self to the list to see own posts in feed
    const authors = [...connectionIds, userId];

    // 3. Fetch posts from these authors
    const posts = await Post.find({
      user: { $in: authors },
      visibility: { $in: ['connections', 'public'] }
    })
    .populate('user', 'username profilePic')
    .populate('comments.user', 'username profilePic')
    .populate('comments.replies.user', 'username profilePic')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

    res.json(posts);
  } catch (error) {
    console.error('[POST FEED ERROR]:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// ======================================================
// GET USER'S OWN POSTS
// ======================================================
router.get('/my-posts', auth, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.userId })
      .populate('user', 'username profilePic')
      .populate('comments.user', 'username profilePic')
      .populate('comments.replies.user', 'username profilePic')
      .sort({ createdAt: -1 })
      .lean();
    res.json(posts);
  } catch (error) {
    console.error('[MY POSTS ERROR]:', error);
    res.status(500).json({ error: 'Failed to fetch your posts' });
  }
});

// ======================================================
// GET POSTS BY USER ID
// ======================================================
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const posts = await Post.find({ 
      user: req.params.userId,
      visibility: { $in: ['connections', 'public'] }
    })
      .populate('user', 'username profilePic')
      .populate('comments.user', 'username profilePic')
      .populate('comments.replies.user', 'username profilePic')
      .sort({ createdAt: -1 })
      .lean();
    res.json(posts);
  } catch (error) {
    console.error('[USER POSTS ERROR]:', error);
    res.status(500).json({ error: 'Failed to fetch user posts' });
  }
});

// ======================================================
// CREATE NEW POST
// ======================================================
router.post('/', auth, async (req, res) => {
  try {
    const { imageUrl, caption, visibility, width, height } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const moderation = moderateText(caption || '');
    
    const post = await Post.create({
      user: req.userId,
      imageUrl,
      width,
      height,
      caption: moderation.text,
      visibility: visibility || 'connections'
    });

    const populatedPost = await post.populate('user', 'username profilePic');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('[CREATE POST ERROR]:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// ======================================================
// LIKE/UNLIKE POST
// ======================================================
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const userId = new mongoose.Types.ObjectId(req.userId);
    const index = post.likes.indexOf(userId);

    if (index === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(index, 1);
    }

    await post.save();
    res.json({ likes: post.likes.length, isLiked: index === -1 });
  } catch (error) {
    console.error('[LIKE POST ERROR]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================================================
// ADD COMMENT
// ======================================================
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text required' });

    const moderation = moderateText(text);
    
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.comments.push({
      user: req.userId,
      text: moderation.text,
      createdAt: new Date()
    });

    await post.save();
    
    const populatedPost = await post.populate('comments.user', 'username profilePic');
    res.json(populatedPost.comments[populatedPost.comments.length - 1]);
  } catch (error) {
    console.error('[COMMENT POST ERROR]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================================================
// DELETE POST
// ======================================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (post.user.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('[DELETE POST ERROR]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================================================
// DELETE COMMENT
// ======================================================
router.delete('/:postId/comment/:commentId', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const commentIndex = post.comments.findIndex(c => c._id.toString() === commentId);
    if (commentIndex === -1) return res.status(404).json({ error: 'Comment not found' });

    const comment = post.comments[commentIndex];
    
    // Permission Check: Post Owner OR Comment Author
    if (post.user.toString() !== req.userId && comment.user.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    post.comments.splice(commentIndex, 1);
    await post.save();

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('[DELETE COMMENT ERROR]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ======================================================
// ADD REPLY TO COMMENT
// ======================================================
router.post('/:postId/comment/:commentId/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Reply text required' });

    const moderation = moderateText(text);
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    comment.replies.push({
      user: req.userId,
      text: moderation.text,
      createdAt: new Date()
    });

    await post.save();
    
    const populatedPost = await post.populate('comments.replies.user', 'username profilePic');
    const updatedComment = populatedPost.comments.id(req.params.commentId);
    res.json(updatedComment.replies[updatedComment.replies.length - 1]);
  } catch (error) {
    console.error('[REPLY COMMENT ERROR]:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
