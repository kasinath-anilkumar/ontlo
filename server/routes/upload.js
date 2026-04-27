const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    console.warn('No token provided in upload request');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error('JWT Verification failed in upload:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Single image upload
router.post('/profile-pic', authenticate, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer/Cloudinary Error:', err);
      return res.status(500).json({ error: 'Cloudinary upload failed', details: err.message });
    }
    
    console.log('Upload request received for user:', req.userId);
    if (!req.file) {
      console.warn('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('File uploaded to Cloudinary:', req.file.path);
    res.json({ url: req.file.path });
  });
});

// Chat image upload
router.post('/chat-image', authenticate, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(500).json({ error: 'Upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No file' });
    res.json({ url: req.file.path });
  });
});

module.exports = router;
