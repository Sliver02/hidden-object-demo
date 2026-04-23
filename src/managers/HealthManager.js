import { MAX_SANITY, GAME_HEIGHT } from "../constants.js";
import { runManager } from "./RunManager.js";

// Bar sits at x=1000 (left edge of right panel), full game height
const BAR_X = 1007; // a few px inside the panel edge
const BAR_WIDTH = 26; // 10px wider
const BAR_HEIGHT = GAME_HEIGHT; // full height
const BAR_Y_TOP = 0;

// Colour gradient stops (green → orange → red)
function barColor(pct) {
  if (pct > 0.5) {
    // Green → Yellow
    const t = (pct - 0.5) / 0.5;
    const r = Math.round(255 * (1 - t));
    const g = 255;
    return (r << 16) | (g << 8);
  } else {
    // Yellow → Red
    const t = pct / 0.5;
    const g = Math.round(255 * t);
    return (255 << 16) | (g << 8);
  }
}

export class HealthManager {
  constructor(scene) {
    this.scene = scene;
    this.isGameOver = false;
    this.particles = [];

    // Background track
    this.trackGraphics = scene.add.graphics().setDepth(100);
    this.trackGraphics.fillStyle(0x111111, 1);
    this.trackGraphics.fillRect(BAR_X, BAR_Y_TOP, BAR_WIDTH, BAR_HEIGHT);
    this.trackGraphics.lineStyle(1, 0x444444, 1);
    this.trackGraphics.strokeRect(BAR_X, BAR_Y_TOP, BAR_WIDTH, BAR_HEIGHT);

    // Fill bar (drawn dynamically)
    this.barGraphics = scene.add.graphics().setDepth(101);

    // Particle container (fire embers)
    this.particleGraphics = scene.add.graphics().setDepth(102);

    this.redrawBar();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  damage(amount) {
    if (amount <= 0) return;

    const isDead = runManager.takeDamage(amount);
    this.redrawBar();

    // Visual feedback
    this.scene.cameras.main.shake(200, 0.02);
    this.scene.cameras.main.flash(200, 255, 0, 0);
    this.burstParticles(8);

    if (isDead && !this.isGameOver) {
      this.isGameOver = true;
      this.scene.showGameOver();
    }
  }

  passiveDrain(delta) {
    // Called each frame by GameScene. delta is ms.
    if (this.isGameOver) return;
    const isDead = runManager.takeDamage(delta / 1000); // drain rate in pts/sec handled by caller
    this.redrawBar();
    this.tickParticles(delta);
    if (isDead && !this.isGameOver) {
      this.isGameOver = true;
      this.scene.showGameOver();
    }
  }

  // Alias so GameScene.update() can call healthManager.update(delta)
  update(delta) {
    this.passiveDrain(delta);
  }

  updateUI() {
    this.redrawBar();
  }

  getSanity() {
    return runManager.sanity;
  }

  reset() {
    runManager.reset();
    this.isGameOver = false;
    this.particles = [];
    this.redrawBar();
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  redrawBar() {
    const pct = runManager.getSanityPercent();
    const fillH = Math.max(0, BAR_HEIGHT * pct);
    const fillY = BAR_Y_TOP + BAR_HEIGHT - fillH;

    this.barGraphics.clear();

    // Fill rectangle
    const col = barColor(pct);
    this.barGraphics.fillStyle(col, 1);
    this.barGraphics.fillRect(BAR_X, fillY, BAR_WIDTH, fillH);

    // Glow line on top edge of fill
    if (fillH > 2) {
      this.barGraphics.fillStyle(0xffffff, 0.6);
      this.barGraphics.fillRect(BAR_X, fillY, BAR_WIDTH, 2);
    }
  }

  // Spawn a burst of ember particles at the top of the fill
  burstParticles(count) {
    const pct = runManager.getSanityPercent();
    const fillH = BAR_HEIGHT * pct;
    const tipY = BAR_Y_TOP + BAR_HEIGHT - fillH;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: BAR_X + BAR_WIDTH / 2 + (Math.random() - 0.5) * BAR_WIDTH,
        y: tipY,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(1.0 + Math.random() * 1),
        life: 0.15 + Math.random() * 0.3, // seconds
        maxLife: 0,
        size: 3 + Math.random() * 4,
        col: Math.random() > 0.5 ? 0xff6600 : 0xffcc00,
      });
      this.particles[this.particles.length - 1].maxLife =
        this.particles[this.particles.length - 1].life;
    }
  }

  // Called each frame – advance particles and respawn a trickle
  tickParticles(delta) {
    const dt = delta / 1000;

    // Passive trickle: emit embers every frame
    if (Math.random() < 0.85) this.burstParticles(3);

    // Advance
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // slight drag / gravity back
    }

    // Draw
    this.particleGraphics.clear();
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      this.particleGraphics.fillStyle(p.col, alpha);
      this.particleGraphics.fillCircle(p.x, p.y, p.size * alpha);
    }
  }
}
