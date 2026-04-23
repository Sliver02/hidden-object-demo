import * as Phaser from 'phaser';

export function generateGameTextures(scene) {
    const graphics = scene.add.graphics();
    const lineThickness = 4;
    const size = 60;
    const halfSize = size / 2;

    // Circle
    if (!scene.textures.exists('shape_circle')) {
        graphics.clear();
        graphics.lineStyle(lineThickness, 0xffffff);
        graphics.strokeCircle(halfSize, halfSize, halfSize - lineThickness);
        graphics.generateTexture('shape_circle', size, size);
    }

    // Square
    if (!scene.textures.exists('shape_square')) {
        graphics.clear();
        graphics.lineStyle(lineThickness, 0xffffff);
        graphics.strokeRect(lineThickness/2, lineThickness/2, size - lineThickness, size - lineThickness);
        graphics.generateTexture('shape_square', size, size);
    }

    // Triangle
    if (!scene.textures.exists('shape_triangle')) {
        graphics.clear();
        graphics.lineStyle(lineThickness, 0xffffff);
        graphics.beginPath();
        graphics.moveTo(halfSize, lineThickness);
        graphics.lineTo(size - lineThickness, size - lineThickness);
        graphics.lineTo(lineThickness, size - lineThickness);
        graphics.closePath();
        graphics.strokePath();
        graphics.generateTexture('shape_triangle', size, size);
    }

    // Hexagon
    if (!scene.textures.exists('shape_hexagon')) {
        graphics.clear();
        graphics.lineStyle(lineThickness, 0xffffff);
        graphics.beginPath();
        const hexRadius = size / 2 - lineThickness;
        for (let i = 0; i < 6; i++) {
            const angle_rad = Math.PI / 180 * (60 * i - 30);
            const x = halfSize + hexRadius * Math.cos(angle_rad);
            const y = halfSize + hexRadius * Math.sin(angle_rad);
            if (i === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }
        graphics.closePath();
        graphics.strokePath();
        graphics.generateTexture('shape_hexagon', size, size);
    }
    
    graphics.destroy();
}
