/**
 * Projects Store
 * Manages list of projects extracted from agents collection
 */

import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { getCache, setCache, invalidateProjectsCache } from './cache-manager.js';

// Store state
let projects = new Map();
let isLoading = false;
let onUpdateCallback = null;

/**
 * Fetch all projects from Firestore
 * Extracts unique projectIds from agents collection
 * @param {boolean} forceRefresh - Skip cache and fetch fresh data
 * @returns {Promise<Map>} - Map of projects
 */
export async function fetchProjects(forceRefresh = false) {
  // Check cache first
  if (!forceRefresh) {
    const cached = getCache('projects');
    if (cached) {
      console.log('📦 Projects loaded from cache');
      projects = new Map(cached.map(p => [p.id, p]));
      if (onUpdateCallback) onUpdateCallback(projects);
      return projects;
    }
  }

  isLoading = true;
  console.log('🔄 Fetching projects from Firestore...');

  try {
    const agentsRef = collection(db, 'agents');
    const q = query(agentsRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);

    // Group agents by projectId
    const projectsMap = new Map();

    snapshot.forEach(doc => {
      const agent = { id: doc.id, ...doc.data() };
      const projectId = agent.projectId || 'default';

      if (!projectsMap.has(projectId)) {
        projectsMap.set(projectId, {
          id: projectId,
          name: formatProjectName(projectId),
          agentCount: 0,
          agents: [],
          lastActivity: null
        });
      }

      const project = projectsMap.get(projectId);
      project.agentCount++;
      project.agents.push(agent.id);

      // Track last activity
      const activityTime = agent.lastActivityAt?.toDate?.() || agent.lastActivityAt;
      if (activityTime && (!project.lastActivity || activityTime > project.lastActivity)) {
        project.lastActivity = activityTime;
      }
    });

    projects = projectsMap;

    // Cache the results
    const projectsArray = Array.from(projects.values());
    setCache('projects', projectsArray);

    console.log(`✅ Found ${projects.size} projects`);

    if (onUpdateCallback) onUpdateCallback(projects);

    return projects;
  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

/**
 * Format project ID into display name
 * @param {string} projectId - Raw project ID
 * @returns {string} - Formatted name
 */
function formatProjectName(projectId) {
  if (!projectId || projectId === 'default') {
    return 'Fhinck New Dashboard';
  }

  // Convert kebab-case to Title Case
  return projectId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get all projects
 * @returns {Map} - Projects map
 */
export function getProjects() {
  return projects;
}

/**
 * Get projects as array
 * @returns {Array} - Projects array
 */
export function getProjectsArray() {
  return Array.from(projects.values());
}

/**
 * Get a specific project
 * @param {string} projectId - Project ID
 * @returns {Object|undefined} - Project data
 */
export function getProject(projectId) {
  return projects.get(projectId);
}

/**
 * Get total projects count
 * @returns {number}
 */
export function getProjectsCount() {
  return projects.size;
}

/**
 * Check if loading
 * @returns {boolean}
 */
export function isProjectsLoading() {
  return isLoading;
}

/**
 * Register callback for projects updates
 * @param {Function} callback - Callback function
 */
export function onProjectsUpdate(callback) {
  onUpdateCallback = callback;
}

/**
 * Refresh projects (invalidate cache and fetch)
 */
export async function refreshProjects() {
  invalidateProjectsCache();
  return fetchProjects(true);
}

/**
 * Clear projects store
 */
export function clearProjectsStore() {
  projects = new Map();
  onUpdateCallback = null;
}
