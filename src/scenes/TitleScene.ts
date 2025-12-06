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

    // ▼ デバッグ用：ステージ直接選択ボタン（初期非表示）
    const debugElements: (Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle)[] = [];
    const debugY = height / 2 + 130;

    const debugLabel = this.add.text(width / 2, debugY, "[ Debug: Jump to Stage ]", {
      fontSize: "16px",
      color: "#9ca3af"
    }).setOrigin(0.5);
    debugElements.push(debugLabel);
    // デバッグ用: ステージへのショートカット
    // ボタンとして並べる
    const stages = [
      { label: "1", scene: "GameScene" },
      { label: "2", scene: "GameScene2" },
      { label: "3", scene: "GameScene3" },
      { label: "4", scene: "GameScene4" },
      { label: "5", scene: "GameScene5" },
    ];

    stages.forEach((st, index) => {
      const x = width / 2 - 80 + index * 60; // 4つ並ぶので間隔と開始位置を調整
      const y = debugY + 40;

      const btn = this.add.rectangle(x, y, 60, 40, 0x4b5563)
        .setInteractive({ useHandCursor: true });

      const txt = this.add.text(x, y, st.label, { fontSize: "20px", color: "#ffffff" })
        .setOrigin(0.5);

      btn.on("pointerdown", () => {
        this.scene.start(st.scene);
      });

      debugElements.push(btn, txt);
    });

    // 初期状態は非表示
    debugElements.forEach(el => el.setVisible(false));

    // ▼ デバッグ表示トグルボタン
    const toggleBtn = this.add.text(width - 40, height - 40, "⚙️", { fontSize: "24px" })
      .setInteractive({ useHandCursor: true })
      .setOrigin(0.5);

    toggleBtn.on("pointerdown", () => {
      const isVisible = !debugElements[0].visible;
      debugElements.forEach(el => el.setVisible(isVisible));
    });
  }
}