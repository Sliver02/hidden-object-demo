import * as Phaser from 'phaser';
import { SHAPES, COLORS, SYMBOLS, INITIAL_ITEM_COUNT, ITEM_SIZE } from '../constants.js';

export class SpawnManager {
    constructor(scene) {
        this.scene = scene;
    }

    spawnItems(targets, unlockGoal, level, obstacles = []) {
        let itemsToSpawn = [];
        
        // Density for 60px items: 30, 60, 100, 140
        const densityMap = [30, 60, 100, 140];
        const totalCount = densityMap[level - 1] || 140;

        // Use targets already set by TargetManager
        targets.forEach((target) => {
            const targetCount = target.requiredCount;
            for (let i = 0; i < targetCount; i++) {
                let item = { ...target.attributes };
                // Fill missing attributes if any
                if (!item.shape) item.shape = Phaser.Utils.Array.GetRandom(SHAPES);
                if (!item.color) item.color = Phaser.Utils.Array.GetRandom(COLORS);
                if (!item.symbol) item.symbol = Phaser.Utils.Array.GetRandom(SYMBOLS);
                itemsToSpawn.push(item);
            }
        });

        // Fill the rest with non-matching items
        while (itemsToSpawn.length < totalCount) {
            let item = {
                shape: Phaser.Utils.Array.GetRandom(SHAPES),
                color: Phaser.Utils.Array.GetRandom(COLORS),
                symbol: Phaser.Utils.Array.GetRandom(SYMBOLS)
            };
            
            const isMatch = targets.some(target => {
                return Object.entries(target.attributes).every(([key, val]) => item[key] === val);
            });
            
            if (!isMatch) {
                itemsToSpawn.push(item);
            }
        }

        Phaser.Utils.Array.Shuffle(itemsToSpawn);

        itemsToSpawn.forEach(combo => {
            let x, y, overlapping;
            let attempts = 0;
            const size = ITEM_SIZE;
            
            do {
                x = Phaser.Math.Between(250, 950);
                y = Phaser.Math.Between(100, 500); // More scattered vertical range
                overlapping = obstacles.some(obs => {
                    // Check if center (x,y) is within obstacle box + padding
                    return x > obs.x - obs.width/2 - size/2 && 
                           x < obs.x + obs.width/2 + size/2 &&
                           y > obs.y - obs.height/2 - size/2 &&
                           y < obs.y + obs.height/2 + size/2;
                });
                attempts++;
            } while (overlapping && attempts < 10);
            
            let sprite;

            if (combo.shape === 'circle') {
                sprite = this.scene.matter.add.sprite(x, y, 'shape_circle', null, { shape: { type: 'circle', radius: size / 2 } });
            } else if (combo.shape === 'square') {
                sprite = this.scene.matter.add.sprite(x, y, 'shape_square', null, { shape: { type: 'rectangle', width: size, height: size } });
            } else if (combo.shape === 'triangle') {
                const poly = '30 -10 60 50 0 50';
                sprite = this.scene.matter.add.sprite(x, y, 'shape_triangle', null, { shape: { type: 'fromVerts', verts: poly, flagInternal: true } });
            } else if (combo.shape === 'hexagon') {
                const poly = '52 17 52 43 30 56 8 43 8 17 30 4';
                sprite = this.scene.matter.add.sprite(x, y, 'shape_hexagon', null, { shape: { type: 'fromVerts', verts: poly, flagInternal: true } });
            }

            sprite.setTint(combo.color);
            sprite.setBounce(0.6);
            sprite.setFrictionAir(0.01);
            sprite.setFriction(0.05);
            
            sprite.setData('shape', combo.shape);
            sprite.setData('color', combo.color);
            sprite.setData('symbol', combo.symbol);
            
            const symbolText = this.scene.add.text(0, 0, combo.symbol, {
                font: 'bold 24px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
            symbolText.setTint(combo.color);
            sprite.setData('symbolText', symbolText);
            
            sprite.setAngle(Phaser.Math.Between(0, 360));
        });
    }
}
