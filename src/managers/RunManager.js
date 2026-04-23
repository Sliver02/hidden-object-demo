import { INITIAL_SANITY, UNLOCK_GOAL, MAX_LEVELS } from '../constants.js';

export class RunManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.sanity = INITIAL_SANITY;
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

    addScore(points) {
        this.totalScore += points;
    }
}

// Singleton instance
export const runManager = new RunManager();
