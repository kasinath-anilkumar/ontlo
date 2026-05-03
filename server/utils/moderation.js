const AppConfig = require('../models/AppConfig');
const Filter = require('bad-words');
const filter = new Filter();

let cachedConfig = {
  bannedKeywords: [],
  autoModerate: true, // Default to true for better safety
  toxicityThreshold: 0.7
};

// Refresh configuration from DB
const refreshKeywords = async () => {
  try {
    const config = await AppConfig.findOne();
    if (config) {
      cachedConfig = {
        bannedKeywords: config.bannedKeywords || [],
        autoModerate: config.autoModerate !== undefined ? config.autoModerate : true,
        toxicityThreshold: config.toxicityThreshold || 0.7
      };
      // Add custom keywords to the filter
      if (cachedConfig.bannedKeywords.length > 0) {
        filter.addWords(...cachedConfig.bannedKeywords);
      }
    }
  } catch (err) {
    console.error('Failed to refresh moderation config:', err);
  }
};

// Initial load
refreshKeywords();
setInterval(refreshKeywords, 60000);

/**
 * AI-Based Text Moderation
 * @param {string} text - Content to moderate
 * @returns {Object} { clean: boolean, text: string, score: number, flags: Array }
 */
const moderateText = (text) => {
  if (!text || typeof text !== 'string') return { clean: true, text: String(text || ''), score: 0, flags: [] };

  let isFlagged = false;
  let moderatedText = text;
  let toxicityScore = 0;
  const flags = [];

  // 1. Keyword-based moderation (using bad-words)
  if (filter.isProfane(text)) {
    isFlagged = true;
    moderatedText = filter.clean(text);
    toxicityScore += 0.5;
    flags.push('profanity');
  }

  // 2. Mock AI Toxicity Detection (Simulating real AI like Perspective API)
  // We can add simple heuristics here: all caps, excessive punctuation, etc.
  if (text === text.toUpperCase() && text.length > 10) {
    toxicityScore += 0.2;
    flags.push('aggressive_formatting');
  }
  
  if ((text.match(/[!?]{3,}/g) || []).length > 0) {
    toxicityScore += 0.1;
    flags.push('excessive_punctuation');
  }

  // 3. Final Decision
  if (toxicityScore >= cachedConfig.toxicityThreshold) {
    isFlagged = true;
  }

  return {
    clean: !isFlagged,
    text: moderatedText,
    score: Math.min(toxicityScore, 1),
    flags
  };
};

/**
 * Image Moderation Stub
 * @param {string} imageUrl - URL of the image to moderate
 * @returns {Promise<Object>} { clean: boolean, score: number, type: string }
 */
const moderateImage = async (imageUrl) => {
  // In a real app, this would call Cloudinary Moderation or Sightengine
  // For now, we return a mock success
  return {
    clean: true,
    score: 0.1,
    type: 'neutral'
  };
};

module.exports = { moderateText, moderateImage, refreshKeywords };
