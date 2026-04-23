import * as Phaser from 'phaser';

class ExampleScene extends Phaser.Scene {
    constructor() {
        super();
        this.colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00]; // Cyan, Magenta, Yellow, Lime
        this.shapes = ['circle', 'square', 'triangle', 'hexagon'];
        this.symbols = ['+', '?', '%', '@'];
    }

    preload() {
        // We will generate the textures in create() to avoid loading external assets
    }

    create() {
        // Initialize/Reset game state
        this.targets = [];
        this.score = 0;
        this.sanity = 5;
        this.popsCount = 0; // Total pops (correct or partial)
        this.isGameOver = false;

        // Set up the scene background
        this.cameras.main.setBackgroundColor('#111111');

        // Set world bounds to cover the entire canvas, but we will use manual walls for the game box
        this.matter.world.setBounds(0, 0, 1200, 600, 100, true, true, true, true);
        
        // Manual Game Box Walls (centered at x=200 to 1000)
        const wallThickness = 50;
        // Left Wall at x=200
        this.matter.add.rectangle(200 - wallThickness/2, 300, wallThickness, 600, { isStatic: true });
        // Right Wall at x=1000
        this.matter.add.rectangle(1000 + wallThickness/2, 300, wallThickness, 600, { isStatic: true });
        // Bottom Wall
        this.matter.add.rectangle(600, 600 + wallThickness/2, 800, wallThickness, { isStatic: true });
        // Top Wall
        this.matter.add.rectangle(600, 0 - wallThickness/2, 800, wallThickness, { isStatic: true });

        // Generate graphics textures for our shapes
        this.generateTextures();
        
        // Select 2 random targets
        this.selectNewTargets();

        // Create UI Panels
        this.createLeftUI();
        this.createRightUI();

        // Draw visible bounding box border
        const border = this.add.graphics();
        border.lineStyle(6, 0x333333);
        border.strokeRect(200, 0, 800, 600);

        // Generate 64 items
        let itemsToSpawn = [];
        
        // Ensure 2-6 instances of each target
        this.targets.forEach(target => {
            const targetCount = Phaser.Math.Between(2, 6);
            target.requiredCount = targetCount; // Set the count
            for (let i = 0; i < targetCount; i++) {
                let item = { ...target.attributes };
                // Fill missing attributes with random values
                if (!item.shape) item.shape = Phaser.Utils.Array.GetRandom(this.shapes);
                if (!item.color) item.color = Phaser.Utils.Array.GetRandom(this.colors);
                if (!item.symbol) item.symbol = Phaser.Utils.Array.GetRandom(this.symbols);
                itemsToSpawn.push(item);
            }
        });

        // Fill the rest with non-matching items
        while (itemsToSpawn.length < 64) {
            let item = {
                shape: Phaser.Utils.Array.GetRandom(this.shapes),
                color: Phaser.Utils.Array.GetRandom(this.colors),
                symbol: Phaser.Utils.Array.GetRandom(this.symbols)
            };
            
            // Check if it accidentally matches any target
            const isMatch = this.targets.some(target => {
                return Object.entries(target.attributes).every(([key, val]) => item[key] === val);
            });
            
            if (!isMatch) {
                itemsToSpawn.push(item);
            }
        }

        // Shuffle items
        Phaser.Utils.Array.Shuffle(itemsToSpawn);

        // Spawn them mid-air at random positions
        itemsToSpawn.forEach(combo => {
            const x = Phaser.Math.Between(250, 950);
            const y = Phaser.Math.Between(50, 300);
            
            let sprite;
            const size = 60; // Size of the shape

            if (combo.shape === 'circle') {
                sprite = this.matter.add.sprite(x, y, 'shape_circle', null, { shape: { type: 'circle', radius: size / 2 } });
            } else if (combo.shape === 'square') {
                sprite = this.matter.add.sprite(x, y, 'shape_square', null, { shape: { type: 'rectangle', width: size, height: size } });
            } else if (combo.shape === 'triangle') {
                const poly = '30 -10 60 50 0 50';
                sprite = this.matter.add.sprite(x, y, 'shape_triangle', null, { shape: { type: 'fromVerts', verts: poly, flagInternal: true } });
            } else if (combo.shape === 'hexagon') {
                const poly = '52 17 52 43 30 56 8 43 8 17 30 4';
                sprite = this.matter.add.sprite(x, y, 'shape_hexagon', null, { shape: { type: 'fromVerts', verts: poly, flagInternal: true } });
            }

            // Set visual properties
            sprite.setTint(combo.color);
            sprite.setBounce(0.6);
            sprite.setFrictionAir(0.01);
            sprite.setFriction(0.05);
            
            // Store custom data for target matching
            sprite.setData('shape', combo.shape);
            sprite.setData('color', combo.color);
            sprite.setData('symbol', combo.symbol);
            
            // Add symbol text in the center of the shape
            const symbolText = this.add.text(0, 0, combo.symbol, {
                font: 'bold 24px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
            symbolText.setTint(combo.color);
            sprite.setData('symbolText', symbolText);
            
            // Random initial rotation
            sprite.setAngle(Phaser.Math.Between(0, 360));
        });

        // Setup input to pop objects
        this.input.on('pointerdown', (pointer) => {
            if (this.isGameOver) return;
            
            // Find all matter bodies under the pointer
            const bodiesUnderPointer = this.matter.query.point(this.matter.world.localWorld.bodies, { x: pointer.x, y: pointer.y });
            
            if (bodiesUnderPointer.length > 0) {
                // Get the first body that belongs to a sprite
                const clickedBody = bodiesUnderPointer.find(b => b.gameObject);
                    if (clickedBody) {
                        const spriteToDestroy = clickedBody.gameObject;
                        
                        // 1. Check for Perfect Match (All required attributes)
                        const perfectTarget = this.targets.find(t => {
                            return Object.entries(t.attributes).every(([key, val]) => 
                                spriteToDestroy.getData(key) === val
                            );
                        });

                        if (perfectTarget) {
                            this.handlePop(spriteToDestroy, 100, 0, perfectTarget);
                            return;
                        }

                        // 2. Check for Partial Match (At least one attribute from any target)
                        const isPartialMatch = this.targets.some(t => {
                            return Object.entries(t.attributes).some(([key, val]) => 
                                spriteToDestroy.getData(key) === val
                            );
                        });

                        if (isPartialMatch && this.sanity > 0) {
                            this.handlePop(spriteToDestroy, 50, 1, null);
                        }
                    }
                }
        });
    }

    update() {
        // Sync symbol text with sprites
        this.children.list.forEach(child => {
            if (child.getData && child.getData('symbolText')) {
                const text = child.getData('symbolText');
                text.x = child.x;
                text.y = child.y;
                text.rotation = child.rotation;
            }
        });
    }

    handlePop(sprite, points, damage, target) {
        // Visual Damage Feedback
        if (damage > 0) {
            this.cameras.main.shake(200, 0.02);
            this.cameras.main.flash(200, 0xff0000, 0.3);
            this.sanity = Math.max(0, this.sanity - damage);
        }

        this.score += points;
        this.popsCount++; // Increment total pops
        if (target) target.found = Math.min(target.found + 1, target.requiredCount);

        const symbolText = sprite.getData('symbolText');
        const targets = [sprite];
        if (symbolText) targets.push(symbolText);

        this.tweens.add({
            targets: targets,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 150,
            onComplete: () => {
                sprite.destroy();
                if (symbolText) symbolText.destroy();
                this.updateUI();

                if (this.sanity <= 0 && !this.isGameOver) {
                    this.showGameOver();
                }
            }
        });
    }

    showGameOver() {
        this.isGameOver = true;
        
        // Dark Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.8);
        overlay.fillRect(0, 0, 1200, 600);
        overlay.setDepth(1000);

        // Game Over Text
        this.add.text(600, 250, 'GAME OVER', {
            font: 'bold 64px Arial',
            fill: '#ff4757'
        }).setOrigin(0.5).setDepth(1001);

        // Retry Button
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x2f3542, 1);
        btnBg.fillRoundedRect(500, 350, 200, 60, 10);
        btnBg.lineStyle(2, 0xffffff, 0.5);
        btnBg.strokeRoundedRect(500, 350, 200, 60, 10);
        btnBg.setDepth(1001);

        const retryText = this.add.text(600, 380, 'RETRY', {
            font: 'bold 24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setDepth(1002);

        // Make button interactive
        retryText.setInteractive({ useHandCursor: true });
        retryText.on('pointerdown', () => {
            this.scene.restart();
        });
    }

    updateUI() {
        // Update Left UI
        this.targetTexts.forEach((textObj, index) => {
            const target = this.targets[index];
            const isComplete = target.found === target.requiredCount;
            
            textObj.setText(`ITEM ${index + 1} ${target.found}/${target.requiredCount} ${isComplete ? '✔' : ''}`);
            if (isComplete) {
                textObj.setColor('#2ed573'); // Green
                this.targetUIGroups[index].forEach(obj => obj.setAlpha(0.4));
                textObj.setAlpha(0.4);
            }
        });

        // Update Right UI
        this.scoreText.setText(`SCORE: ${this.score}`);
        this.sanityText.setText(`${this.sanity}/5`);

        // Update Next Level Button
        if (this.popsCount >= 5 && !this.nextLevelButtonEnabled) {
            this.enableNextLevelButton();
        } else if (!this.nextLevelButtonEnabled) {
            this.nextLevelProgress.setText(`UNLOCK: ${this.popsCount}/5`);
        }
    }

    selectNewTargets() {
        this.targets = [];
        
        let availableValues = {
            shape: [...this.shapes],
            color: [...this.colors],
            symbol: [...this.symbols]
        };
        
        // Shuffle values to ensure uniqueness
        Phaser.Utils.Array.Shuffle(availableValues.shape);
        Phaser.Utils.Array.Shuffle(availableValues.color);
        Phaser.Utils.Array.Shuffle(availableValues.symbol);

        for (let i = 0; i < 2; i++) {
            // Pick 2 random attribute types
            let types = ['shape', 'color', 'symbol'];
            Phaser.Utils.Array.Shuffle(types);
            let selectedTypes = types.slice(0, 2);
            
            let target = { 
                found: 0, 
                attributes: {},
                requiredCount: 0 // Will be set during spawn to match actual count
            };
            
            selectedTypes.forEach(type => {
                target.attributes[type] = availableValues[type].pop();
            });
            
            this.targets.push(target);
        }
    }

    createLeftUI() {
        const panelWidth = 200;
        const panel = this.add.graphics();
        panel.setDepth(100);
        this.targetTexts = []; // To keep track of text for updates
        this.targetUIGroups = [[], []]; // To keep track of card elements for alpha
        
        // Opaque Dark background for UI
        panel.fillStyle(0x1a1a1a, 1);
        panel.fillRect(0, 0, panelWidth, 600);
        panel.lineStyle(2, 0xffffff, 0.2);
        panel.strokeRect(panelWidth - 2, 0, 2, 600);

        this.add.text(panelWidth / 2, 40, 'TARGETS', {
            font: 'bold 20px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setDepth(101);

        // Display the two targets
        this.targets.forEach((target, index) => {
            const y = 130 + (index * 130);
            
            // Header: ITEM X 0/Y
            const header = this.add.text(20, y - 65, `ITEM ${index + 1} ${target.found}/${target.requiredCount}`, {
                font: 'bold 14px Arial',
                fill: '#888888'
            }).setDepth(101);
            this.targetTexts.push(header);

            // Icon Background
            const iconBg = this.add.graphics();
            iconBg.setDepth(100);
            iconBg.fillStyle(0xffffff, 0.05);
            iconBg.fillRoundedRect(15, y - 45, 170, 90, 12);
            iconBg.lineStyle(1, 0xffffff, 0.1);
            iconBg.strokeRoundedRect(15, y - 45, 170, 90, 12);
            this.targetUIGroups[index].push(iconBg);

            // Display the 2 required attributes
            const attrTypes = Object.keys(target.attributes);
            attrTypes.forEach((type, attrIndex) => {
                const xPos = 60 + (attrIndex * 80);
                const val = target.attributes[type];

                if (type === 'shape') {
                    const icon = this.add.image(xPos, y, `shape_${val}`);
                    icon.setScale(0.5);
                    icon.setDepth(101);
                    this.targetUIGroups[index].push(icon);
                } else if (type === 'color') {
                    const colorSwatch = this.add.graphics();
                    colorSwatch.setDepth(101);
                    colorSwatch.fillStyle(val, 1);
                    colorSwatch.fillRoundedRect(xPos - 20, y - 20, 40, 40, 8);
                    colorSwatch.lineStyle(2, 0xffffff, 0.3);
                    colorSwatch.strokeRoundedRect(xPos - 20, y - 20, 40, 40, 8);
                    this.targetUIGroups[index].push(colorSwatch);
                } else if (type === 'symbol') {
                    const symbolTxt = this.add.text(xPos, y, val, {
                        font: 'bold 32px Arial',
                        fill: '#ffffff'
                    }).setOrigin(0.5).setDepth(101);
                    this.targetUIGroups[index].push(symbolTxt);
                }
            });
        });
    }

    createRightUI() {
        const xStart = 1000;
        const panelWidth = 200;
        const panel = this.add.graphics();
        panel.setDepth(100);
        
        // Opaque Dark background for UI
        panel.fillStyle(0x1a1a1a, 1);
        panel.fillRect(xStart, 0, panelWidth, 600);
        panel.lineStyle(2, 0xffffff, 0.2);
        panel.strokeRect(xStart, 0, 2, 600);

        // 1. Sanity Tracker (Brain)
        this.drawBrainIcon(xStart + 50, 60);
        this.sanityText = this.add.text(xStart + 110, 60, `${this.sanity}/5`, {
            font: 'bold 24px Arial',
            fill: '#ff4757'
        }).setOrigin(0, 0.5).setDepth(101);

        // 2. Score Tracker
        this.scoreText = this.add.text(xStart + 100, 150, `SCORE: ${this.score}`, {
            font: 'bold 20px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setDepth(101);

        // 3. Next Level Button (Bottom Right)
        this.createNextLevelButton(xStart + 100, 550);
    }

    createNextLevelButton(x, y) {
        this.nextLevelButtonEnabled = false;

        // Button Background
        this.nextLevelBtnBg = this.add.graphics();
        this.nextLevelBtnBg.setDepth(101);
        this.nextLevelBtnBg.fillStyle(0x333333, 1);
        this.nextLevelBtnBg.fillRoundedRect(x - 80, y - 25, 160, 50, 10);
        this.nextLevelBtnBg.lineStyle(2, 0xffffff, 0.2);
        this.nextLevelBtnBg.strokeRoundedRect(x - 80, y - 25, 160, 50, 10);

        this.nextLevelText = this.add.text(x, y, 'NEXT LEVEL', {
            font: 'bold 18px Arial',
            fill: '#666666'
        }).setOrigin(0.5).setDepth(102);

        // Add progress text
        this.nextLevelProgress = this.add.text(x, y - 45, `UNLOCK: ${this.popsCount}/5`, {
            font: '14px Arial',
            fill: '#888888'
        }).setOrigin(0.5).setDepth(102);
    }

    enableNextLevelButton() {
        this.nextLevelButtonEnabled = true;
        
        // Update appearance
        this.nextLevelBtnBg.clear();
        this.nextLevelBtnBg.fillStyle(0x2ed573, 1); // Bright green
        this.nextLevelBtnBg.fillRoundedRect(this.nextLevelText.x - 80, this.nextLevelText.y - 25, 160, 50, 10);
        this.nextLevelBtnBg.lineStyle(2, 0xffffff, 0.5);
        this.nextLevelBtnBg.strokeRoundedRect(this.nextLevelText.x - 80, this.nextLevelText.y - 25, 160, 50, 10);

        this.nextLevelText.setStyle({ fill: '#ffffff' });
        this.nextLevelProgress.setText('READY!');
        this.nextLevelProgress.setStyle({ fill: '#2ed573' });

        // Make interactive
        this.nextLevelText.setInteractive({ useHandCursor: true });
        this.nextLevelText.on('pointerdown', () => {
            this.scene.restart();
        });

        // Little bounce animation to catch the eye
        this.tweens.add({
            targets: [this.nextLevelBtnBg, this.nextLevelText, this.nextLevelProgress],
            y: '-=5',
            duration: 100,
            yoyo: true,
            repeat: 1
        });
    }

    drawBrainIcon(x, y) {
        const brain = this.add.graphics();
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

    generateTextures() {
        const graphics = this.add.graphics();
        const lineThickness = 4;
        const size = 60;
        const halfSize = size / 2;

        // 1. Circle
        graphics.clear();
        graphics.lineStyle(lineThickness, 0xffffff);
        graphics.strokeCircle(halfSize, halfSize, halfSize - lineThickness);
        graphics.generateTexture('shape_circle', size, size);

        // 2. Square
        graphics.clear();
        graphics.lineStyle(lineThickness, 0xffffff);
        graphics.strokeRect(lineThickness/2, lineThickness/2, size - lineThickness, size - lineThickness);
        graphics.generateTexture('shape_square', size, size);

        // 3. Triangle (Equilateral-ish)
        graphics.clear();
        graphics.lineStyle(lineThickness, 0xffffff);
        graphics.beginPath();
        graphics.moveTo(halfSize, lineThickness); // Top
        graphics.lineTo(size - lineThickness, size - lineThickness); // Bottom Right
        graphics.lineTo(lineThickness, size - lineThickness); // Bottom Left
        graphics.closePath();
        graphics.strokePath();
        graphics.generateTexture('shape_triangle', size, size);

        // 4. Hexagon
        graphics.clear();
        graphics.lineStyle(lineThickness, 0xffffff);
        graphics.beginPath();
        // Pointy topped hexagon
        const hexRadius = size / 2 - lineThickness;
        for (let i = 0; i < 6; i++) {
            const angle_deg = 60 * i - 30;
            const angle_rad = Math.PI / 180 * angle_deg;
            const x = halfSize + hexRadius * Math.cos(angle_rad);
            const y = halfSize + hexRadius * Math.sin(angle_rad);
            if (i === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }
        graphics.closePath();
        graphics.strokePath();
        graphics.generateTexture('shape_hexagon', size, size);

        // Cleanup graphics object
        graphics.destroy();
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            debug: false // Turned off to prevent visual overlap
        }
    },
    scene: ExampleScene
};

const game = new Phaser.Game(config);
