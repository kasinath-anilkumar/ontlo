const express = require('express');
const router = express.Router();
const { upload, uploadImage } = require('../config/cloudinary');
const auth = require('../middleware/auth');

// Single image upload
router.post('/profile-pic', auth, (req, res) => {
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
router.post('/chat-image', auth, (req, res) => {
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
