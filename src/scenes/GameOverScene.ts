import Phaser from "phaser";

export class GameOverScene extends Phaser.Scene {
  private returnToTitle = false;

  constructor() {
    super("GameOverScene");
  }

  init(data: { returnToTitle?: boolean }) {
    this.returnToTitle = !!data.returnToTitle;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#111827");

    this.add
      .text(width / 2, height / 2 - 40, "GAME OVER", {
        fontSize: "36px",
        color: "#f87171"
      })
      .setOrigin(0.5);

    const retryBtn = this.add
      .rectangle(width / 2, height / 2 + 20, 200, 50, 0x22c55e)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(retryBtn.x, retryBtn.y, "もう一度遊ぶ", {
        fontSize: "18px",
        color: "#022c22"
      })
      .setOrigin(0.5);

    retryBtn.on("pointerdown", () => {
      if (this.returnToTitle) {
        this.scene.start("TitleScene");
      } else {
        this.scene.start("GameScene", {
          lives: 3,
          hp: 2,
          beans: 0
        });
      }
    });

    this.input.keyboard?.once("keydown-SPACE", () => {
      if (this.returnToTitle) {
        this.scene.start("TitleScene");
      } else {
        this.scene.start("GameScene", {
          lives: 3,
          hp: 2,
          beans: 0
        });
      }
    });
  }
}
