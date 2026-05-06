// utils/moderation.js

const AppConfig =
  require('../models/AppConfig');

const Filter =
  require('bad-words');

const filter =
  new Filter();



// ======================================================
// FREE TIER SAFE CACHE
// ======================================================

let cachedConfig = {

  bannedKeywords: [],

  autoModerate: true,

  toxicityThreshold: 0.7
};

let lastRefresh = 0;

const REFRESH_INTERVAL =
  1000 * 60;



// ======================================================
// SAFE TEXT NORMALIZER
// ======================================================

const normalizeText =
  (text) => {

    if (
      typeof text !==
      'string'
    ) {

      return '';
    }

    return text
      .replace(/\s+/g, ' ')
      .trim();
  };



// ======================================================
// REFRESH CONFIG
// ======================================================

const refreshKeywords =
  async (
    force = false
  ) => {

    try {

      const now =
        Date.now();

      // ======================================================
      // THROTTLE DB CALLS
      // ======================================================

      if (
        !force &&
        now - lastRefresh <
          REFRESH_INTERVAL
      ) {

        return cachedConfig;
      }

      lastRefresh = now;

      const config =
        await AppConfig.findOne(

          {},

          `
          bannedKeywords
          autoModerate
          toxicityThreshold
          `
        ).lean();

      if (!config) {

        return cachedConfig;
      }

      cachedConfig = {

        bannedKeywords:
          Array.isArray(
            config.bannedKeywords
          )

            ? config.bannedKeywords

            : [],

        autoModerate:
          config.autoModerate !==
          undefined

            ? !!config.autoModerate

            : true,

        toxicityThreshold:
          typeof config
            .toxicityThreshold ===
          'number'

            ? config
                .toxicityThreshold

            : 0.7
      };

      // ======================================================
      // ADD CUSTOM WORDS
      // ======================================================

      if (
        cachedConfig
          .bannedKeywords
          .length > 0
      ) {

        filter.addWords(
          ...cachedConfig.bannedKeywords
        );
      }

      return cachedConfig;

    } catch (error) {

      console.error(
        '[MODERATION CONFIG ERROR]:',
        error
      );

      return cachedConfig;
    }
  };



// ======================================================
// INITIAL LOAD
// ======================================================

refreshKeywords(true);



// ======================================================
// AUTO REFRESH
// ======================================================

if (
  process.env.NODE_ENV !==
  'test'
) {

  setInterval(() => {

    refreshKeywords().catch(
      () => {}
    );

  }, REFRESH_INTERVAL);
}



// ======================================================
// TOXICITY HEURISTICS
// ======================================================

const calculateToxicity =
  (text) => {

    let score = 0;

    const flags = [];

    // ======================================================
    // PROFANITY
    // ======================================================

    if (
      filter.isProfane(text)
    ) {

      score += 0.5;

      flags.push(
        'profanity'
      );
    }

    // ======================================================
    // ALL CAPS
    // ======================================================

    if (
      text.length > 10 &&
      text ===
        text.toUpperCase()
    ) {

      score += 0.2;

      flags.push(
        'aggressive_formatting'
      );
    }

    // ======================================================
    // EXCESSIVE PUNCTUATION
    // ======================================================

    if (
      /[!?]{3,}/.test(
        text
      )
    ) {

      score += 0.1;

      flags.push(
        'excessive_punctuation'
      );
    }

    // ======================================================
    // SPAM REPEATS
    // ======================================================

    if (
      /(.)\1{7,}/.test(
        text
      )
    ) {

      score += 0.15;

      flags.push(
        'spam_repetition'
      );
    }

    // ======================================================
    // URL SPAM
    // ======================================================

    const urlMatches =
      text.match(
        /(https?:\/\/|www\.)/gi
      );

    if (
      urlMatches &&
      urlMatches.length > 2
    ) {

      score += 0.2;

      flags.push(
        'link_spam'
      );
    }

    return {

      score:
        Math.min(score, 1),

      flags
    };
  };



// ======================================================
// TEXT MODERATION
// ======================================================

const moderateText =
  (inputText) => {

    try {

      const text =
        normalizeText(
          inputText
        );

      // ======================================================
      // EMPTY
      // ======================================================

      if (!text) {

        return {

          clean: true,

          text: '',

          score: 0,

          flags: []
        };
      }

      // ======================================================
      // DISABLED
      // ======================================================

      if (
        !cachedConfig
          .autoModerate
      ) {

        return {

          clean: true,

          text,

          score: 0,

          flags: []
        };
      }

      let moderatedText =
        text;

      // ======================================================
      // CLEAN PROFANITY
      // ======================================================

      if (
        filter.isProfane(text)
      ) {

        moderatedText =
          filter.clean(
            text
          );
      }

      // ======================================================
      // TOXICITY
      // ======================================================

      const toxicity =
        calculateToxicity(
          text
        );

      const isFlagged =
        toxicity.score >=
        cachedConfig
          .toxicityThreshold;

      return {

        clean:
          !isFlagged,

        text:
          moderatedText,

        score:
          toxicity.score,

        flags:
          toxicity.flags
      };

    } catch (error) {

      console.error(
        '[TEXT MODERATION ERROR]:',
        error
      );

      return {

        clean: true,

        text:
          String(
            inputText || ''
          ),

        score: 0,

        flags: []
      };
    }
  };



// ======================================================
// IMAGE MODERATION
// ======================================================

const moderateImage =
  async (
    imageUrl
  ) => {

    try {

      if (!imageUrl) {

        return {

          clean: false,

          score: 1,

          type: 'invalid'
        };
      }

      // ======================================================
      // PLACEHOLDER
      // ======================================================

      // Future:
      // - Cloudinary moderation
      // - Sightengine
      // - AWS Rekognition

      return {

        clean: true,

        score: 0.1,

        type: 'neutral'
      };

    } catch (error) {

      console.error(
        '[IMAGE MODERATION ERROR]:',
        error
      );

      return {

        clean: true,

        score: 0.5,

        type: 'unknown'
      };
    }
  };



// ======================================================
// EXPORTS
// ======================================================

module.exports = {

  moderateText,

  moderateImage,

  refreshKeywords
};