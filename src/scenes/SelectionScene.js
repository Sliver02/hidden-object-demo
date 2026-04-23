import * as Phaser from 'phaser';
import { SHAPES, COLORS, SYMBOLS, GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { runManager } from '../managers/RunManager.js';
import { generateGameTextures } from '../utils/TextureUtils.js';

export class SelectionScene extends Phaser.Scene {
    constructor() {
        super('SelectionScene');
        this.selectedCount = 0;
        this.tempSelected = [];
        this.cards = [];
    }

    create() {
        this.selectedCount = 0;
        this.tempSelected = [];
        this.cards = [];
        
        this.cameras.main.setBackgroundColor('#1a1a1a');
        generateGameTextures(this);
        
        // Title
        this.add.text(GAME_WIDTH / 2, 60, 'CHOOSE 2 CHARACTERISTICS', {
            font: 'bold 32px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Get Available Characteristics
        const allPossible = [];
        SHAPES.forEach(v => allPossible.push({ type: 'shape', value: v }));
        COLORS.forEach(v => allPossible.push({ type: 'color', value: v }));
        SYMBOLS.forEach(v => allPossible.push({ type: 'symbol', value: v }));

        // 1. Remove already selected/in-game characteristics
        const available = allPossible.filter(p => {
            return !runManager.selectedCharacteristics.some(s => s.type === p.type && s.value === p.value);
        });

        Phaser.Utils.Array.Shuffle(available);
        
        // 2. Select up to 4 items for the screen, Max 2 per type
        const options = [];
        const typeCountsInScreen = { shape: 0, color: 0, symbol: 0 };
        
        for (const opt of available) {
            if (options.length < 4 && typeCountsInScreen[opt.type] < 2) {
                options.push(opt);
                typeCountsInScreen[opt.type]++;
            }
        }

        // 3. Render cards (centered)
        options.forEach((opt, index) => {
            this.createCard(index, opt, options.length);
        });

        // Start Button
        this.startButton = this.add.container(GAME_WIDTH / 2, 520);
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x2ed573, 1);
        btnBg.fillRoundedRect(-100, -25, 200, 50, 10);
        this.startButton.add(btnBg);
        
        const btnText = this.add.text(0, 0, 'START LEVEL', {
            font: 'bold 20px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.startButton.add(btnText);
        
        this.startButton.setAlpha(0.3);
        const hitArea = new Phaser.Geom.Rectangle(-100, -25, 200, 50);
        this.startButton.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        this.startButton.disableInteractive();

        this.startButton.on('pointerdown', () => {
            if (this.selectedCount === 2) {
                this.tempSelected.forEach(s => runManager.addCharacteristic(s));
                this.scene.start('GameScene');
            }
        });
    }

    createCard(index, opt, totalOptions) {
        const spacing = 240;
        const totalWidth = (totalOptions - 1) * spacing;
        const startX = (GAME_WIDTH / 2) - (totalWidth / 2);
        const x = startX + (index * spacing);
        const y = 300;
        
        const container = this.add.container(x, y);
        const bg = this.add.graphics();
        container.add(bg);

        // Visual Representation
        if (opt.type === 'shape') {
            const shape = this.add.image(0, -40, `shape_${opt.value}`);
            shape.setScale(1.2);
            container.add(shape);
            container.add(this.add.text(0, 40, opt.value.toUpperCase(), { font: 'bold 18px Arial', fill: '#ffffff' }).setOrigin(0.5));
        } else if (opt.type === 'color') {
            const swatch = this.add.graphics();
            swatch.fillStyle(opt.value, 1);
            swatch.fillRoundedRect(-40, -80, 80, 80, 10);
            container.add(swatch);
            container.add(this.add.text(0, 40, 'COLOR', { font: 'bold 18px Arial', fill: '#ffffff' }).setOrigin(0.5));
        } else if (opt.type === 'symbol') {
            const txt = this.add.text(0, -40, opt.value, { font: 'bold 80px Arial', fill: '#ffffff' }).setOrigin(0.5);
            container.add(txt);
            container.add(this.add.text(0, 40, 'SYMBOL', { font: 'bold 18px Arial', fill: '#ffffff' }).setOrigin(0.5));
        }

        const cardData = { container, bg, opt, isHover: false };
        this.cards.push(cardData);

        bg.setInteractive(new Phaser.Geom.Rectangle(-100, -150, 200, 300), Phaser.Geom.Rectangle.Contains);
        if (bg.input) bg.input.cursor = 'pointer';
        
        bg.on('pointerover', () => {
            cardData.isHover = true;
            this.updateAllCards();
        });
        
        bg.on('pointerout', () => {
            cardData.isHover = false;
            this.updateAllCards();
        });
        
        bg.on('pointerdown', () => {
            const isSelected = this.tempSelected.includes(opt);
            const isTypeTaken = this.tempSelected.some(s => s.type === opt.type);

            if (isSelected) {
                this.tempSelected = this.tempSelected.filter(o => o !== opt);
                this.selectedCount--;
            } else if (this.selectedCount < 2 && !isTypeTaken) {
                this.tempSelected.push(opt);
                this.selectedCount++;
            }
            
            this.updateAllCards();
            
            if (this.selectedCount === 2) {
                this.startButton.setAlpha(1);
                this.startButton.setInteractive();
                if (this.startButton.input) this.startButton.input.cursor = 'pointer';
            } else {
                this.startButton.setAlpha(0.3);
                this.startButton.disableInteractive();
            }
        });

        this.updateCardVisuals(cardData);
    }

    updateAllCards() {
        this.cards.forEach(cardData => this.updateCardVisuals(cardData));
    }

    updateCardVisuals(cardData) {
        const { bg, opt, isHover, container } = cardData;
        const isSelected = this.tempSelected.includes(opt);
        const isTypeTaken = this.tempSelected.some(s => s.type === opt.type);
        const isDisabled = isTypeTaken && !isSelected;

        bg.clear();
        
        if (isDisabled) {
            bg.fillStyle(0x1a1a1a, 1);
            container.setAlpha(0.2);
            bg.disableInteractive();
        } else {
            bg.fillStyle(isHover ? 0x3f4552 : 0x2f3542, 1);
            container.setAlpha(1);
            bg.setInteractive();
        }
        bg.fillRoundedRect(-100, -150, 200, 300, 15);
        
        if (isSelected) {
            bg.lineStyle(4, 0x2ed573, 1);
        } else if (isHover && !isDisabled) {
            bg.lineStyle(2, 0xffffff, 0.5);
        } else {
            bg.lineStyle(2, 0xffffff, 0.1);
        }
        bg.strokeRoundedRect(-100, -150, 200, 300, 15);
    }
}
