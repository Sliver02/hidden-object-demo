export class ScoreManager {
    constructor(scene, x, y) {
        this.scene = scene;
        this.score = 0;
        
        this.scoreText = this.scene.add.text(x, y, `SCORE: ${this.score}`, {
            font: 'bold 20px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setDepth(101);
    }

    addPoints(points) {
        this.score += points;
        this.updateUI();
    }

    updateUI() {
        this.scoreText.setText(`SCORE: ${this.score}`);
    }

    getScore() {
        return this.score;
    }

    reset() {
        this.score = 0;
        this.updateUI();
    }
}
