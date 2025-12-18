/**
 * Projects Store
 * Manages list of projects from Firestore 'project' collection
 */

import { db } from './firebase-config.js';
import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import { getCache, setCache, invalidateProjectsCache } from './cache-manager.js';

// Store state
let projects = new Map();
let isLoading = false;
let onUpdateCallback = null;

/**
 * Fetch all projects from Firestore 'project' collection
 * Each project has a subcollection 'agents'
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
    const projectsRef = collection(db, 'project');
    // Simple query without orderBy to avoid index requirement
    const snapshot = await getDocs(projectsRef);

    const projectsMap = new Map();

    console.log(`📊 Found ${snapshot.size} projects`);

    // Process each project and count agents
    for (const doc of snapshot.docs) {
      const projectData = doc.data();
      const projectId = doc.id;

      console.log(`   📁 Project: ${projectId} | name: "${projectData.projectName}"`);

      // Count agents in subcollection
      const agentsRef = collection(db, 'project', projectId, 'agents');
      const agentsSnapshot = await getCountFromServer(agentsRef);
      const agentCount = agentsSnapshot.data().count;

      projectsMap.set(projectId, {
        id: projectId,
        name: projectData.projectName || formatProjectName(projectId),
        agentCount: agentCount,
        createdAt: projectData.createdAt,
        updatedAt: projectData.updatedAt,
        lastActivity: projectData.updatedAt?.toDate?.() || projectData.updatedAt || null
      });

      console.log(`      Agents count: ${agentCount}`);
    }

    projects = projectsMap;

    // Cache the results
    const projectsArray = Array.from(projects.values());
    setCache('projects', projectsArray);

    console.log(`✅ Loaded ${projects.size} projects`);

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
