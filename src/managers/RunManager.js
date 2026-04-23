import { MAX_SANITY, UNLOCK_GOAL, MAX_LEVELS } from '../constants.js';

export class RunManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.sanity = MAX_SANITY;
        this.currentLevel = 1;
        this.selectedCharacteristics = [];
        this.totalScore = 0;
        this.isVictory = false;
    }

    getUnlockGoal() {
        const goals = [5, 10, 25, 30];
        return goals[this.currentLevel - 1] || 30;
    }

    advanceLevel() {
        if (this.currentLevel < MAX_LEVELS) {
            this.currentLevel++;
            return true;
        } else {
            this.isVictory = true;
            return false;
        }
    }

    addCharacteristic(char) {
        this.selectedCharacteristics.push(char);
    }

    takeDamage(amount) {
        this.sanity = Math.max(0, this.sanity - amount);
        return this.sanity <= 0;
    }

    getSanityPercent() {
        return this.sanity / MAX_SANITY;
    }

    addScore(points) {
        this.totalScore += points;
    }

    getLevelObstacles() {
        // Simple rectangular scaffolds: { x, y, width, height }
        // BOX_X_START=200, BOX_X_END=1000, BOX_WIDTH=800, GAME_HEIGHT=600
        const levels = [
            // Level 1: 1 scaffold
            [{ x: 600, y: 400, width: 300, height: 20 }],
            
            // Level 2: 2 scaffolds
            [
                { x: 400, y: 450, width: 250, height: 20 },
                { x: 800, y: 300, width: 250, height: 20 }
            ],
            
            // Level 3: 3 scaffolds
            [
                { x: 350, y: 450, width: 200, height: 20 },
                { x: 600, y: 300, width: 200, height: 20 },
                { x: 850, y: 450, width: 200, height: 20 }
            ],
            
            // Level 4: 4 scaffolds
            [
                { x: 400, y: 500, width: 150, height: 20 },
                { x: 800, y: 500, width: 150, height: 20 },
                { x: 600, y: 350, width: 150, height: 20 },
                { x: 600, y: 150, width: 150, height: 20 }
            ]
        ];
        
        return levels[this.currentLevel - 1] || [];
    }
}

// Singleton instance
export const runManager = new RunManager();
