/**
 * Agents Store
 * Manages the state of agents and real-time Firestore listener
 * Supports filtering by projectId
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { queueAnimation, clearQueue } from './animation-queue.js';
import { getCache, setCache, invalidateProjectCache } from './cache-manager.js';

// State
const agents = new Map();
const previousStatuses = new Map();
let unsubscribe = null;
let onUpdateCallback = null;
let currentProjectId = null;

/**
 * Initialize the agents listener for a specific project
 * @param {string} projectId - Project ID to filter agents
 */
export function initAgentsListener(projectId = null) {
  // Stop existing listener if any
  stopAgentsListener();

  // Clear current state
  agents.clear();
  previousStatuses.clear();
  clearQueue();

  currentProjectId = projectId;

  const agentsRef = collection(db, 'agents');
  let q;

  if (projectId) {
    // Filter by projectId
    q = query(
      agentsRef,
      where('projectId', '==', projectId),
      orderBy('createdAt', 'asc')
    );
    console.log(`👀 Listening to agents for project: ${projectId}`);
  } else {
    // All agents (for backward compatibility)
    q = query(agentsRef, orderBy('createdAt', 'asc'));
    console.log('👀 Listening to all agents...');
  }

  // Check cache for initial data
  const cacheKey = projectId ? `agents_${projectId}` : 'agents_all';
  const cached = getCache(cacheKey);
  if (cached && cached.length > 0) {
    console.log(`📦 Loading ${cached.length} agents from cache`);
    cached.forEach(agent => {
      agents.set(agent.id, agent);
      previousStatuses.set(agent.id, agent.status);
    });
    if (onUpdateCallback) {
      onUpdateCallback(agents);
    }
  }

  unsubscribe = onSnapshot(q, (snapshot) => {
    console.log(`📡 Firestore snapshot received: ${snapshot.docChanges().length} changes`);

    snapshot.docChanges().forEach((change) => {
      const agent = {
        id: change.doc.id,
        ...change.doc.data()
      };

      console.log(`   📄 Change type: ${change.type}, Agent: ${agent.id}, Status: ${agent.status}`);

      if (change.type === 'added') {
        handleAgentAdded(agent);
      }

      if (change.type === 'modified') {
        handleAgentModified(agent);
      }

      if (change.type === 'removed') {
        handleAgentRemoved(agent);
      }
    });

    // Update cache
    const agentsArray = Array.from(agents.values());
    setCache(cacheKey, agentsArray);

    // Trigger update callback
    if (onUpdateCallback) {
      onUpdateCallback(agents);
    }
  }, (error) => {
    console.error('❌ Error listening to agents:', error);
    // If index not found, provide helpful message
    if (error.code === 'failed-precondition') {
      console.error('💡 You may need to create a composite index for projectId + createdAt');
      console.error('   Run: firebase deploy --only firestore:indexes');
    }
  });
}

/**
 * Handle when a new agent is added
 */
function handleAgentAdded(agent) {
  console.log(`➕ Agent added: ${agent.name}`);
  agents.set(agent.id, agent);
  previousStatuses.set(agent.id, agent.status);

  // If agent is already working when added, queue focus animation
  if (agent.status === 'working') {
    queueAnimation({
      type: 'focus',
      agentId: agent.id,
      task: agent.currentTask
    });
  }
}

/**
 * Handle when an agent is modified
 */
function handleAgentModified(agent) {
  const previousStatus = previousStatuses.get(agent.id);
  agents.set(agent.id, agent);

  console.log(`🔍 Agent modified: ${agent.name}`);
  console.log(`   Previous status: "${previousStatus}", New status: "${agent.status}"`);
  console.log(`   Status changed: ${previousStatus !== agent.status}`);

  // Detect status change
  if (previousStatus !== agent.status) {
    console.log(`🔄 Agent ${agent.name}: ${previousStatus} → ${agent.status}`);

    if (agent.status === 'working') {
      console.log(`   ✅ Queueing FOCUS animation for ${agent.id}`);
      queueAnimation({
        type: 'focus',
        agentId: agent.id,
        task: agent.currentTask
      });
    } else if (agent.status === 'idle' && previousStatus === 'working') {
      console.log(`   ✅ Queueing UNFOCUS animation for ${agent.id}`);
      queueAnimation({
        type: 'unfocus',
        agentId: agent.id
      });
    } else {
      console.log(`   ⏭️ Status changed but no animation needed (${previousStatus} → ${agent.status})`);
    }

    previousStatuses.set(agent.id, agent.status);
  } else {
    console.log(`   ⏭️ Status unchanged, skipping animation`);
  }
}

/**
 * Handle when an agent is removed
 */
function handleAgentRemoved(agent) {
  console.log(`➖ Agent removed: ${agent.name}`);
  agents.delete(agent.id);
  previousStatuses.delete(agent.id);
}

/**
 * Get all agents
 * @returns {Map} Map of all agents
 */
export function getAgents() {
  return agents;
}

/**
 * Get a specific agent by ID
 * @param {string} agentId - The agent ID
 * @returns {Object|undefined} The agent object or undefined
 */
export function getAgent(agentId) {
  return agents.get(agentId);
}

/**
 * Get count of total agents
 * @returns {number} Total number of agents
 */
export function getTotalAgentsCount() {
  return agents.size;
}

/**
 * Get count of active (working) agents
 * @returns {number} Number of active agents
 */
export function getActiveAgentsCount() {
  return [...agents.values()].filter(a => a.status === 'working').length;
}

/**
 * Set callback to be called on agent updates
 * @param {Function} callback - Function to call with agents map
 */
export function onAgentsUpdate(callback) {
  onUpdateCallback = callback;
}

/**
 * Stop listening to agent changes
 */
export function stopAgentsListener() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
    console.log('🔇 Stopped listening to agents');
  }
}

/**
 * Get agents as array (for iteration)
 * @returns {Array} Array of agent objects
 */
export function getAgentsArray() {
  return [...agents.values()];
}

/**
 * Get current project ID
 * @returns {string|null}
 */
export function getCurrentProjectId() {
  return currentProjectId;
}

/**
 * Clear agents store
 */
export function clearAgentsStore() {
  stopAgentsListener();
  agents.clear();
  previousStatuses.clear();
  currentProjectId = null;
  onUpdateCallback = null;
}

/**
 * Refresh agents (invalidate cache and re-fetch)
 */
export function refreshAgents() {
  if (currentProjectId) {
    invalidateProjectCache(currentProjectId);
  }
  initAgentsListener(currentProjectId);
}
