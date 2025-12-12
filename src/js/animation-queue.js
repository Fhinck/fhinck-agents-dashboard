/**
 * Animation Queue System
 * Manages sequential processing of agent animations
 */

import { animateFocus, animateUnfocus, getRenderer } from './renderer.js';

// Configuration
const CONFIG = {
  ANIMATION_DURATION: 1000,      // Duration of focus/unfocus animation
  FOCUS_DISPLAY_TIME: 5000,      // Minimum time to display focused agent
  TRANSITION_DELAY: 500,         // Delay between animations
  MAX_QUEUE_SIZE: 50             // Maximum queue size to prevent memory issues
};

// State
const queue = [];
let isProcessing = false;
let currentAnimation = null;

/**
 * Queue an animation event
 * @param {Object} event - Animation event object
 * @param {string} event.type - 'focus' or 'unfocus'
 * @param {string} event.agentId - Agent ID
 * @param {string} [event.task] - Task description (for focus events)
 */
export function queueAnimation(event) {
  // Prevent queue overflow
  if (queue.length >= CONFIG.MAX_QUEUE_SIZE) {
    console.warn('⚠️ Animation queue is full, removing oldest event');
    queue.shift();
  }

  // Check for duplicate unfocus events
  if (event.type === 'unfocus') {
    const existingUnfocus = queue.find(
      e => e.type === 'unfocus' && e.agentId === event.agentId
    );
    if (existingUnfocus) {
      console.log(`🔄 Skipping duplicate unfocus for ${event.agentId}`);
      return;
    }
  }

  // If there's a pending focus for the same agent and we're queuing unfocus,
  // we can optimize by removing the focus (agent started and stopped quickly)
  if (event.type === 'unfocus') {
    const pendingFocusIndex = queue.findIndex(
      e => e.type === 'focus' && e.agentId === event.agentId
    );
    if (pendingFocusIndex !== -1 && currentAnimation?.agentId !== event.agentId) {
      console.log(`⚡ Optimizing: removing pending focus for ${event.agentId}`);
      queue.splice(pendingFocusIndex, 1);
      return;
    }
  }

  queue.push({
    ...event,
    queuedAt: Date.now()
  });

  console.log(`📋 Queued ${event.type} animation for agent: ${event.agentId}`);
  processQueue();
}

/**
 * Process the animation queue
 */
async function processQueue() {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;
  const event = queue.shift();
  currentAnimation = event;

  console.log(`▶️ Processing ${event.type} animation for: ${event.agentId}`);

  try {
    if (event.type === 'focus') {
      await animateFocus(event.agentId, event.task);
      // Keep agent in focus for minimum display time
      await sleep(CONFIG.FOCUS_DISPLAY_TIME);
    } else if (event.type === 'unfocus') {
      await animateUnfocus(event.agentId);
      await sleep(CONFIG.TRANSITION_DELAY);
    }
  } catch (error) {
    console.error(`❌ Animation error for ${event.agentId}:`, error);
  }

  currentAnimation = null;
  isProcessing = false;

  // Process next item
  if (queue.length > 0) {
    processQueue();
  }
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Resolves after specified time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get current queue status
 * @returns {Object} Queue status information
 */
export function getQueueStatus() {
  return {
    length: queue.length,
    isProcessing,
    currentAnimation,
    items: [...queue]
  };
}

/**
 * Clear the animation queue
 */
export function clearQueue() {
  queue.length = 0;
  console.log('🗑️ Animation queue cleared');
}

/**
 * Force stop current animation and clear queue
 */
export function forceStopAnimations() {
  clearQueue();
  isProcessing = false;
  currentAnimation = null;

  // Reset renderer state
  const renderer = getRenderer();
  if (renderer) {
    renderer.resetAllStates();
  }

  console.log('⏹️ Animations force stopped');
}

/**
 * Update configuration
 * @param {Object} newConfig - New configuration values
 */
export function updateConfig(newConfig) {
  Object.assign(CONFIG, newConfig);
  console.log('⚙️ Animation config updated:', CONFIG);
}

/**
 * Get current configuration
 * @returns {Object} Current configuration
 */
export function getConfig() {
  return { ...CONFIG };
}
