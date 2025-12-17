/**
 * Activity Feed
 * Shows recent agent activity in a sidebar feed
 */

const MAX_ITEMS = 15;
let feedContainer = null;
let activities = [];

/**
 * Initialize activity feed
 */
export function initActivityFeed() {
  // Create feed container
  feedContainer = document.createElement('div');
  feedContainer.id = 'activity-feed';
  feedContainer.className = 'activity-feed';
  feedContainer.innerHTML = `
    <div class="activity-feed-header">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      <span>Atividade Recente</span>
    </div>
    <div class="activity-feed-list" id="activity-feed-list">
      <div class="activity-feed-empty">Aguardando atividade...</div>
    </div>
  `;

  // Find canvas area and append
  const canvasArea = document.getElementById('agents-canvas');
  if (canvasArea) {
    canvasArea.appendChild(feedContainer);
  }

  console.log('📋 Activity feed initialized');
}

/**
 * Add activity to feed
 * @param {Object} activity - Activity data
 * @param {string} activity.agentName - Agent name
 * @param {string} activity.agentColor - Agent color
 * @param {string} activity.event - Event type: 'start' | 'end'
 * @param {string} activity.task - Task description
 * @param {Date} activity.timestamp - Event timestamp
 */
export function addActivity(activity) {
  if (!feedContainer) return;

  const {
    agentName,
    agentColor = '#FF6B35',
    event,
    task,
    timestamp = new Date()
  } = activity;

  // Add to beginning of array
  activities.unshift({
    id: Date.now(),
    agentName,
    agentColor,
    event,
    task,
    timestamp
  });

  // Limit activities
  if (activities.length > MAX_ITEMS) {
    activities = activities.slice(0, MAX_ITEMS);
  }

  // Render feed
  renderFeed();
}

/**
 * Render activity feed
 */
function renderFeed() {
  const list = document.getElementById('activity-feed-list');
  if (!list) return;

  if (activities.length === 0) {
    list.innerHTML = '<div class="activity-feed-empty">Aguardando atividade...</div>';
    return;
  }

  list.innerHTML = activities.map((activity, index) => `
    <div class="activity-item ${index === 0 ? 'new' : ''}" style="--agent-color: ${activity.agentColor}">
      <div class="activity-indicator ${activity.event}"></div>
      <div class="activity-content">
        <div class="activity-agent">${activity.agentName}</div>
        <div class="activity-task">${activity.event === 'start' ? activity.task || 'Started working' : 'Task completed'}</div>
      </div>
      <div class="activity-time">${formatTime(activity.timestamp)}</div>
    </div>
  `).join('');
}

/**
 * Format timestamp to relative time
 */
function formatTime(date) {
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);

  if (diff < 5) return 'agora';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

/**
 * Clear activity feed
 */
export function clearActivityFeed() {
  activities = [];
  renderFeed();
}

/**
 * Show/hide activity feed
 */
export function toggleActivityFeed(show) {
  if (feedContainer) {
    feedContainer.classList.toggle('hidden', !show);
  }
}

/**
 * Get activities
 */
export function getActivities() {
  return activities;
}
