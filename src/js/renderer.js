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
let currentZoom = 1;
let currentPanX = 0;
let currentPanY = 0;

// Pan/drag state
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let panStartX = 0;
let panStartY = 0;

// Agent positions map (calculated during render)
const agentPositions = new Map();

// DOM references
let agentsContainer = null;
let connectionsLayer = null;
let canvasArea = null;

// Zoom configuration
const ZOOM_CONFIG = {
  scale: 2.5,           // Zoom level when focused (mais zoom)
  transitionDuration: 1200,
  minZoom: 0.5,
  maxZoom: 3,
  zoomStep: 0.25
};

/**
 * Initialize the renderer
 */
export function initRenderer() {
  agentsContainer = document.getElementById('agents-container');
  connectionsLayer = document.getElementById('connections');
  canvasArea = document.querySelector('.canvas-area');

  if (!agentsContainer || !connectionsLayer) {
    console.error('❌ Renderer: Required DOM elements not found');
    return;
  }

  // Initialize zoom controls
  initZoomControls();

  // Initialize pan controls
  initPanControls();

  rendererInstance = {
    resetAllStates
  };

  console.log('🎨 Renderer initialized');
}

/**
 * Initialize zoom controls
 */
function initZoomControls() {
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomResetBtn = document.getElementById('zoom-reset');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      if (!focusedAgentId) {
        setManualZoom(currentZoom + ZOOM_CONFIG.zoomStep);
      }
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      if (!focusedAgentId) {
        setManualZoom(currentZoom - ZOOM_CONFIG.zoomStep);
      }
    });
  }

  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', () => {
      if (!focusedAgentId) {
        resetManualZoom();
      }
    });
  }

  const zoomFitBtn = document.getElementById('zoom-fit');
  if (zoomFitBtn) {
    zoomFitBtn.addEventListener('click', () => {
      if (!focusedAgentId) {
        fitToView();
      }
    });
  }

  // Mouse wheel zoom (with Ctrl key or without - like n8n)
  if (canvasArea) {
    canvasArea.addEventListener('wheel', (e) => {
      if (focusedAgentId) return;

      e.preventDefault();

      // Get mouse position relative to canvas
      const rect = canvasArea.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate zoom
      const delta = e.deltaY > 0 ? -ZOOM_CONFIG.zoomStep : ZOOM_CONFIG.zoomStep;
      const newZoom = Math.max(ZOOM_CONFIG.minZoom, Math.min(ZOOM_CONFIG.maxZoom, currentZoom + delta));

      if (newZoom !== currentZoom) {
        // Zoom towards mouse position
        const zoomRatio = newZoom / currentZoom;

        // Adjust pan to zoom towards mouse
        currentPanX = mouseX - (mouseX - currentPanX) * zoomRatio;
        currentPanY = mouseY - (mouseY - currentPanY) * zoomRatio;

        currentZoom = newZoom;
        applyTransform();
        updateZoomDisplay();
      }
    }, { passive: false });
  }

  console.log('🔍 Zoom controls initialized');
}

/**
 * Initialize pan/drag controls
 */
function initPanControls() {
  if (!canvasArea) return;

  // Mouse down - start dragging
  canvasArea.addEventListener('mousedown', (e) => {
    // Only start drag with left mouse button and not on agent nodes
    if (e.button !== 0 || e.target.closest('.agent-node')) return;
    if (focusedAgentId) return; // Don't pan while focused on an agent

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = currentPanX;
    panStartY = currentPanY;

    canvasArea.classList.add('panning');
    e.preventDefault();
  });

  // Mouse move - update pan
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    // Apply pan (adjusted for zoom level)
    currentPanX = panStartX + deltaX / currentZoom;
    currentPanY = panStartY + deltaY / currentZoom;

    applyTransform();
  });

  // Mouse up - stop dragging
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      canvasArea.classList.remove('panning');
    }
  });

  // Mouse leave - stop dragging if mouse leaves window
  document.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      canvasArea.classList.remove('panning');
    }
  });

  console.log('🖐️ Pan controls initialized');
}

/**
 * Set manual zoom level
 * @param {number} zoom - Zoom level (0.5 to 3)
 */
function setManualZoom(zoom) {
  currentZoom = Math.max(ZOOM_CONFIG.minZoom, Math.min(ZOOM_CONFIG.maxZoom, zoom));
  applyTransform();
  updateZoomDisplay();
}

/**
 * Apply transform (zoom + pan)
 */
