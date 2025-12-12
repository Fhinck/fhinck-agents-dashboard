/**
 * AI Workforce Fhinck - Main Application
 * Real-time dashboard for AI agents visualization
 */

import { initAgentsListener, onAgentsUpdate, getAgents, getTotalAgentsCount, getActiveAgentsCount, getAgentsArray } from './agents-store.js';
import { initRenderer, renderAgents, updateStatusBadges, animateFocus, animateUnfocus, zoomIn, zoomOut, resetZoom, centerView, fitToView } from './renderer.js';
import { getQueueStatus, clearQueue, forceStopAnimations } from './animation-queue.js';

// Application state
let isInitialized = false;

/**
 * Initialize the dashboard application
 */
async function init() {
  console.log('🚀 Initializing AI Workforce Fhinck...');

  try {
    // Initialize renderer
    initRenderer();

    // Set up agents update callback
    onAgentsUpdate(handleAgentsUpdate);

    // Start listening to Firestore
    initAgentsListener();

    // Set up sidebar navigation
    setupSidebarNavigation();

    // Set up window resize handler
    setupResizeHandler();

    isInitialized = true;
    console.log('✅ Dashboard initialized successfully');

  } catch (error) {
    console.error('❌ Failed to initialize dashboard:', error);
    showError('Failed to connect to the server. Please check your Firebase configuration.');
  }
}

/**
 * Handle agents update from store
 * @param {Map} agents - Updated agents map
 */
function handleAgentsUpdate(agents) {
  console.log(`📊 Agents updated: ${agents.size} total`);

  // Render agents
  renderAgents(agents);

  // Update status badges
  updateStatusBadges(getTotalAgentsCount(), getActiveAgentsCount());
}

/**
 * Setup sidebar navigation
 */
function setupSidebarNavigation() {
  const sidebarItems = document.querySelectorAll('.sidebar-item');

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active class from all items
      sidebarItems.forEach(i => i.classList.remove('active'));

      // Add active class to clicked item
      item.classList.add('active');

      // Get view name
      const view = item.dataset.view;
      console.log(`📱 Navigating to: ${view}`);

      // Handle navigation (placeholder for future implementation)
      handleNavigation(view);
    });
  });
}

/**
 * Handle navigation to different views
 * @param {string} view - View name
 */
function handleNavigation(view) {
  // For now, just log the navigation
  // Future: implement different views (Agent Pool, Analytics, Logs, Settings)

  switch (view) {
    case 'dashboard':
      // Already on dashboard
      break;
    case 'agent-pool':
      console.log('📋 Agent Pool view - Coming soon');
      break;
    case 'analytics':
      console.log('📈 Analytics view - Coming soon');
      break;
    case 'logs':
      console.log('📝 Logs view - Coming soon');
      break;
    case 'settings':
      console.log('⚙️ Settings view - Coming soon');
      break;
  }
}

/**
 * Setup window resize handler
 * Re-renders connections when window is resized
 */
function setupResizeHandler() {
  let resizeTimeout;

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const agents = getAgents();
      if (agents.size > 0) {
        renderAgents(agents);
      }
    }, 250);
  });
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showError(message) {
  const loadingState = document.getElementById('loading-state');
  if (loadingState) {
    loadingState.innerHTML = `
      <div class="error-icon">
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <p style="color: #FF6B35;">${message}</p>
      <button onclick="location.reload()" style="
        margin-top: 16px;
        padding: 10px 20px;
        background: rgba(255, 107, 53, 0.2);
        border: 1px solid #FF6B35;
        color: #FF6B35;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
      ">Retry</button>
    `;
  }
}

/**
 * Expose utilities for debugging
 */
window.AIWorkforceFhinck = {
  getAgents,
  getAgentsArray,
  getTotalAgentsCount,
  getActiveAgentsCount,
  isInitialized: () => isInitialized,
  // Zoom and pan controls
  zoomIn,
  zoomOut,
  resetZoom,
  centerView,
  fitToView,
  // Animation queue controls
  getQueueStatus,
  clearQueue,
  forceStopAnimations,
  // Animation testing
  testFocus: (agentId) => {
    const agents = getAgentsArray();
    const targetId = agentId || (agents.length > 0 ? agents[0].id : null);
    if (targetId) {
      console.log(`🧪 Testing focus animation on: ${targetId}`);
      animateFocus(targetId, 'Test task - debugging animation');
    } else {
      console.warn('⚠️ No agents available to test');
    }
  },
  testUnfocus: (agentId) => {
    const agents = getAgentsArray();
    const targetId = agentId || (agents.length > 0 ? agents[0].id : null);
    if (targetId) {
      console.log(`🧪 Testing unfocus animation on: ${targetId}`);
      animateUnfocus(targetId);
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
