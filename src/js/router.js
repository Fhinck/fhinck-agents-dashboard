/**
 * Simple Hash-based Router
 * Handles navigation between home and project views
 */

// Route patterns
const ROUTES = {
  HOME: '',
  PROJECT: 'projeto',
  TASKS: 'tasks'
};

// Registered route handlers
let routeHandlers = {
  home: null,
  project: null,
  tasks: null,
  notFound: null
};

/**
 * Parse the current hash route
 * @returns {Object} - Route info { route: string, params: Object }
 */
export function parseRoute() {
  const hash = window.location.hash.slice(1); // Remove #

  if (!hash || hash === '/') {
    return { route: 'home', params: {} };
  }

  // Parse /projeto/{projectId}
  const projectMatch = hash.match(/^\/?projeto\/(.+)$/);
  if (projectMatch) {
    return {
      route: 'project',
      params: { projectId: decodeURIComponent(projectMatch[1]) }
    };
  }

  // Parse /tasks
  const tasksMatch = hash.match(/^\/?tasks$/);
  if (tasksMatch) {
    return { route: 'tasks', params: {} };
  }

  // Unknown route
  return { route: 'notFound', params: { path: hash } };
}

/**
 * Navigate to a route
 * @param {string} path - Route path (e.g., '/projeto/fhinck-api')
 */
export function navigate(path) {
  window.location.hash = path;
}

/**
 * Navigate to home
 */
export function navigateHome() {
  window.location.hash = '';
}

/**
 * Navigate to a project
 * @param {string} projectId - Project ID
 */
export function navigateToProject(projectId) {
  window.location.hash = `/projeto/${encodeURIComponent(projectId)}`;
}

/**
 * Navigate to tasks
 */
export function navigateToTasks() {
  window.location.hash = '/tasks';
}

/**
 * Register route handlers
 * @param {Object} handlers - { home: fn, project: fn, notFound: fn }
 */
export function registerRoutes(handlers) {
  routeHandlers = { ...routeHandlers, ...handlers };
}

/**
 * Handle route change
 */
function handleRouteChange() {
  const { route, params } = parseRoute();

  console.log(`🧭 Route changed: ${route}`, params);

  switch (route) {
    case 'home':
      if (routeHandlers.home) routeHandlers.home(params);
      break;
    case 'project':
      if (routeHandlers.project) routeHandlers.project(params);
      break;
    case 'tasks':
      if (routeHandlers.tasks) routeHandlers.tasks(params);
      break;
    default:
      if (routeHandlers.notFound) {
        routeHandlers.notFound(params);
      } else {
        // Default: go home
        navigateHome();
      }
  }
}

/**
 * Initialize router
 * Listens for hash changes and handles initial route
 */
export function initRouter() {
  // Listen for hash changes
  window.addEventListener('hashchange', handleRouteChange);

  // Handle initial route
  handleRouteChange();

  console.log('🧭 Router initialized');
}

/**
 * Get current route info
 * @returns {Object} - Current route info
 */
export function getCurrentRoute() {
  return parseRoute();
}

/**
 * Check if currently on home
 * @returns {boolean}
 */
export function isHome() {
  return parseRoute().route === 'home';
}

/**
 * Check if currently on a project page
 * @returns {boolean}
 */
export function isProjectPage() {
  return parseRoute().route === 'project';
}

/**
 * Get current project ID (if on project page)
 * @returns {string|null}
 */
export function getCurrentProjectId() {
  const { route, params } = parseRoute();
  return route === 'project' ? params.projectId : null;
}
