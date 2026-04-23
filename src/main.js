import * as Phaser from "phaser";
import { SelectionScene } from "./scenes/SelectionScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { StartScene } from "./scenes/StartScene.js";
import { GAME_WIDTH, GAME_HEIGHT } from "./constants.js";

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-container",
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 1 },
      debug: false,
    },
  },
  scene: [StartScene, SelectionScene, GameScene],
};

const game = new Phaser.Game(config);
