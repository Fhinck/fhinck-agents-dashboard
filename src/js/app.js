/**
 * AI Workforce Fhinck - Main Application
 * Real-time dashboard for AI agents visualization
 * Supports multiple projects with routing and caching
 */

import { initAgentsListener, onAgentsUpdate, getAgents, getTotalAgentsCount, getActiveAgentsCount, getAgentsArray, stopAgentsListener } from './agents-store.js';
import { initRenderer, renderAgents, updateStatusBadges, animateFocus, animateUnfocus, zoomIn, zoomOut, resetZoom, centerView, fitToView, showHomeView, showProjectView, renderProjectsList, showHomeLoading } from './renderer.js';
import { getQueueStatus, clearQueue, forceStopAnimations } from './animation-queue.js';
import { initRouter, registerRoutes, navigateHome, navigateToProject, getCurrentProjectId } from './router.js';
import { fetchProjects, getProjects, getProject, onProjectsUpdate } from './projects-store.js';
import { clearAllCache, getCacheStats } from './cache-manager.js';

// Application state
let isInitialized = false;
let currentView = 'home'; // 'home' | 'project'

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

    // Set up projects update callback
    onProjectsUpdate(handleProjectsUpdate);

    // Register route handlers
    registerRoutes({
      home: handleHomeRoute,
      project: handleProjectRoute,
      notFound: () => navigateHome()
    });

    // Set up sidebar navigation
    setupSidebarNavigation();

    // Set up window resize handler
    setupResizeHandler();

    // Initialize router (will trigger initial route)
    initRouter();

    isInitialized = true;
    console.log('✅ Dashboard initialized successfully');

  } catch (error) {
    console.error('❌ Failed to initialize dashboard:', error);
    showError('Failed to connect to the server. Please check your Firebase configuration.');
  }
}

/**
 * Handle home route
 */
async function handleHomeRoute() {
  console.log('🏠 Navigating to home');
  currentView = 'home';

  // Stop any existing agent listener
  stopAgentsListener();

  // Show home view
  showHomeView();
  showHomeLoading();

  // Fetch and display projects
  try {
    const projects = await fetchProjects();
    renderProjectsList(projects, handleProjectClick);
  } catch (error) {
    console.error('❌ Error loading projects:', error);
  }

  // Reset status badges
  updateStatusBadges(0, 0);
}

/**
 * Handle project route
 * @param {Object} params - Route params { projectId }
 */
async function handleProjectRoute(params) {
  const { projectId } = params;
  console.log(`📂 Navigating to project: ${projectId}`);
  currentView = 'project';

  // Get project info for title
  const project = getProject(projectId);
  const projectName = project?.name || formatProjectName(projectId);

  // Show project view
  showProjectView(projectName);

  // Show loading state
  const loadingState = document.getElementById('loading-state');
  if (loadingState) loadingState.style.display = 'flex';

  // Start listening to agents for this project
  initAgentsListener(projectId);
}

/**
 * Handle project click from home view
 * @param {string} projectId - Project ID
 */
function handleProjectClick(projectId) {
  navigateToProject(projectId);
}

/**
 * Handle agents update from store
 * @param {Map} agents - Updated agents map
 */
function handleAgentsUpdate(agents) {
  if (currentView !== 'project') return;

  console.log(`📊 Agents updated: ${agents.size} total`);

  // Render agents
  renderAgents(agents);

  // Update status badges
  updateStatusBadges(getTotalAgentsCount(), getActiveAgentsCount());
}

/**
 * Handle projects update from store
 * @param {Map} projects - Updated projects map
 */
function handleProjectsUpdate(projects) {
  if (currentView !== 'home') return;

  console.log(`📂 Projects updated: ${projects.size} total`);
  renderProjectsList(projects, handleProjectClick);
}

/**
 * Format project ID into display name
 * @param {string} projectId - Raw project ID
 * @returns {string} - Formatted name
 */
function formatProjectName(projectId) {
  if (!projectId || projectId === 'default') {
    return 'Projeto Principal';
  }
  return projectId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Setup sidebar navigation
 */
function setupSidebarNavigation() {
  const sidebarItems = document.querySelectorAll('.sidebar-item');

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      console.log(`📱 Sidebar clicked: ${view}`);

      handleNavigation(view);
    });
  });
}

/**
 * Handle navigation to different views
 * @param {string} view - View name
 */
function handleNavigation(view) {
  switch (view) {
    case 'home':
      navigateHome();
      break;
    case 'dashboard':
      // If on a project, stay there; if on home, do nothing
      if (currentView === 'home') {
        console.log('📋 Dashboard view - select a project first');
      }
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
      if (currentView === 'project') {
        const agents = getAgents();
        if (agents.size > 0) {
          renderAgents(agents);
        }
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
  // Agent data
  getAgents,
  getAgentsArray,
  getTotalAgentsCount,
  getActiveAgentsCount,
  // Project data
  getProjects,
  getProject,
  // Navigation
  navigateHome,
  navigateToProject,
  getCurrentProjectId,
  // State
  isInitialized: () => isInitialized,
  getCurrentView: () => currentView,
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
  // Cache controls
  clearAllCache,
  getCacheStats,
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
