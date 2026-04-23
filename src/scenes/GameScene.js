import * as Phaser from "phaser";
import { ScoreManager } from "../managers/ScoreManager.js";
import { HealthManager } from "../managers/HealthManager.js";
import { TargetManager } from "../managers/TargetManager.js";
import { SpawnManager } from "../managers/SpawnManager.js";
import { runManager } from "../managers/RunManager.js";
import { generateGameTextures } from "../utils/TextureUtils.js";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BOX_X_START,
  BOX_X_END,
  SANITY_DRAIN_RATE,
  SANITY_WRONG_HIT,
} from "../constants.js";

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.nextLevelButtonEnabled = false;
  }

  preload() {
    this.load.image("brain", "/src/assets/brain.png");
  }

  create() {
    // Initialize State
    this.isGameOver = false;
    this.popsCount = 0;
    this.unlockGoal = runManager.getUnlockGoal();
    this.nextLevelButtonEnabled = false;

    // Set up Physics
    this.cameras.main.setBackgroundColor("#111111");
    this.matter.world.setBounds(
      0,
      0,
      GAME_WIDTH,
      GAME_HEIGHT,
      100,
      true,
      true,
      true,
      true,
    );

    const wallThickness = 50;
    this.matter.add.rectangle(
      BOX_X_START - wallThickness / 2,
      300,
      wallThickness,
      600,
      { isStatic: true },
    );
    this.matter.add.rectangle(
      BOX_X_END + wallThickness / 2,
      300,
      wallThickness,
      600,
      { isStatic: true },
    );
    this.matter.add.rectangle(
      600,
      600 + wallThickness / 2,
      800,
      wallThickness,
      { isStatic: true },
    );
    this.matter.add.rectangle(600, 0 - wallThickness / 2, 800, wallThickness, {
      isStatic: true,
    });

    generateGameTextures(this);

    // Create Scaffolds
    this.obstacles = runManager.getLevelObstacles();
    this.scaffoldBodies = [];
    const scaffoldGraphics = this.add.graphics();
    scaffoldGraphics.fillStyle(0x333333, 1); // Lighter than #111111 background

    this.obstacles.forEach((obs) => {
      const body = this.matter.add.rectangle(
        obs.x,
        obs.y,
        obs.width,
        obs.height,
        {
          isStatic: true,
          label: "scaffold",
        },
      );
      this.scaffoldBodies.push(body);
      scaffoldGraphics.fillRect(
        obs.x - obs.width / 2,
        obs.y - obs.height / 2,
        obs.width,
        obs.height,
      );
    });

    // Initialize Managers
    this.targetManager = new TargetManager(this);
    this.scoreManager = new ScoreManager(this, 1120, 200);
    this.healthManager = new HealthManager(this);
    this.spawnManager = new SpawnManager(this);

    // Brain sprite — right portion of panel, above bar content
    const brainImg = this.add.image(1120, 60, "brain");
    brainImg.setDisplaySize(50, 50).setDepth(103).setAlpha(0.85);

    // Target Logic: use runManager pool
    this.targetManager.selectNewTargets(
      runManager.selectedCharacteristics,
      runManager.currentLevel,
      this.unlockGoal,
    );
    this.targetManager.createUI(200);
    this.spawnManager.spawnItems(
      this.targetManager.targets,
      this.unlockGoal,
      runManager.currentLevel,
      this.obstacles,
    );

    // One-Way Logic
    this.matter.world.on("collisionactive", (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const scaffold =
          bodyA.label === "scaffold"
            ? bodyA
            : bodyB.label === "scaffold"
              ? bodyB
              : null;
        const item =
          bodyA.label === "scaffold"
            ? bodyB
            : bodyB.label === "scaffold"
              ? bodyA
              : null;

        if (scaffold && item && item.gameObject) {
          // Collision active only if item is moving down and is above the platform
          // We allow passing through if item's center is below platform's top minus a small margin
          const platformTop = scaffold.position.y - 10; // 10 is half of 20 height
          if (item.position.y > platformTop) {
            pair.isActive = false;
          }
        }
      });
    });

    // UI Setup
    this.createUIPanels();
    this.createNextLevelButton(1120, 530);

    const border = this.add.graphics();
    border.lineStyle(6, 0x333333);
    border.strokeRect(200, 0, 800, 600);

    this.updateUI();

    // Input
    this.input.on("pointerdown", this.handlePointerDown, this);
  }

  createUIPanels() {
    const leftPanel = this.add.graphics();
    leftPanel.setDepth(90);
    leftPanel.fillStyle(0x1a1a1a, 1);
    leftPanel.fillRect(0, 0, 200, 600);
    leftPanel.lineStyle(2, 0xffffff, 0.2);
    leftPanel.strokeRect(198, 0, 2, 600);

    const rightPanel = this.add.graphics();
    rightPanel.setDepth(90);
    rightPanel.fillStyle(0x1a1a1a, 1);
    rightPanel.fillRect(1000, 0, 200, 600);
    rightPanel.lineStyle(2, 0xffffff, 0.2);
    rightPanel.strokeRect(1000, 0, 2, 600);

    // Subtle divider separating bar zone from content zone
    // Bar is at 1007, width 26. Right edge is 1033. Adding 10px padding -> 1043.
    rightPanel.lineStyle(1, 0xffffff, 0.08);
    rightPanel.lineBetween(1043, 0, 1043, 600);

    // Level Indicator
    this.add
      .text(1120, 20, `LEVEL ${runManager.currentLevel}`, {
        font: "bold 16px Arial",
        fill: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(101);
  }

  handlePointerDown(pointer) {
    if (this.isGameOver) return;

    const bodiesUnderPointer = this.matter.query.point(
      this.matter.world.localWorld.bodies,
      { x: pointer.x, y: pointer.y },
    );
    const clickedBody = bodiesUnderPointer.find((b) => b.gameObject);

    if (clickedBody) {
      const sprite = clickedBody.gameObject;
      if (sprite.getData("popping")) return;

      const match = this.targetManager.checkMatch(sprite);

      if (match.type === "perfect") {
        this.targetManager.incrementFound(match.target);
        this.handlePop(sprite, 100, 0);
      } else if (match.type === "partial") {
        this.handlePop(sprite, 50, SANITY_WRONG_HIT);
      }
    }
  }

  handlePop(sprite, points, damage) {
    if (this.isGameOver || !sprite || !sprite.active) return;

    sprite.setData("popping", true);
    if (sprite.body) {
      sprite.setStatic(true);
      this.matter.world.remove(sprite.body);
    }

    if (damage > 0) {
      this.healthManager.damage(damage);
    }

    runManager.addScore(points);
    this.scoreManager.addPoints(points); // Keep visual sync
    this.popsCount++;

    this.updateUI();

    const symbolText = sprite.getData("symbolText");
    const tweenTargets = [sprite];
    if (symbolText && symbolText.active) tweenTargets.push(symbolText);

    this.tweens.add({
      targets: tweenTargets,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        if (symbolText && symbolText.active) symbolText.destroy();
        if (sprite && sprite.active) sprite.destroy();
      },
    });
  }

  update(time, delta) {
    if (this.healthManager && !this.isGameOver) {
      this.healthManager.passiveDrain(delta * SANITY_DRAIN_RATE);
    }

    const children = this.children.list.slice();
    children.forEach((child) => {
      if (
        child.active &&
        child.getData &&
        child.getData("symbolText") &&
        !child.getData("popping")
      ) {
        const text = child.getData("symbolText");
        if (text && text.active) {
          text.x = child.x;
          text.y = child.y;
          text.rotation = child.rotation;
        }
      }
    });
  }

  updateUI() {
    if (this.targetManager) this.targetManager.updateUI();
    if (this.scoreManager) this.scoreManager.updateUI();
    if (this.healthManager) this.healthManager.updateUI();

    // Update Next Level Button
    const canUnlock = this.popsCount >= this.unlockGoal;

    if (canUnlock && !this.nextLevelButtonEnabled) {
      this.enableNextLevelButton();
    } else if (!this.nextLevelButtonEnabled && this.nextLevelProgress) {
      this.nextLevelProgress.setText(
        `UNLOCK: ${this.popsCount}/${this.unlockGoal}`,
      );
    }
  }

  createNextLevelButton(x, y) {
    this.nextLevelButtonEnabled = false;
    this.nextLevelBtnBg = this.add.graphics().setDepth(101);
    this.nextLevelBtnBg.fillStyle(0x333333, 1);
    this.nextLevelBtnBg.fillRoundedRect(x - 70, y - 25, 140, 50, 10);
    this.nextLevelBtnBg.lineStyle(2, 0xffffff, 0.2);
    this.nextLevelBtnBg.strokeRoundedRect(x - 70, y - 25, 140, 50, 10);

    this.nextLevelText = this.add
      .text(x, y, "NEXT LEVEL", {
        font: "bold 18px Arial",
        fill: "#666666",
      })
      .setOrigin(0.5)
      .setDepth(102);

    this.nextLevelProgress = this.add
      .text(x, y - 45, `UNLOCK: ${this.popsCount}/${this.unlockGoal}`, {
        font: "14px Arial",
        fill: "#888888",
      })
      .setOrigin(0.5)
      .setDepth(102);
  }

  enableNextLevelButton() {
    this.nextLevelButtonEnabled = true;
    this.nextLevelBtnBg.clear();
    this.nextLevelBtnBg.fillStyle(0x2ed573, 1);
    this.nextLevelBtnBg.fillRoundedRect(
      this.nextLevelText.x - 80,
      this.nextLevelText.y - 25,
      160,
      50,
      10,
    );
    this.nextLevelBtnBg.lineStyle(2, 0xffffff, 0.5);
    this.nextLevelBtnBg.strokeRoundedRect(
      this.nextLevelText.x - 80,
      this.nextLevelText.y - 25,
      160,
      50,
      10,
    );

    this.nextLevelText.setStyle({ fill: "#ffffff" });
    this.nextLevelProgress.setText("READY!");
    this.nextLevelProgress.setStyle({ fill: "#2ed573" });

    const nextLevelHitArea = new Phaser.Geom.Rectangle(
      this.nextLevelText.x - 80,
      this.nextLevelText.y - 25,
      160,
      50,
    );
    this.nextLevelBtnBg.setInteractive(
      nextLevelHitArea,
      Phaser.Geom.Rectangle.Contains,
    );
    if (this.nextLevelBtnBg.input) this.nextLevelBtnBg.input.cursor = "pointer";

    this.nextLevelBtnBg.on("pointerdown", () => {
      const hasMoreLevels = runManager.advanceLevel();
      if (hasMoreLevels) {
        this.scene.start("SelectionScene");
      } else {
        this.showGameOver(true); // Victory!
      }
    });

    this.tweens.add({
      targets: [
        this.nextLevelBtnBg,
        this.nextLevelText,
        this.nextLevelProgress,
      ],
      y: "-=5",
      duration: 100,
      yoyo: true,
      repeat: 1,
    });
  }

  showGameOver(isVictory = false) {
    this.isGameOver = true;
    const overlay = this.add.graphics().setDepth(1000);
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const titleText = isVictory ? "YOU WIN!" : "GAME OVER";
    const titleColor = isVictory ? "#2ed573" : "#ff4757";

    this.add
      .text(GAME_WIDTH / 2, 250, titleText, {
        font: "bold 64px Arial",
        fill: titleColor,
      })
      .setOrigin(0.5)
      .setDepth(1001);

    if (isVictory) {
      this.add
        .text(GAME_WIDTH / 2, 310, `TOTAL SCORE: ${runManager.totalScore}`, {
          font: "bold 24px Arial",
          fill: "#ffffff",
        })
        .setOrigin(0.5)
        .setDepth(1001);
    }

    const btnBg = this.add.graphics().setDepth(1001);
    btnBg.fillStyle(0x2f3542, 1);
    btnBg.fillRoundedRect(GAME_WIDTH / 2 - 100, 390, 200, 60, 10);
    btnBg.lineStyle(2, 0xffffff, 0.5);
    btnBg.strokeRoundedRect(GAME_WIDTH / 2 - 100, 390, 200, 60, 10);

    this.add
      .text(GAME_WIDTH / 2, 420, isVictory ? "PLAY AGAIN" : "RETRY", {
        font: "bold 24px Arial",
        fill: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(1002);

    const retryHitArea = new Phaser.Geom.Rectangle(
      GAME_WIDTH / 2 - 100,
      390,
      200,
      60,
    );
    btnBg.setInteractive(retryHitArea, Phaser.Geom.Rectangle.Contains);
    if (btnBg.input) btnBg.input.cursor = "pointer";

    btnBg.on("pointerdown", () => {
      runManager.reset();
      this.scene.start("SelectionScene");
    });
  }
}
