const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    imageUrl: {
      type: String
    },

    width: {
      type: Number
    },

    height: {
      type: Number
    },

    images: [
      {
        imageUrl: {
          type: String,
          required: true
        },
        width: {
          type: Number
        },
        height: {
          type: Number
        }
      }
    ],

    caption: {
      type: String,
      trim: true,
      maxlength: 500
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: 200
        },
        createdAt: {
          type: Date,
          default: Date.now
        },
        replies: [
          {
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
              required: true
            },
            text: {
              type: String,
              required: true,
              trim: true,
              maxlength: 200
            },
            createdAt: {
              type: Date,
              default: Date.now
            }
          }
        ]
      }
    ],

    visibility: {
      type: String,
      enum: ['connections', 'public', 'private', 'favorites'],
      default: 'connections'
    }
  },
  {
    timestamps: true
  }
);

// Index for fetching feed efficiently
PostSchema.index({ user: 1, createdAt: -1 });

PostSchema.pre('validate', function(next) {
  const hasLegacyImage = !!this.imageUrl;
  const hasImagesArray = Array.isArray(this.images) && this.images.length > 0;
  if (!hasLegacyImage && !hasImagesArray) {
    return next(new Error('At least one image is required'));
  }
  return next();
});

module.exports = mongoose.model('Post', PostSchema);
