/**
 * Toast Notifications System
 * Shows activity notifications on screen
 */

let container = null;
const MAX_NOTIFICATIONS = 5;
const DEFAULT_DURATION = 5000;

/**
 * Initialize notifications container
 */
export function initNotifications() {
  container = document.createElement('div');
  container.id = 'notifications-container';
  container.className = 'notifications-container';
  document.body.appendChild(container);

  console.log('🔔 Notifications system initialized');
}

/**
 * Show a notification
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} options.type - Type: 'info' | 'success' | 'warning' | 'agent-start' | 'agent-end'
 * @param {string} options.icon - Custom icon HTML (optional)
 * @param {string} options.color - Custom color (optional)
 * @param {number} options.duration - Duration in ms (optional)
 */
export function showNotification(options) {
  if (!container) initNotifications();

  const {
    title,
    message,
    type = 'info',
    icon,
    color,
    duration = DEFAULT_DURATION
  } = options;

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;

  if (color) {
    notification.style.setProperty('--notification-color', color);
  }

  // Get icon based on type
  const iconHtml = icon || getIconForType(type);

  notification.innerHTML = `
    <div class="notification-icon">${iconHtml}</div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      ${message ? `<div class="notification-message">${message}</div>` : ''}
    </div>
    <div class="notification-progress"></div>
  `;

  // Add to container
  container.appendChild(notification);

  // Animate progress bar
  const progress = notification.querySelector('.notification-progress');
  progress.style.animation = `notification-progress ${duration}ms linear`;

  // Limit notifications
  while (container.children.length > MAX_NOTIFICATIONS) {
    container.removeChild(container.firstChild);
  }

  // Trigger entrance animation
  requestAnimationFrame(() => {
    notification.classList.add('visible');
  });

  // Auto dismiss
  setTimeout(() => {
    dismissNotification(notification);
  }, duration);

  return notification;
}

/**
 * Dismiss a notification
 */
function dismissNotification(notification) {
  notification.classList.remove('visible');
  notification.classList.add('dismissing');

  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

/**
 * Get icon HTML for notification type
 */
function getIconForType(type) {
  const icons = {
    'info': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>`,
    'success': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>`,
    'warning': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`,
    'agent-start': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8"/>
    </svg>`,
    'agent-end': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="16 12 12 8 8 12"/>
      <line x1="12" y1="16" x2="12" y2="8"/>
    </svg>`
  };

  return icons[type] || icons['info'];
}

/**
 * Notify agent started working
 */
export function notifyAgentStart(agentName, task, color) {
  showNotification({
    title: agentName,
    message: task || 'Started working...',
    type: 'agent-start',
    color,
    duration: 4000
  });
}

/**
 * Notify agent finished working
 */
export function notifyAgentEnd(agentName, color) {
  showNotification({
    title: agentName,
    message: 'Task completed',
    type: 'agent-end',
    color,
    duration: 3000
  });
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
  if (container) {
    container.innerHTML = '';
  }
}
