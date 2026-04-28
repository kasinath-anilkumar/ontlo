const express = require('express');
const router = express.Router();
const { upload, uploadImage } = require('../config/cloudinary');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

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
  upload.single('image')(req, res, async (err) => {
    if (err) {
      console.error('Multer/Cloudinary Error:', err);
      return res.status(500).json({ error: 'Cloudinary upload failed', details: err.message });
    }
    
    console.log('Upload request received for user:', req.userId);
    if (!req.file) {
      console.warn('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const result = await uploadImage(req.file, 'ontlo_profiles');
      console.log('File uploaded to Cloudinary:', result.secure_url);
      res.json({ url: result.secure_url });
    } catch (uploadErr) {
      console.error('Cloudinary upload failed:', uploadErr.message);
      res.status(500).json({ error: 'Cloudinary upload failed', details: uploadErr.message });
    }
  });
});

// Chat image upload
router.post('/chat-image', authenticate, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(500).json({ error: 'Upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No file' });
    try {
      const result = await uploadImage(req.file, 'ontlo_chat');
      res.json({ url: result.secure_url });
    } catch (uploadErr) {
      res.status(500).json({ error: 'Upload failed', details: uploadErr.message });
    }
  });
});

module.exports = router;
