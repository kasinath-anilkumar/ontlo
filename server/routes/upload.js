const express = require('express');

const router = express.Router();

const {
  upload,
  uploadImage
} = require('../config/cloudinary');

const auth = require('../middleware/auth');



// ======================================================
// ALLOWED MIME TYPES
// ======================================================

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];



// ======================================================
// REUSABLE IMAGE UPLOAD HANDLER
// ======================================================

const handleImageUpload = (folder) => {

  return async (req, res) => {

    upload.single('image')(req, res, async (err) => {

      try {

        // ======================================================
        // MULTER/CLOUDINARY ERROR
        // ======================================================

        if (err) {

          console.error(
            '[UPLOAD ERROR]:',
            err
          );

          return res.status(500).json({
            error: 'Upload failed'
          });
        }

        // ======================================================
        // FILE REQUIRED
        // ======================================================

        if (!req.file) {

          return res.status(400).json({
            error: 'No image uploaded'
          });
        }

        // ======================================================
        // MIME TYPE VALIDATION
        // ======================================================

        if (
          !ALLOWED_IMAGE_TYPES.includes(
            req.file.mimetype
          )
        ) {

          return res.status(400).json({
            error:
              'Only JPG, PNG and WEBP images allowed'
          });
        }

        // ======================================================
        // FILE SIZE LIMIT
        // ======================================================

        const MAX_SIZE =
          5 * 1024 * 1024; // 5MB

        if (req.file.size > MAX_SIZE) {

          return res.status(400).json({
            error:
              'Image size exceeds 5MB limit'
          });
        }

        // ======================================================
        // UPLOAD TO CLOUDINARY
        // ======================================================

        const result = await uploadImage(
          req.file,
          folder
        );

        if (!result?.secure_url) {

          return res.status(500).json({
            error:
              'Image upload failed'
          });
        }

        // ======================================================
        // SUCCESS RESPONSE
        // ======================================================

        res.json({
          url: result.secure_url
        });

      } catch (uploadError) {

        console.error(
          '[CLOUDINARY ERROR]:',
          uploadError
        );

        res.status(500).json({
          error: 'Upload failed'
        });
      }
    });
  };
};



// ======================================================
// PROFILE PICTURE UPLOAD
// ======================================================

router.post(
  '/profile-pic',
  auth,
  handleImageUpload('ontlo_profiles')
);



// ======================================================
// CHAT IMAGE UPLOAD
// ======================================================

router.post(
  '/chat-image',
  auth,
  handleImageUpload('ontlo_chat')
);



module.exports = router;