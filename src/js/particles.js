/**
 * Particles System
 * Animated background particles for visual effect on TV displays
 */

let canvas = null;
let ctx = null;
let particles = [];
let animationId = null;
let isRunning = false;

const CONFIG = {
  particleCount: 50,
  particleColor: 'rgba(255, 107, 53, 0.3)',
  particleSize: { min: 1, max: 3 },
  speed: { min: 0.2, max: 0.8 },
  connectionDistance: 150,
  connectionColor: 'rgba(255, 107, 53, 0.1)'
};

/**
 * Initialize particles system
 */
export function initParticles() {
  // Create canvas element
  canvas = document.createElement('canvas');
  canvas.id = 'particles-canvas';
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  `;

  // Insert at the beginning of body
  document.body.insertBefore(canvas, document.body.firstChild);

  ctx = canvas.getContext('2d');

  // Handle resize
  window.addEventListener('resize', handleResize);
  handleResize();

  // Create particles
  createParticles();

  // Start animation
  startAnimation();

  console.log('✨ Particles system initialized');
}

/**
 * Handle window resize
 */
function handleResize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

/**
 * Create initial particles
 */
function createParticles() {
  particles = [];

  for (let i = 0; i < CONFIG.particleCount; i++) {
    particles.push(createParticle());
  }
}

/**
 * Create a single particle
 */
function createParticle() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: CONFIG.particleSize.min + Math.random() * (CONFIG.particleSize.max - CONFIG.particleSize.min),
    speedX: (Math.random() - 0.5) * CONFIG.speed.max,
    speedY: (Math.random() - 0.5) * CONFIG.speed.max,
    opacity: 0.3 + Math.random() * 0.5
  };
}

/**
 * Update particle position
 */
function updateParticle(particle) {
  particle.x += particle.speedX;
  particle.y += particle.speedY;

  // Wrap around edges
  if (particle.x < 0) particle.x = canvas.width;
  if (particle.x > canvas.width) particle.x = 0;
  if (particle.y < 0) particle.y = canvas.height;
  if (particle.y > canvas.height) particle.y = 0;
}

/**
 * Draw a single particle
 */
function drawParticle(particle) {
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 107, 53, ${particle.opacity * 0.5})`;
  ctx.fill();
}

/**
 * Draw connections between nearby particles
 */
function drawConnections() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < CONFIG.connectionDistance) {
        const opacity = (1 - distance / CONFIG.connectionDistance) * 0.15;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(255, 107, 53, ${opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

/**
 * Animation loop
 */
function animate() {
  if (!isRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update and draw particles
  particles.forEach(particle => {
    updateParticle(particle);
    drawParticle(particle);
  });

  // Draw connections
  drawConnections();

  animationId = requestAnimationFrame(animate);
}

/**
 * Start animation
 */
export function startAnimation() {
  if (isRunning) return;
  isRunning = true;
  animate();
}

/**
 * Stop animation
 */
export function stopAnimation() {
  isRunning = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

/**
 * Create burst effect at position (for agent activity)
 */
export function createBurst(x, y, color = 'rgba(255, 107, 53, 0.8)') {
  const burstCount = 8;
  const burstParticles = [];

  for (let i = 0; i < burstCount; i++) {
    const angle = (Math.PI * 2 / burstCount) * i;
    burstParticles.push({
      x,
      y,
      size: 3,
      speedX: Math.cos(angle) * 3,
      speedY: Math.sin(angle) * 3,
      opacity: 1,
      decay: 0.02,
      color
    });
  }

  // Animate burst
  function animateBurst() {
    let alive = false;

    burstParticles.forEach(p => {
      if (p.opacity > 0) {
        alive = true;
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity -= p.decay;
        p.speedX *= 0.98;
        p.speedY *= 0.98;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.opacity, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${p.opacity})`);
        ctx.fill();
      }
    });

    if (alive) {
      requestAnimationFrame(animateBurst);
    }
  }

  animateBurst();
}

/**
 * Update config
 */
export function updateParticlesConfig(newConfig) {
  Object.assign(CONFIG, newConfig);
  createParticles();
}

/**
 * Destroy particles system
 */
export function destroyParticles() {
  stopAnimation();
  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
  canvas = null;
  ctx = null;
  particles = [];
}
