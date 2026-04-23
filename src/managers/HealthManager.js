import { INITIAL_SANITY } from '../constants.js';
import { runManager } from './RunManager.js';

export class HealthManager {
    constructor(scene, x, y) {
        this.scene = scene;
        this.isGameOver = false;

        // Draw Brain Icon
        this.drawBrainIcon(x, y);
        
        this.sanityText = this.scene.add.text(x + 60, y, `${runManager.sanity}/${INITIAL_SANITY}`, {
            font: 'bold 24px Arial',
            fill: '#ff4757'
        }).setOrigin(0, 0.5).setDepth(101);
    }

    damage(amount) {
        if (amount <= 0) return;
        
        const isDead = runManager.takeDamage(amount);
        this.updateUI();

        // Visual Feedback
        this.scene.cameras.main.shake(200, 0.02);
        this.scene.cameras.main.flash(200, 0xff0000, 0.3);

        if (isDead && !this.isGameOver) {
            this.isGameOver = true;
            this.scene.showGameOver();
        }
    }

    updateUI() {
        this.sanityText.setText(`${runManager.sanity}/${INITIAL_SANITY}`);
    }

    getSanity() {
        return runManager.sanity;
    }

    drawBrainIcon(x, y) {
        const brain = this.scene.add.graphics();
        brain.setDepth(101);
        brain.fillStyle(0xff7f7f, 1);
        
        brain.fillCircle(x - 10, y - 8, 12);
        brain.fillCircle(x + 10, y - 8, 12);
        brain.fillCircle(x - 12, y + 5, 12);
        brain.fillCircle(x + 12, y + 5, 12);
        
        brain.lineStyle(2, 0x000000, 0.2);
        brain.beginPath();
        brain.moveTo(x, y - 15);
        brain.lineTo(x, y + 15);
        brain.strokePath();
    }

    reset() {
        runManager.reset();
        this.isGameOver = false;
        this.updateUI();
    }
}
