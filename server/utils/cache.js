// utils/cache.js

const NodeCache =
  require('node-cache');

const {
  logger
} = require('./logger');



// ======================================================
// FREE TIER OPTIMIZED CACHE
// ======================================================

// Render free tier memory is limited.
// Keep cache small and lightweight.

const cache = new NodeCache({

  // Default TTL
  stdTTL: 300,

  // Cleanup interval
  checkperiod: 60,

  // Avoid cloning large objects
  useClones: false,

  // Prevent memory explosion
  maxKeys: 5000
});



// ======================================================
// SAFE LOGGER
// ======================================================

const safeLogError = (
  message,
  metadata
) => {

  try {

    if (
      logger &&
      typeof logger.error ===
        'function'
    ) {

      logger.error(
        message,
        metadata
      );

    } else {

      console.error(
        message,
        metadata
      );
    }

  } catch (error) {

    console.error(
      '[CACHE LOGGER ERROR]:',
      error
    );
  }
};



// ======================================================
// CACHE UTIL
// ======================================================

const cacheUtil = {

  // ======================================================
  // GET
  // ======================================================

  get: (key) => {

    try {

      if (!key) {
        return null;
      }

      return cache.get(key);

    } catch (error) {

      safeLogError(
        '[CACHE GET ERROR]',
        {
          key,
          error:
            error.message
        }
      );

      return null;
    }
  },



  // ======================================================
  // SET
  // ======================================================

  set: (
    key,
    value,
    ttl = 300
  ) => {

    try {

      if (!key) {
        return false;
      }

      return cache.set(
        key,
        value,
        ttl
      );

    } catch (error) {

      safeLogError(
        '[CACHE SET ERROR]',
        {
          key,
          error:
            error.message
        }
      );

      return false;
    }
  },



  // ======================================================
  // DELETE
  // ======================================================

  del: (key) => {

    try {

      if (!key) {
        return 0;
      }

      return cache.del(key);

    } catch (error) {

      safeLogError(
        '[CACHE DELETE ERROR]',
        {
          key,
          error:
            error.message
        }
      );

      return 0;
    }
  },



  // ======================================================
  // MULTI DELETE
  // ======================================================

  delPattern: (pattern) => {

    try {

      if (!pattern) {
        return 0;
      }

      const keys =
        cache.keys();

      const matchedKeys =
        keys.filter((key) =>
          key.includes(pattern)
        );

      if (
        matchedKeys.length === 0
      ) {

        return 0;
      }

      return cache.del(
        matchedKeys
      );

    } catch (error) {

      safeLogError(
        '[CACHE PATTERN DELETE ERROR]',
        {
          pattern,
          error:
            error.message
        }
      );

      return 0;
    }
  },



  // ======================================================
  // FLUSH ALL
  // ======================================================

  flush: () => {

    try {

      cache.flushAll();

      return true;

    } catch (error) {

      safeLogError(
        '[CACHE FLUSH ERROR]',
        {
          error:
            error.message
        }
      );

      return false;
    }
  },



  // ======================================================
  // GET STATS
  // ======================================================

  stats: () => {

    try {

      return cache.getStats();

    } catch (error) {

      safeLogError(
        '[CACHE STATS ERROR]',
        {
          error:
            error.message
        }
      );

      return {};
    }
  },



  // ======================================================
  // HAS KEY
  // ======================================================

  has: (key) => {

    try {

      if (!key) {
        return false;
      }

      return cache.has(key);

    } catch (error) {

      return false;
    }
  },



  // ======================================================
  // TTL UPDATE
  // ======================================================

  ttl: (
    key,
    ttl
  ) => {

    try {

      if (!key) {
        return false;
      }

      return cache.ttl(
        key,
        ttl
      );

    } catch (error) {

      return false;
    }
  },



  // ======================================================
  // GET OR SET
  // ======================================================

  getOrSet: async (

    key,

    fetchFn,

    ttl = 300

  ) => {

    try {

      if (
        !key ||
        typeof fetchFn !==
          'function'
      ) {

        throw new Error(
          'Invalid cache parameters'
        );
      }

      // ======================================================
      // CACHE HIT
      // ======================================================

      const cached =
        cache.get(key);

      if (
        cached !== undefined
      ) {

        return cached;
      }

      // ======================================================
      // FETCH
      // ======================================================

      const result =
        await fetchFn();

      // ======================================================
      // STORE
      // ======================================================

      cache.set(
        key,
        result,
        ttl
      );

      return result;

    } catch (error) {

      safeLogError(
        '[CACHE FETCH ERROR]',
        {
          key,
          error:
            error.message
        }
      );

      throw error;
    }
  }
};



// ======================================================
// MEMORY MONITOR
// ======================================================

// Helpful on Render free tier

setInterval(() => {

  try {

    const stats =
      cache.getStats();

    const usedMB =
      (
        process.memoryUsage()
          .heapUsed /
        1024 /
        1024
      ).toFixed(2);

    // Warn if cache grows large
    if (
      stats.keys > 4000
    ) {

      console.warn(
        `[CACHE WARNING] High key count: ${stats.keys}`
      );
    }

    // Warn if memory high
    if (
      Number(usedMB) > 350
    ) {

      console.warn(
        `[MEMORY WARNING] Heap used: ${usedMB} MB`
      );
    }

  } catch (error) {

    console.error(
      '[CACHE MONITOR ERROR]:',
      error
    );
  }

}, 60000);



module.exports =
  cacheUtil;