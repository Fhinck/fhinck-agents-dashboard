/**
 * Renderer Module
 * Handles all visual rendering of agents and connections
 */

import { getAgent } from './agents-store.js';

// Icon mappings (SVG paths for Lucide-style icons)
const ICONS = {
  'message-circle': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
  </svg>`,
  'database': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>`,
  'shield': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>`,
  'file-text': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>`,
  'mail': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>`,
  'code': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="16,18 22,12 16,6"/>
    <polyline points="8,6 2,12 8,18"/>
  </svg>`,
  'brain': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 011.32-4.24 2.5 2.5 0 011.98-3A2.5 2.5 0 019.5 2z"/>
    <path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 00-1.32-4.24 2.5 2.5 0 00-1.98-3A2.5 2.5 0 0014.5 2z"/>
  </svg>`,
  'bot': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/>
    <line x1="8" y1="16" x2="8" y2="16"/>
    <line x1="16" y1="16" x2="16" y2="16"/>
  </svg>`,
  'default': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`
};

// State
let focusedAgentId = null;
let rendererInstance = null;

// DOM references
let agentsContainer = null;
let connectionsLayer = null;

/**
 * Initialize the renderer
 */
export function initRenderer() {
  agentsContainer = document.getElementById('agents-container');
  connectionsLayer = document.getElementById('connections');

  if (!agentsContainer || !connectionsLayer) {
    console.error('❌ Renderer: Required DOM elements not found');
    return;
  }

  rendererInstance = {
    resetAllStates
  };

  console.log('🎨 Renderer initialized');
}

/**
 * Get renderer instance
 * @returns {Object|null} Renderer instance
 */
export function getRenderer() {
  return rendererInstance;
}

/**
 * Render all agents
 * @param {Map} agents - Map of agents
 */
export function renderAgents(agents) {
  if (!agentsContainer) return;

  const agentsArray = [...agents.values()];

  // Calculate positions for agents in a network layout
  const positions = calculateNetworkPositions(agentsArray.length);

  // Clear existing agents
  agentsContainer.innerHTML = '';

  // Render each agent
  agentsArray.forEach((agent, index) => {
    const position = agent.position || positions[index];
    const element = createAgentElement(agent, position);
    agentsContainer.appendChild(element);
  });

  // Render connections
  renderConnections(agents);

  // Hide loading state
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');

  if (loadingState) loadingState.style.display = 'none';

  if (emptyState) {
    emptyState.style.display = agents.size === 0 ? 'flex' : 'none';
  }
}

/**
 * Create an agent DOM element
 * @param {Object} agent - Agent data
 * @param {Object} position - Position {x, y} as percentages
 * @returns {HTMLElement} Agent element
 */
function createAgentElement(agent, position) {
  const element = document.createElement('div');
  element.className = 'agent-node';
  element.dataset.agentId = agent.id;
  element.style.setProperty('--agent-color', agent.color || '#FF6B35');
  element.style.left = `${position.x * 100}%`;
  element.style.top = `${position.y * 100}%`;

  // Add working class if agent is working
  if (agent.status === 'working') {
    element.classList.add('working');
  }

  // Icon
  const iconHtml = ICONS[agent.icon] || ICONS['default'];
  const iconDiv = document.createElement('div');
  iconDiv.className = 'agent-icon';
  iconDiv.innerHTML = iconHtml;
  element.appendChild(iconDiv);

  // Name
  const nameDiv = document.createElement('div');
  nameDiv.className = 'agent-name';
  nameDiv.textContent = agent.name;
  element.appendChild(nameDiv);

  // Type (visible when focused)
  const typeDiv = document.createElement('div');
  typeDiv.className = 'agent-type';
  typeDiv.textContent = agent.type;
  element.appendChild(typeDiv);

  // Working indicator
  if (agent.status === 'working') {
    const indicator = document.createElement('div');
    indicator.className = 'working-indicator';
    element.appendChild(indicator);
  }

  // Add entrance animation
  element.classList.add('entering');
  setTimeout(() => element.classList.remove('entering'), 600);

  // Click handler
  element.addEventListener('click', () => handleAgentClick(agent.id));

  return element;
}

/**
 * Calculate network positions for agents
 * Creates a visually pleasing network layout
 * @param {number} count - Number of agents
 * @returns {Array} Array of position objects
 */
function calculateNetworkPositions(count) {
  const positions = [];
  const centerX = 0.55;
  const centerY = 0.5;

  if (count === 0) return positions;

  if (count === 1) {
    return [{ x: centerX, y: centerY }];
  }

  // Create positions in concentric circles
  const rings = Math.ceil(Math.sqrt(count / 3));
  let agentIndex = 0;

  // Center agent (largest/main)
  positions.push({ x: centerX, y: centerY });
  agentIndex++;

  // Outer rings
  for (let ring = 1; ring <= rings && agentIndex < count; ring++) {
    const radius = 0.15 + ring * 0.12;
    const agentsInRing = Math.min(6 * ring, count - agentIndex);
    const angleStep = (2 * Math.PI) / agentsInRing;
    const startAngle = -Math.PI / 2 + (ring % 2 === 0 ? angleStep / 2 : 0);

    for (let i = 0; i < agentsInRing && agentIndex < count; i++) {
      const angle = startAngle + i * angleStep;
      positions.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * 1.2 // Slightly stretched vertically
      });
      agentIndex++;
    }
  }

  // Clamp positions to valid range
  return positions.map(pos => ({
    x: Math.max(0.1, Math.min(0.9, pos.x)),
    y: Math.max(0.1, Math.min(0.9, pos.y))
  }));
}

/**
 * Render connection lines between agents
 * @param {Map} agents - Map of agents
 */
export function renderConnections(agents) {
  if (!connectionsLayer) return;

  const agentsArray = [...agents.values()];
  const positions = calculateNetworkPositions(agentsArray.length);

  // Clear existing connections
  connectionsLayer.innerHTML = '';

  if (agentsArray.length < 2) return;

  const rect = connectionsLayer.getBoundingClientRect();

  // Create connections (connect to nearby agents)
  agentsArray.forEach((agent, i) => {
    const pos1 = agent.position || positions[i];
    const x1 = pos1.x * rect.width;
    const y1 = pos1.y * rect.height;

    // Connect to next few agents
    for (let j = i + 1; j < Math.min(i + 3, agentsArray.length); j++) {
      const pos2 = agentsArray[j].position || positions[j];
      const x2 = pos2.x * rect.width;
      const y2 = pos2.y * rect.height;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.classList.add('connection-line');
      line.dataset.from = agent.id;
      line.dataset.to = agentsArray[j].id;

      connectionsLayer.appendChild(line);
    }

    // Connect to center (first agent) if not already connected
    if (i > 2) {
      const pos0 = agentsArray[0].position || positions[0];
      const x0 = pos0.x * rect.width;
      const y0 = pos0.y * rect.height;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x0);
      line.setAttribute('y2', y0);
      line.classList.add('connection-line');
      line.dataset.from = agent.id;
      line.dataset.to = agentsArray[0].id;

      connectionsLayer.appendChild(line);
    }
  });
}

/**
 * Animate focus on an agent
 * @param {string} agentId - Agent ID
 * @param {string} task - Current task description
 * @returns {Promise} Resolves when animation completes
 */
export async function animateFocus(agentId, task) {
  return new Promise((resolve) => {
    const agentElement = document.querySelector(`[data-agent-id="${agentId}"]`);

    if (!agentElement) {
      console.warn(`⚠️ Agent element not found: ${agentId}`);
      resolve();
      return;
    }

    focusedAgentId = agentId;

    // Dim other agents
    document.querySelectorAll('.agent-node').forEach(node => {
      if (node.dataset.agentId !== agentId) {
        node.classList.add('dimmed');
      }
    });

    // Focus and animate the selected agent
    agentElement.classList.add('focused', 'speaking');
    agentElement.classList.remove('working');

    // Highlight connections to this agent
    document.querySelectorAll('.connection-line').forEach(line => {
      if (line.dataset.from === agentId || line.dataset.to === agentId) {
        line.classList.add('active');
      }
    });

    // Update info panel
    const agent = getAgent(agentId);
    updateAgentInfo(agent, task);

    // Resolve after transition
    setTimeout(resolve, 1000);
  });
}

/**
 * Animate unfocus from an agent
 * @param {string} agentId - Agent ID
 * @returns {Promise} Resolves when animation completes
 */
export async function animateUnfocus(agentId) {
  return new Promise((resolve) => {
    const agentElement = document.querySelector(`[data-agent-id="${agentId}"]`);

    if (agentElement) {
      agentElement.classList.remove('focused', 'speaking');

      // Remove working indicator if exists
      const indicator = agentElement.querySelector('.working-indicator');
      if (indicator) indicator.remove();
    }

    // Restore other agents
    document.querySelectorAll('.agent-node').forEach(node => {
      node.classList.remove('dimmed');
    });

    // Reset connection highlights
    document.querySelectorAll('.connection-line').forEach(line => {
      line.classList.remove('active');
    });

    focusedAgentId = null;
    clearAgentInfo();

    setTimeout(resolve, 800);
  });
}

/**
 * Update the agent info panel
 * @param {Object} agent - Agent object
 * @param {string} task - Task description
 */
function updateAgentInfo(agent, task) {
  const infoPanel = document.getElementById('agent-info');
  if (!infoPanel) return;

  infoPanel.innerHTML = `
    <div class="current-task">
      <div class="task-agent" style="color: ${agent?.color || '#FF6B35'}">
        ${agent?.name || 'Unknown Agent'}
      </div>
      <span class="task-label">${task || 'Processing...'}</span>
      <span class="task-status">Working</span>
    </div>
  `;
  infoPanel.classList.add('visible');
}

/**
 * Clear the agent info panel
 */
function clearAgentInfo() {
  const infoPanel = document.getElementById('agent-info');
  if (infoPanel) {
    infoPanel.classList.remove('visible');
  }
}

/**
 * Handle click on an agent
 * @param {string} agentId - Agent ID
 */
function handleAgentClick(agentId) {
  const agent = getAgent(agentId);
  if (!agent) return;

  console.log(`🖱️ Agent clicked: ${agent.name}`, agent);

  // Could add custom click behavior here
  // For now, just log the agent info
}

/**
 * Reset all visual states
 */
function resetAllStates() {
  document.querySelectorAll('.agent-node').forEach(node => {
    node.classList.remove('focused', 'speaking', 'dimmed', 'working');
  });

  document.querySelectorAll('.connection-line').forEach(line => {
    line.classList.remove('active');
  });

  focusedAgentId = null;
  clearAgentInfo();
}

/**
 * Update status badges in header
 * @param {number} total - Total agents count
 * @param {number} active - Active agents count
 */
export function updateStatusBadges(total, active) {
  const totalBadge = document.querySelector('#total-agents span');
  const activeBadge = document.querySelector('#active-agents span');

  if (totalBadge) {
    const oldTotal = parseInt(totalBadge.textContent) || 0;
    totalBadge.textContent = total;
    if (oldTotal !== total) {
      totalBadge.parentElement.classList.add('updating');
      setTimeout(() => totalBadge.parentElement.classList.remove('updating'), 300);
    }
  }

  if (activeBadge) {
    const oldActive = parseInt(activeBadge.textContent) || 0;
    activeBadge.textContent = active;
    if (oldActive !== active) {
      activeBadge.parentElement.classList.add('updating');
      setTimeout(() => activeBadge.parentElement.classList.remove('updating'), 300);
    }
  }
}
