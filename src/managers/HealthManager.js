import { INITIAL_SANITY } from '../constants.js';

export class HealthManager {
    constructor(scene, x, y) {
        this.scene = scene;
        this.sanity = INITIAL_SANITY;
        this.isGameOver = false;

        // Draw Brain Icon
        this.drawBrainIcon(x, y);
        
        this.sanityText = this.scene.add.text(x + 60, y, `${this.sanity}/${INITIAL_SANITY}`, {
            font: 'bold 24px Arial',
            fill: '#ff4757'
        }).setOrigin(0, 0.5).setDepth(101);
    }

    damage(amount) {
        if (amount <= 0) return;
        
        this.sanity = Math.max(0, this.sanity - amount);
        this.updateUI();

        // Visual Feedback
        this.scene.cameras.main.shake(200, 0.02);
        this.scene.cameras.main.flash(200, 0xff0000, 0.3);

        if (this.sanity <= 0 && !this.isGameOver) {
            this.isGameOver = true;
            this.scene.showGameOver();
        }
    }

    updateUI() {
        this.sanityText.setText(`${this.sanity}/${INITIAL_SANITY}`);
    }

    getSanity() {
        return this.sanity;
    }

    drawBrainIcon(x, y) {
        const brain = this.scene.add.graphics();
        brain.setDepth(101);
        brain.fillStyle(0xff7f7f, 1);
        
        // Simple stylized brain using circles
        brain.fillCircle(x - 10, y - 8, 12); // Left top
        brain.fillCircle(x + 10, y - 8, 12); // Right top
        brain.fillCircle(x - 12, y + 5, 12); // Left bottom
        brain.fillCircle(x + 12, y + 5, 12); // Right bottom
        
        // Brain details (subtle lines)
        brain.lineStyle(2, 0x000000, 0.2);
        brain.beginPath();
        brain.moveTo(x, y - 15);
        brain.lineTo(x, y + 15);
        brain.strokePath();
    }

    reset() {
        this.sanity = INITIAL_SANITY;
        this.isGameOver = false;
        this.updateUI();
    }
}
