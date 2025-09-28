// Performance and Memory Configuration
export const PERFORMANCE_CONFIG = {
  // Avatar Management
  MAX_CONCURRENT_AVATARS: 8,
  CULLING_DISTANCE: 25, // Distance to completely hide avatars
  UPDATE_DISTANCE: 15, // Distance for reduced update frequency

  // Animation Optimization
  DISTANT_AVATAR_UPDATE_INTERVAL: 500, // ms
  ANIMATION_UPDATE_MULTIPLIER: 0.5, // Reduce animation speed for distant avatars

  // Rendering Optimization
  ENABLE_ANTIALIASING: false, // Set to false for better performance
  MAX_PIXEL_RATIO: {
    MOBILE: 1.5,
    DESKTOP: 2
  },
  ENVIRONMENT_RESOLUTION: {
    MOBILE: 128,
    DESKTOP: 256
  },

  // Memory Management
  ENABLE_MEMORY_MONITORING: false, // Set to true for debugging
  MEMORY_WARNING_THRESHOLD: 500, // MB
  AUTO_CLEANUP_ENABLED: true,
  VRM_CACHE_LIMIT: 10, // Maximum VRMs to keep in memory

  // Texture Optimization
  ENABLE_TEXTURE_COMPRESSION: true,
  TEXTURE_MAX_SIZE: 1024, // Max texture resolution

  // Distance-based Quality Settings
  LOD_DISTANCES: {
    HIGH: 10, // Full quality
    MEDIUM: 20, // Reduced quality
    LOW: 30 // Minimal quality
  }
};

// Device-specific optimizations
export const getOptimizedConfig = () => {
  const isMobile = typeof window !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    return {
      ...PERFORMANCE_CONFIG,
      MAX_CONCURRENT_AVATARS: 4, // Reduce for mobile
      ENABLE_ANTIALIASING: false,
      CULLING_DISTANCE: 15, // Shorter culling distance
      UPDATE_DISTANCE: 10
    };
  }

  return PERFORMANCE_CONFIG;
};

// Memory monitoring utilities
export const getMemoryStats = () => {
  if (typeof window === 'undefined' || !(window as any).performance?.memory) {
    return null;
  }

  const memory = (window as any).performance.memory;
  return {
    used: Math.round(memory.usedJSHeapSize / 1048576), // MB
    total: Math.round(memory.totalJSHeapSize / 1048576), // MB
    limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
  };
};

// Auto-cleanup trigger
export const shouldTriggerCleanup = (memoryStats: any) => {
  if (!memoryStats) return false;
  return memoryStats.used > PERFORMANCE_CONFIG.MEMORY_WARNING_THRESHOLD;
};