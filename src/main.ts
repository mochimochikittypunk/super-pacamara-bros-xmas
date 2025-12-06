
import Phaser from "phaser";
import { TitleScene } from "./scenes/TitleScene";
import { GameScene } from "./scenes/GameScene";
import { GameScene2 } from "./scenes/GameScene2";
import { GameScene3 } from "./scenes/GameScene3";
import { ClearSceneCoupon } from "./scenes/ClearSceneCoupon";
import { ClearSceneSimple } from "./scenes/ClearSceneSimple";
import { GameOverScene } from "./scenes/GameOverScene";
import { LogoScene } from "./scenes/LogoScene"; // ★ これを追加
import { GameScene4 } from "./scenes/GameScene4";
import { GameScene5 } from "./scenes/GameScene5"; // ★
import { LoadingScene } from "./scenes/LoadingScene";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 800 },
      debug: false
    }
  },
  scene: [TitleScene, LogoScene, GameScene,
    GameScene2,
    GameScene3,
    LoadingScene, // 3->4の間
    GameScene4,
    GameScene5, // ★
    ClearSceneSimple,
    ClearSceneCoupon,
    GameOverScene] // ★ GameScene3 追加
};

new Phaser.Game(config);