function applyTransform() {
  const transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${currentZoom})`;

  if (agentsContainer) {
    agentsContainer.style.transform = transform;
  }
  if (connectionsLayer) {
    connectionsLayer.style.transform = transform;
  }
}

/**
 * Apply manual zoom transform (legacy - now uses applyTransform)
 */
function applyManualZoom() {
  applyTransform();
}

/**
 * Reset manual zoom and pan
 */
function resetManualZoom() {
  currentZoom = 1;
  currentPanX = 0;
  currentPanY = 0;
  applyTransform();
  updateZoomDisplay();
}

/**
 * Update zoom display
 */
function updateZoomDisplay() {
  const zoomLevel = document.getElementById('zoom-level');
  if (zoomLevel) {
    zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
  }
}

/**
 * Export zoom functions for external use
 */
export function zoomIn() {
  setManualZoom(currentZoom + ZOOM_CONFIG.zoomStep);
}

export function zoomOut() {
  setManualZoom(currentZoom - ZOOM_CONFIG.zoomStep);
}

export function resetZoom() {
  resetManualZoom();
}

/**
 * Center the view (reset pan only, keep zoom)
 */
export function centerView() {
  currentPanX = 0;
  currentPanY = 0;
  applyTransform();
}

/**
 * Fit all agents in view
 */
export function fitToView() {
  currentZoom = 1;
  currentPanX = 0;
  currentPanY = 0;
  applyTransform();
  updateZoomDisplay();
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

  // Separate Orchestrator from other agents
  const orchestratorIndex = agentsArray.findIndex(a => a.id === 'orchestrator');
  let orchestrator = null;
  let otherAgents = agentsArray;

  if (orchestratorIndex !== -1) {
    orchestrator = agentsArray[orchestratorIndex];
    otherAgents = agentsArray.filter(a => a.id !== 'orchestrator');
  }

  // Calculate positions: Orchestrator in center, others in circle
  const centerX = 0.5;
  const centerY = 0.5;

  // Clear existing agents and positions
  agentsContainer.innerHTML = '';
  agentPositions.clear();

  // Render Orchestrator in center first
  if (orchestrator) {
    const position = { x: centerX, y: centerY };
    agentPositions.set(orchestrator.id, position);
    const element = createAgentElement(orchestrator, position);
    agentsContainer.appendChild(element);
  }

  // Render other agents in a circle around the Orchestrator
  const radius = 0.35; // Distance from center
  otherAgents.forEach((agent, index) => {
    const angle = (2 * Math.PI * index / otherAgents.length) - Math.PI / 2; // Start from top
    const position = {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
    agentPositions.set(agent.id, position);
    const element = createAgentElement(agent, position);
    agentsContainer.appendChild(element);
  });

  // Render connections (each agent connects only to Orchestrator)
  renderConnections(agents, orchestrator, otherAgents);

  // Hide loading state
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');

  if (loadingState) loadingState.style.display = 'none';

  if (emptyState) {
    emptyState.style.display = agents.size === 0 ? 'flex' : 'none';
  }
}

/**
 * Convert hex color to RGB values
 * @param {string} hex - Hex color string (e.g., '#FF6B35')
 * @returns {Object} RGB values {r, g, b}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 107, b: 53 }; // Default orange
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

  // Set agent color and RGB values for animations
  const color = agent.color || '#FF6B35';
  const rgb = hexToRgb(color);
  element.style.setProperty('--agent-color', color);
  element.style.setProperty('--agent-r', rgb.r);
  element.style.setProperty('--agent-g', rgb.g);
  element.style.setProperty('--agent-b', rgb.b);

  element.style.left = `${position.x * 100}%`;
  element.style.top = `${position.y * 100}%`;

  // Add working class if agent is working
  if (agent.status === 'working') {
    element.classList.add('working');
  }

  // Icon - use SVG if available, otherwise show initials
  const iconDiv = document.createElement('div');
  iconDiv.className = 'agent-icon';

  if (agent.icon && ICONS[agent.icon]) {
    iconDiv.innerHTML = ICONS[agent.icon];
  } else {
    // Use initials as fallback
    const initials = agent.name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
    iconDiv.innerHTML = `<span class="agent-initials">${initials}</span>`;
  }
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
 * Each agent connects only to the Orchestrator (hub-and-spoke layout)
 * @param {Map} agents - Map of agents
 * @param {Object} orchestrator - The Orchestrator agent (center)
 * @param {Array} otherAgents - All other agents
 */
export function renderConnections(agents, orchestrator, otherAgents) {
  if (!connectionsLayer) return;

  // Clear existing connections
  connectionsLayer.innerHTML = '';

  // Need at least orchestrator and one other agent
  if (!orchestrator || otherAgents.length === 0) return;

  const rect = connectionsLayer.getBoundingClientRect();

  // Orchestrator position (center)
  const centerPos = agentPositions.get(orchestrator.id) || { x: 0.5, y: 0.5 };
  const centerX = centerPos.x * rect.width;
  const centerY = centerPos.y * rect.height;

  // Connect each agent to the Orchestrator only
  otherAgents.forEach((agent) => {
    const agentPos = agentPositions.get(agent.id) || { x: 0.5, y: 0.5 };
    const agentX = agentPos.x * rect.width;
    const agentY = agentPos.y * rect.height;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', agentX);
    line.setAttribute('y1', agentY);
    line.setAttribute('x2', centerX);
    line.setAttribute('y2', centerY);
    line.classList.add('connection-line');
    line.dataset.from = agent.id;
    line.dataset.to = orchestrator.id;

    connectionsLayer.appendChild(line);
  });
}

/**
 * Animate focus on an agent
 * @param {string} agentId - Agent ID
 * @param {string} task - Current task description
 * @returns {Promise} Resolves when animation completes
 */
export async function animateFocus(agentId, task) {
  // First, unfocus any currently focused agent (only one can be focused at a time)
  if (focusedAgentId && focusedAgentId !== agentId) {
    console.log(`🔄 Unfocusing previous agent: ${focusedAgentId}`);
    await animateUnfocus(focusedAgentId);
  }

  return new Promise((resolve) => {
    const agentElement = document.querySelector(`[data-agent-id="${agentId}"]`);

    if (!agentElement) {
      console.warn(`⚠️ Agent element not found: ${agentId}`);
      resolve();
      return;
    }

    focusedAgentId = agentId;

    // Get agent position for zoom centering
    const agent = getAgent(agentId);
    // Use calculated position from agentPositions map, or fallback
    const agentPos = agentPositions.get(agentId) || agent?.position || { x: 0.5, y: 0.5 };

    // Get canvas dimensions
    const canvasRect = canvasArea.getBoundingClientRect();
    const canvasWidth = canvasRect.width;
    const canvasHeight = canvasRect.height;

    // Calculate agent position in pixels
    const agentX = agentPos.x * canvasWidth;
    const agentY = agentPos.y * canvasHeight;

    // Calculate center of canvas
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Calculate zoom transform to center on agent
    const scale = ZOOM_CONFIG.scale;

    // With transform-origin: 0 0, we need to:
    // 1. Scale from top-left
    // 2. Translate so the agent ends up in the center
    // Formula: translate = center - (agentPos * scale)
    const focusPanX = centerX - (agentX * scale);
    const focusPanY = centerY - (agentY * scale);

    console.log(`🎯 Focus on agent at (${agentX}, ${agentY}), translate to (${focusPanX}, ${focusPanY}), scale: ${scale}`);

    // Apply zoom to canvas (vignette effect)
    if (canvasArea) {
      canvasArea.classList.add('focusing');
      // Set vignette center at the agent's screen position after transform
      canvasArea.style.setProperty('--focus-x', `${centerX}px`);
      canvasArea.style.setProperty('--focus-y', `${centerY}px`);
    }

    // Apply zoom and translation to agents layer
    // Note: translate first, then scale (with transform-origin: 0 0)
    const focusTransform = `translate(${focusPanX}px, ${focusPanY}px) scale(${scale})`;

    if (agentsContainer) {
      agentsContainer.classList.add('zoomed');
      agentsContainer.style.transform = focusTransform;
    }

    // Apply same transform to connections layer
    if (connectionsLayer) {
      connectionsLayer.classList.add('zoomed');
      connectionsLayer.style.transform = focusTransform;
    }

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
    updateAgentInfo(agent, task);

    // Resolve after transition
    setTimeout(resolve, ZOOM_CONFIG.transitionDuration);
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

    // Reset zoom on canvas
    if (canvasArea) {
      canvasArea.classList.remove('focusing');
    }

    // Reset zoom on agents layer (restore manual zoom + pan if set)
    if (agentsContainer) {
      agentsContainer.classList.remove('zoomed');
    }

    // Reset zoom on connections layer (restore manual zoom + pan if set)
    if (connectionsLayer) {
      connectionsLayer.classList.remove('zoomed');
    }

    // Restore manual zoom and pan
    applyTransform();

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

    setTimeout(resolve, ZOOM_CONFIG.transitionDuration);
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

  // Reset zoom (restore manual zoom + pan if set)
  if (canvasArea) {
    canvasArea.classList.remove('focusing');
  }
  if (agentsContainer) {
    agentsContainer.classList.remove('zoomed');
  }
  if (connectionsLayer) {
    connectionsLayer.classList.remove('zoomed');
  }

  // Restore manual zoom and pan
  applyTransform();

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

// ===================================
// View Management (Home / Project)
// ===================================

/**
 * Show home view (projects list)
 */
export function showHomeView() {
  const homeView = document.getElementById('home-view');
  const canvasArea = document.getElementById('agents-canvas');
  const zoomControls = document.getElementById('zoom-controls');

  if (homeView) homeView.classList.remove('hidden');
  if (canvasArea) canvasArea.classList.add('hidden');
  if (zoomControls) zoomControls.style.display = 'none';

  // Update sidebar
  updateSidebarActive('home');

  // Update header title
  updateHeaderTitle('AI Workforce Fhinck');
}

/**
 * Show project view (agents canvas)
 * @param {string} projectName - Project display name
 */
export function showProjectView(projectName) {
  const homeView = document.getElementById('home-view');
  const canvasArea = document.getElementById('agents-canvas');
  const zoomControls = document.getElementById('zoom-controls');

  if (homeView) homeView.classList.add('hidden');
  if (canvasArea) canvasArea.classList.remove('hidden');
  if (zoomControls) zoomControls.style.display = 'flex';

  // Update sidebar
  updateSidebarActive('dashboard');

  // Update header title
  updateHeaderTitle(projectName || 'AI Workforce Fhinck');
}

/**
 * Update sidebar active state
 * @param {string} view - Active view name
 */
function updateSidebarActive(view) {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.view === view) {
      item.classList.add('active');
    }
  });
}

/**
 * Update header title
 * @param {string} title - New title
 */
function updateHeaderTitle(title) {
  const titleElement = document.querySelector('.dashboard-title');
  if (titleElement) {
    titleElement.textContent = title;
  }
}

/**
 * Render projects list on home view
 * @param {Map} projects - Map of projects
 * @param {Function} onProjectClick - Callback when project is clicked
 */
export function renderProjectsList(projects, onProjectClick) {
  const container = document.getElementById('projects-container');
  const loading = document.getElementById('home-loading');
  const empty = document.getElementById('home-empty');

  if (!container) return;

  // Hide loading
  if (loading) loading.classList.add('hidden');

  // Check if empty
  if (projects.size === 0) {
    container.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  // Hide empty state
  if (empty) empty.classList.add('hidden');

  // Clear container
  container.innerHTML = '';

  // Render project cards
  projects.forEach(project => {
    const card = createProjectCard(project, onProjectClick);
    container.appendChild(card);
  });
}

/**
 * Create a project card element
 * @param {Object} project - Project data
 * @param {Function} onClick - Click handler
 * @returns {HTMLElement} Project card element
 */
function createProjectCard(project, onClick) {
  const card = document.createElement('div');
  card.className = 'project-card';
  card.dataset.projectId = project.id;

  // Get initials for icon
  const initials = project.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  card.innerHTML = `
    <div class="project-card-header">
      <div class="project-icon">${initials}</div>
      <div class="project-name">${project.name}</div>
    </div>
    <div class="project-stats">
      <div class="project-stat">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="7" r="4"/>
          <path d="M5.5 21a7.5 7.5 0 0113 0"/>
        </svg>
        <span class="project-stat-value">${project.agentCount}</span>
        <span>agentes</span>
      </div>
      ${project.lastActivity ? `
        <div class="project-stat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <span>${formatRelativeTime(project.lastActivity)}</span>
        </div>
      ` : ''}
    </div>
  `;

  card.addEventListener('click', () => {
    if (onClick) onClick(project.id);
  });

  return card;
}

/**
 * Format relative time
 * @param {Date} date - Date to format
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
  if (!date) return '';

  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

/**
 * Show home loading state
 */
export function showHomeLoading() {
  const loading = document.getElementById('home-loading');
  const empty = document.getElementById('home-empty');
  const container = document.getElementById('projects-container');

  if (loading) loading.classList.remove('hidden');
  if (empty) empty.classList.add('hidden');
  if (container) container.innerHTML = '';
}
