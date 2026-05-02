const NodeCache = require('node-cache');
const { logger } = require('./logger');

// Create a cache instance with default TTL of 5 minutes
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Cache Wrapper
 */
const cacheUtil = {
  /**
   * Get item from cache
   */
  get: (key) => {
    return cache.get(key);
  },

  /**
   * Set item in cache
   */
  set: (key, value, ttl) => {
    return cache.set(key, value, ttl);
  },

  /**
   * Delete item from cache
   */
  del: (key) => {
    return cache.del(key);
  },

  /**
   * Flush all cache
   */
  flush: () => {
    return cache.flushAll();
  },

  /**
   * Get or Set pattern: useful for wrapping DB calls
   */
  getOrSet: async (key, fetchFn, ttl) => {
    const value = cache.get(key);
    if (value !== undefined) return value;

    try {
      const result = await fetchFn();
      cache.set(key, result, ttl);
      return result;
    } catch (error) {
      logger.error('Cache fetch error:', { key, error: error.message });
      throw error;
    }
  }
};

module.exports = cacheUtil;
