import * as Phaser from 'phaser';
import { SHAPES, COLORS, SYMBOLS } from '../constants.js';

export class TargetManager {
    constructor(scene) {
        this.scene = scene;
        this.targets = [];
        this.targetTexts = [];
        this.targetUIGroups = [[], []];
    }

    selectNewTargets() {
        this.targets = [];
        
        let availableValues = {
            shape: [...SHAPES],
            color: [...COLORS],
            symbol: [...SYMBOLS]
        };
        
        Phaser.Utils.Array.Shuffle(availableValues.shape);
        Phaser.Utils.Array.Shuffle(availableValues.color);
        Phaser.Utils.Array.Shuffle(availableValues.symbol);

        for (let i = 0; i < 2; i++) {
            let types = ['shape', 'color', 'symbol'];
            Phaser.Utils.Array.Shuffle(types);
            let selectedTypes = types.slice(0, 2);
            
            let target = { 
                found: 0, 
                attributes: {},
                requiredCount: 0 
            };
            
            selectedTypes.forEach(type => {
                target.attributes[type] = availableValues[type].pop();
            });
            
            this.targets.push(target);
        }
    }

    checkMatch(sprite) {
        // 1. Check for Perfect Match
        const perfectTarget = this.targets.find(t => {
            return Object.entries(t.attributes).every(([key, val]) => 
                sprite.getData(key) === val
            );
        });

        if (perfectTarget) {
            return { type: 'perfect', target: perfectTarget };
        }

        // 2. Check for Partial Match
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
        this.targetUIGroups = [[], []];

        this.scene.add.text(panelWidth / 2, 40, 'TARGETS', {
            font: 'bold 20px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setDepth(101);

        this.targets.forEach((target, index) => {
            const y = 130 + (index * 130);
            
            const header = this.scene.add.text(20, y - 65, `ITEM ${index + 1} ${target.found}/${target.requiredCount}`, {
                font: 'bold 14px Arial',
                fill: '#888888'
            }).setDepth(101);
            this.targetTexts.push(header);

            const iconBg = this.scene.add.graphics();
            iconBg.setDepth(100);
            iconBg.fillStyle(0xffffff, 0.05);
            iconBg.fillRoundedRect(15, y - 45, 170, 90, 12);
            iconBg.lineStyle(1, 0xffffff, 0.1);
            iconBg.strokeRoundedRect(15, y - 45, 170, 90, 12);
            this.targetUIGroups[index].push(iconBg);

            const attrTypes = Object.keys(target.attributes);
            attrTypes.forEach((type, attrIndex) => {
                const xPos = 60 + (attrIndex * 80);
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
            target.found = Math.min(target.found + 1, target.requiredCount || 99);
            this.updateUI();
        }
    }

    getTargetSum() {
        return this.targets.reduce((acc, t) => acc + t.found, 0);
    }
}
