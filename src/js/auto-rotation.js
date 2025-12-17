/**
 * Auto Rotation System
 * Automatically cycles through projects for TV display
 */

let isEnabled = false;
let rotationInterval = null;
let currentProjectIndex = 0;
let projects = [];
let onRotateCallback = null;

// Configuration
const CONFIG = {
  intervalMs: 30000, // 30 seconds per project
  showIndicator: true
};

/**
 * Initialize auto rotation
 * @param {Function} onRotate - Callback when rotating to new project
 */
export function initAutoRotation(onRotate) {
  onRotateCallback = onRotate;
  createIndicator();
  console.log('🔄 Auto rotation system initialized');
}

/**
 * Create rotation indicator UI
 */
function createIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'rotation-indicator';
  indicator.className = 'rotation-indicator';
  indicator.innerHTML = `
    <div class="rotation-toggle" id="rotation-toggle" title="Auto-rotate projects">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M23 4v6h-6"/>
        <path d="M1 20v-6h6"/>
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
      </svg>
    </div>
    <div class="rotation-progress" id="rotation-progress"></div>
    <div class="rotation-dots" id="rotation-dots"></div>
  `;

  document.body.appendChild(indicator);

  // Toggle click handler
  const toggle = document.getElementById('rotation-toggle');
  toggle.addEventListener('click', () => {
    if (isEnabled) {
      stopRotation();
    } else {
      startRotation();
    }
  });
}

/**
 * Update projects list
 * @param {Array} projectList - Array of project objects
 */
export function setProjects(projectList) {
  projects = projectList;
  updateDots();
}

/**
 * Start auto rotation
 */
export function startRotation() {
  if (projects.length <= 1) {
    console.log('⚠️ Not enough projects to rotate');
    return;
  }

  isEnabled = true;
  updateIndicatorState();

  // Start interval
  rotationInterval = setInterval(() => {
    rotateToNext();
  }, CONFIG.intervalMs);

  // Start progress animation
  startProgressAnimation();

  console.log('▶️ Auto rotation started');
}

/**
 * Stop auto rotation
 */
export function stopRotation() {
  isEnabled = false;
  updateIndicatorState();

  if (rotationInterval) {
    clearInterval(rotationInterval);
    rotationInterval = null;
  }

  stopProgressAnimation();

  console.log('⏹️ Auto rotation stopped');
}

/**
 * Rotate to next project
 */
function rotateToNext() {
  if (projects.length === 0) return;

  currentProjectIndex = (currentProjectIndex + 1) % projects.length;
  const nextProject = projects[currentProjectIndex];

  if (onRotateCallback && nextProject) {
    onRotateCallback(nextProject.id);
  }

  updateDots();
  restartProgressAnimation();
}

/**
 * Rotate to specific project
 * @param {number} index - Project index
 */
export function rotateToIndex(index) {
  if (index < 0 || index >= projects.length) return;

  currentProjectIndex = index;
  const project = projects[currentProjectIndex];

  if (onRotateCallback && project) {
    onRotateCallback(project.id);
  }

  updateDots();
  restartProgressAnimation();
}

/**
 * Update indicator state
 */
function updateIndicatorState() {
  const indicator = document.getElementById('rotation-indicator');
  const toggle = document.getElementById('rotation-toggle');

  if (indicator) {
    indicator.classList.toggle('active', isEnabled);
  }
  if (toggle) {
    toggle.classList.toggle('active', isEnabled);
  }
}

/**
 * Update navigation dots
 */
function updateDots() {
  const dotsContainer = document.getElementById('rotation-dots');
  if (!dotsContainer) return;

  if (projects.length <= 1) {
    dotsContainer.innerHTML = '';
    return;
  }

  dotsContainer.innerHTML = projects.map((project, index) => `
    <div class="rotation-dot ${index === currentProjectIndex ? 'active' : ''}"
         data-index="${index}"
         title="${project.name}">
    </div>
  `).join('');

  // Add click handlers to dots
  dotsContainer.querySelectorAll('.rotation-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const index = parseInt(dot.dataset.index);
      rotateToIndex(index);
    });
  });
}

/**
 * Start progress animation
 */
function startProgressAnimation() {
  const progress = document.getElementById('rotation-progress');
  if (progress) {
    progress.style.animation = `rotation-progress ${CONFIG.intervalMs}ms linear`;
  }
}

/**
 * Stop progress animation
 */
function stopProgressAnimation() {
  const progress = document.getElementById('rotation-progress');
  if (progress) {
    progress.style.animation = 'none';
  }
}

/**
 * Restart progress animation
 */
function restartProgressAnimation() {
  const progress = document.getElementById('rotation-progress');
  if (progress) {
    progress.style.animation = 'none';
    // Force reflow
    void progress.offsetWidth;
    progress.style.animation = `rotation-progress ${CONFIG.intervalMs}ms linear`;
  }
}

/**
 * Set rotation interval
 * @param {number} ms - Interval in milliseconds
 */
export function setRotationInterval(ms) {
  CONFIG.intervalMs = ms;

  if (isEnabled) {
    stopRotation();
    startRotation();
  }
}

/**
 * Get rotation state
 */
export function isRotationEnabled() {
  return isEnabled;
}

/**
 * Get current project index
 */
export function getCurrentIndex() {
  return currentProjectIndex;
}
