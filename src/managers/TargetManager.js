import * as Phaser from 'phaser';
import { SHAPES, COLORS, SYMBOLS } from '../constants.js';

export class TargetManager {
    constructor(scene) {
        this.scene = scene;
        this.targets = [];
        this.targetTexts = [];
        this.targetUIGroups = [];
    }

    selectNewTargets(pool, targetCount, totalGoal) {
        this.targets = [];
        
        // 1. Group pool by type and shuffle each bucket for randomness
        const buckets = { shape: [], color: [], symbol: [] };
        pool.forEach(c => buckets[c.type].push(c.value));
        Object.keys(buckets).forEach(type => {
            Phaser.Utils.Array.Shuffle(buckets[type]);
        });
        
        // 2. Prepare targets and distribute goal
        let remainingGoal = totalGoal;
        for (let i = 0; i < targetCount; i++) {
            const share = Math.ceil(remainingGoal / (targetCount - i));
            this.targets.push({ 
                found: 0, 
                attributes: {}, 
                requiredCount: share 
            });
            remainingGoal -= share;
        }

        // 3. Distribute characteristics from the pool
        // Each target needs 2 unique types.
        const typeNames = ['shape', 'color', 'symbol'];
        
        // Two passes to give each target 2 characteristics
        for (let pass = 0; pass < 2; pass++) {
            this.targets.forEach(target => {
                // To ensure variety and avoid exhaustion of types,
                // we should prefer types that have the MOST items remaining in their buckets,
                // excluding types this target already has.
                
                const availableTypes = typeNames
                    .filter(type => !target.attributes[type] && buckets[type].length > 0)
                    .sort((a, b) => buckets[b].length - buckets[a].length); // Descending abundance

                if (availableTypes.length > 0) {
                    const bestType = availableTypes[0];
                    target.attributes[bestType] = buckets[bestType].pop();
                }
            });
        }

        // 4. Final sweep: If any target still has < 2 (should be rare with above logic),
        // try to give it ANYTHING remaining, even if it's a type it already has (as a fallback)
        // or just use whatever is left in buckets.
        this.targets.forEach(target => {
            if (Object.keys(target.attributes).length < 2) {
                for (const type of typeNames) {
                    if (buckets[type].length > 0 && !target.attributes[type]) {
                        target.attributes[type] = buckets[type].pop();
                    }
                }
            }
        });
    }

    checkMatch(sprite) {
        const perfectTarget = this.targets.find(t => {
            const attrs = Object.entries(t.attributes);
            if (attrs.length === 0) return false;
            return attrs.every(([key, val]) => sprite.getData(key) === val);
        });

        if (perfectTarget) {
            return { type: 'perfect', target: perfectTarget };
        }

        const isPartialMatch = this.targets.some(t => {
            return Object.entries(t.attributes).some(([key, val]) => 
                sprite.getData(key) === val
            );
        });

        if (isPartialMatch) {
            return { type: 'partial', target: null };
        }

        return { type: 'none', target: null };
    }

    createUI(panelWidth) {
        this.targetTexts = [];
        this.targetUIGroups = [];

        this.scene.add.text(panelWidth / 2, 40, 'TARGETS', {
            font: 'bold 20px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setDepth(101);

        this.targets.forEach((target, index) => {
            const y = 130 + (index * 120);
            this.targetUIGroups[index] = [];
            
            const header = this.scene.add.text(20, y - 60, `ITEM ${index + 1} ${target.found}/${target.requiredCount}`, {
                font: 'bold 14px Arial',
                fill: '#888888'
            }).setDepth(101);
            this.targetTexts.push(header);

            const iconBg = this.scene.add.graphics();
            iconBg.setDepth(100);
            iconBg.fillStyle(0xffffff, 0.05);
            iconBg.fillRoundedRect(15, y - 40, 170, 80, 12);
            iconBg.lineStyle(1, 0xffffff, 0.1);
            iconBg.strokeRoundedRect(15, y - 40, 170, 80, 12);
            this.targetUIGroups[index].push(iconBg);

            const attrTypes = Object.keys(target.attributes);
            const count = attrTypes.length;
            
            attrTypes.forEach((type, attrIndex) => {
                // Centering logic
                let xPos = 100;
                if (count === 2) {
                    xPos = (attrIndex === 0) ? 60 : 140;
                }
                
                const val = target.attributes[type];

                if (type === 'shape') {
                    const icon = this.scene.add.image(xPos, y, `shape_${val}`);
                    icon.setScale(0.5);
                    icon.setDepth(101);
                    this.targetUIGroups[index].push(icon);
                } else if (type === 'color') {
                    const colorSwatch = this.scene.add.graphics();
                    colorSwatch.setDepth(101);
                    colorSwatch.fillStyle(val, 1);
                    colorSwatch.fillRoundedRect(xPos - 20, y - 20, 40, 40, 8);
                    colorSwatch.lineStyle(2, 0xffffff, 0.3);
                    colorSwatch.strokeRoundedRect(xPos - 20, y - 20, 40, 40, 8);
                    this.targetUIGroups[index].push(colorSwatch);
                } else if (type === 'symbol') {
                    const symbolTxt = this.scene.add.text(xPos, y, val, {
                        font: 'bold 32px Arial',
                        fill: '#ffffff'
                    }).setOrigin(0.5).setDepth(101);
                    this.targetUIGroups[index].push(symbolTxt);
                }
            });
        });
    }

    updateUI() {
        this.targetTexts.forEach((textObj, index) => {
            const target = this.targets[index];
            if (!target || !textObj) return;

            const isComplete = target.found === target.requiredCount;
            
            textObj.setText(`ITEM ${index + 1} ${target.found}/${target.requiredCount} ${isComplete ? '✔' : ''}`);
            if (isComplete) {
                textObj.setColor('#2ed573');
                if (this.targetUIGroups[index]) {
                    this.targetUIGroups[index].forEach(obj => {
                        if (obj && obj.active && obj.setAlpha) obj.setAlpha(0.4);
                    });
                }
                textObj.setAlpha(0.4);
            }
        });
    }

    incrementFound(target) {
        if (target) {
            target.found = Math.min(target.found + 1, target.requiredCount);
            this.updateUI();
        }
    }

    getTargetSum() {
        return this.targets.reduce((acc, t) => acc + t.found, 0);
    }
}
