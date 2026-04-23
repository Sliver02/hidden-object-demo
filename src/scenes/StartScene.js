import * as Phaser from 'phaser';
import { SHAPES, COLORS, GAME_WIDTH, GAME_HEIGHT } from '../constants.js';
import { generateGameTextures } from '../utils/TextureUtils.js';

export class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#111111');
        generateGameTextures(this);

        // Aligned shapes at the top
        const shuffledColors = Phaser.Utils.Array.Shuffle([...COLORS]);
        const spacing = 150;
        const startX = (GAME_WIDTH / 2) - (spacing * 1.5);
        const y = 150;

        SHAPES.forEach((shapeKey, index) => {
            const x = startX + (index * spacing);
            const shape = this.add.image(x, y, `shape_${shapeKey}`);
            shape.setScale(1.5);
            shape.setTint(shuffledColors[index]);
            
            // Add some subtle floating animation
            this.tweens.add({
                targets: shape,
                y: y + 10,
                duration: 2000 + (index * 200),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });

        // Title
        this.add.text(GAME_WIDTH / 2, 300, 'HIDDEN OBJECT', {
            font: 'bold 64px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Play Button
        const playBtnContainer = this.add.container(GAME_WIDTH / 2, 450);
        
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x2ed573, 1);
        btnBg.fillRoundedRect(-120, -35, 240, 70, 15);
        btnBg.lineStyle(4, 0xffffff, 0.3);
        btnBg.strokeRoundedRect(-120, -35, 240, 70, 15);
        playBtnContainer.add(btnBg);

        const btnText = this.add.text(0, 0, 'PLAY', {
            font: 'bold 32px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        playBtnContainer.add(btnText);

        const hitArea = new Phaser.Geom.Rectangle(-120, -35, 240, 70);
        playBtnContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        
        playBtnContainer.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0x7bed9f, 1);
            btnBg.fillRoundedRect(-120, -35, 240, 70, 15);
            btnBg.lineStyle(4, 0xffffff, 0.5);
            btnBg.strokeRoundedRect(-120, -35, 240, 70, 15);
            this.input.setDefaultCursor('pointer');
        });

        playBtnContainer.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x2ed573, 1);
            btnBg.fillRoundedRect(-120, -35, 240, 70, 15);
            btnBg.lineStyle(4, 0xffffff, 0.3);
            btnBg.strokeRoundedRect(-120, -35, 240, 70, 15);
            this.input.setDefaultCursor('default');
        });

        playBtnContainer.on('pointerdown', () => {
            this.input.setDefaultCursor('default');
            this.scene.start('SelectionScene');
        });

        // Pulsing effect for play button
        this.tweens.add({
            targets: playBtnContainer,
            scale: 1.05,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Quad.easeInOut'
        });
    }
}
