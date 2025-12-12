/**
 * Agents Store
 * Manages the state of agents and real-time Firestore listener
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { queueAnimation } from './animation-queue.js';

// State
const agents = new Map();
const previousStatuses = new Map();
let unsubscribe = null;
let onUpdateCallback = null;

/**
 * Initialize the agents listener
 * Listens to changes in the agents collection
 */
export function initAgentsListener() {
  const agentsRef = collection(db, 'agents');
  const q = query(agentsRef, orderBy('createdAt', 'asc'));

  unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const agent = {
        id: change.doc.id,
        ...change.doc.data()
      };

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

    // Trigger update callback
    if (onUpdateCallback) {
      onUpdateCallback(agents);
    }
  }, (error) => {
    console.error('❌ Error listening to agents:', error);
  });

  console.log('👀 Listening to agents collection...');
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

  // Detect status change
  if (previousStatus !== agent.status) {
    console.log(`🔄 Agent ${agent.name}: ${previousStatus} → ${agent.status}`);

    if (agent.status === 'working') {
      queueAnimation({
        type: 'focus',
        agentId: agent.id,
        task: agent.currentTask
      });
    } else if (agent.status === 'idle' && previousStatus === 'working') {
      queueAnimation({
        type: 'unfocus',
        agentId: agent.id
      });
    }

    previousStatuses.set(agent.id, agent.status);
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
