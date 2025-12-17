/**
 * Cache Manager - LocalStorage based cache with TTL
 * Reduces Firestore reads by caching data locally
 */

const CACHE_PREFIX = 'aiworkforce_';

// Default TTL values (in milliseconds)
const DEFAULT_TTL = {
  projects: 5 * 60 * 1000,  // 5 minutes for projects list
  agents: 1 * 60 * 1000     // 1 minute for agents (real-time still active)
};

/**
 * Get item from cache
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if expired/not found
 */
export function getCache(key) {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    const { data, timestamp, ttl } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp > ttl) {
      // Cache expired, remove it
      removeCache(key);
      return null;
    }

    return data;
  } catch (error) {
    console.warn(`Cache read error for key "${key}":`, error);
    return null;
  }
}

/**
 * Set item in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} [ttl] - Time to live in ms (optional, uses default based on key)
 */
export function setCache(key, data, ttl) {
  try {
    // Determine TTL based on key type if not provided
    if (!ttl) {
      if (key === 'projects') {
        ttl = DEFAULT_TTL.projects;
      } else if (key.startsWith('agents_')) {
        ttl = DEFAULT_TTL.agents;
      } else {
        ttl = DEFAULT_TTL.projects; // Default fallback
      }
    }

    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };

    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheEntry));
  } catch (error) {
    console.warn(`Cache write error for key "${key}":`, error);
    // If localStorage is full, clear old cache entries
    if (error.name === 'QuotaExceededError') {
      clearOldCache();
      // Try again
      try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now(), ttl }));
      } catch (e) {
        console.error('Cache write failed even after cleanup:', e);
      }
    }
  }
}

/**
 * Remove item from cache
 * @param {string} key - Cache key
 */
export function removeCache(key) {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch (error) {
    console.warn(`Cache remove error for key "${key}":`, error);
  }
}

/**
 * Clear all cache entries for this app
 */
export function clearAllCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} cache entries`);
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
}

/**
 * Clear expired cache entries
 */
export function clearOldCache() {
  try {
    const now = Date.now();
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          if (cached && now - cached.timestamp > cached.ttl) {
            keysToRemove.push(key);
          }
        } catch (e) {
          // Invalid cache entry, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (keysToRemove.length > 0) {
      console.log(`Cleaned ${keysToRemove.length} expired cache entries`);
    }
  } catch (error) {
    console.warn('Cache cleanup error:', error);
  }
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
export function getCacheStats() {
  const stats = {
    totalEntries: 0,
    validEntries: 0,
    expiredEntries: 0,
    totalSize: 0
  };

  try {
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        stats.totalEntries++;
        const value = localStorage.getItem(key);
        stats.totalSize += value ? value.length : 0;

        try {
          const cached = JSON.parse(value);
          if (cached && now - cached.timestamp <= cached.ttl) {
            stats.validEntries++;
          } else {
            stats.expiredEntries++;
          }
        } catch (e) {
          stats.expiredEntries++;
        }
      }
    }

    stats.totalSize = Math.round(stats.totalSize / 1024) + ' KB';
  } catch (error) {
    console.warn('Cache stats error:', error);
  }

  return stats;
}

/**
 * Invalidate cache for a specific project's agents
 * @param {string} projectId - Project ID
 */
export function invalidateProjectCache(projectId) {
  removeCache(`agents_${projectId}`);
}

/**
 * Invalidate projects list cache
 */
export function invalidateProjectsCache() {
  removeCache('projects');
}
