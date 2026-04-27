const AppConfig = require('../models/AppConfig');

let cachedConfig = {
  bannedKeywords: [],
  autoModerate: false
};

// Refresh configuration from DB
const refreshKeywords = async () => {
  try {
    const config = await AppConfig.findOne();
    if (config) {
      cachedConfig = {
        bannedKeywords: config.bannedKeywords || [],
        autoModerate: config.autoModerate || false
      };
    }
  } catch (err) {
    console.error('Failed to refresh moderation config:', err);
  }
};

// Initial load
refreshKeywords();

// Optional: refresh every 1 minute to stay in sync without constant DB hits
setInterval(refreshKeywords, 60000);

const moderateText = (text) => {
  // If auto-moderation is disabled, return original text
  if (!cachedConfig.autoModerate || !text) {
    return { clean: true, text };
  }

  const keywords = cachedConfig.bannedKeywords;
  if (keywords.length === 0) return { clean: true, text };

  let isFlagged = false;
  let moderatedText = text;

  keywords.forEach(word => {
    if (!word) return;
    // Simple but effective word boundary check
    const regex = new RegExp(`\\b${word.trim()}\\b`, 'gi');
    if (regex.test(moderatedText)) {
      isFlagged = true;
      moderatedText = moderatedText.replace(regex, '***');
    }
  });

  return {
    clean: !isFlagged,
    text: moderatedText
  };
};

module.exports = { moderateText, refreshKeywords };
