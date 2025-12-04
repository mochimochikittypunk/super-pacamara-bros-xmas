// src/scenes/LogoScene.ts
import Phaser from "phaser";

export class LogoScene extends Phaser.Scene {
  constructor() {
    super("LogoScene");
  }

  preload() {
    // ロゴ画像を読み込む
    this.load.image("shopLogo", "/assets/logo.png");
  }

  create() {
    const { width, height } = this.scale;

this.cameras.main.setBackgroundColor("#ffffff");

    // ロゴ画像を中央に表示
    const logo = this.add.image(width / 2, height / 2, "shopLogo");

    // 画面サイズに合わせて少し縮小（大きすぎる場合用）
    const maxWidth = width * 0.6;
    const maxHeight = height * 0.4;

    const scaleX = maxWidth / logo.width;
    const scaleY = maxHeight / logo.height;
    const scale = Math.min(scaleX, scaleY, 1);

    logo.setScale(scale);

    // 少しフェードイン演出
    logo.setAlpha(0);
    this.tweens.add({
      targets: logo,
      alpha: 1,
      duration: 500
    });

    // 2秒後に GameScene へ遷移
    this.time.delayedCall(2000, () => {
      this.scene.start("GameScene", {
        lives: 3,
        hp: 2,
        beans: 0
      });
    });
  }
}