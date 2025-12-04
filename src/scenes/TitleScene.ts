import Phaser from "phaser";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 80, "Super Pacamara Bros", {
        fontSize: "32px",
        color: "#fbbf24"
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 40, "- Get your Xmas BOX! -", {
        fontSize: "20px",
        color: "#e5e7eb"
      })
      .setOrigin(0.5);

    const startButton = this.add
      .rectangle(width / 2, height / 2 + 40, 220, 60, 0x22c55e)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, height / 2 + 40, "START", {
        fontSize: "22px",
        color: "#0b1120"
      })
      .setOrigin(0.5);

    // ▼ マウス / タッチで START ボタンを押したとき → LogoScene へ
    startButton.on("pointerdown", () => {
      this.scene.start("LogoScene");
    });

    // ▼ キーボードの SPACE でも同じく LogoScene へ
    this.input.keyboard?.once("keydown-SPACE", () => {
      this.scene.start("LogoScene");
    });

    // ▼ デバッグ用：ステージ直接選択ボタン
    const debugY = height / 2 + 130;
    this.add.text(width / 2, debugY, "[ Debug: Jump to Stage ]", {
      fontSize: "16px",
      color: "#9ca3af"
    }).setOrigin(0.5);

    const stages = [
      { label: "1", scene: "GameScene" },
      { label: "2", scene: "GameScene2" },
      { label: "3", scene: "GameScene3" }
    ];

    stages.forEach((st, index) => {
      const x = width / 2 + (index - 1) * 80; // 中央、左、右に配置
      const y = debugY + 40;

      const btn = this.add.rectangle(x, y, 60, 40, 0x4b5563)
        .setInteractive({ useHandCursor: true });

      this.add.text(x, y, st.label, { fontSize: "20px", color: "#ffffff" })
        .setOrigin(0.5);

      btn.on("pointerdown", () => {
        // デバッグ用なので直接シーンを開始
        this.scene.start(st.scene);
      });
    });
  }
}