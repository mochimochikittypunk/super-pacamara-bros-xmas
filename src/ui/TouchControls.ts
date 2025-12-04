// src/ui/TouchControls.ts
import Phaser from "phaser";

/**
 * 画面下の HTML ボタン（#touch-ui 内）と GameScene の橋渡しをするクラス。
 * Phaser 上には何も描画せず、ボタンの押下状態だけを管理する。
 */
export class TouchControls {
  private scene: Phaser.Scene;

  public leftPressed = false;
  public rightPressed = false;
  public jumpPressed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create() {
    // PC (デスクトップ) の場合は表示しない
    // ※デバッグ時はここをコメントアウトするとPCでも表示確認できます
    if (this.scene.sys.game.device.os.desktop) {
      return;
    }

    const { width, height } = this.scene.scale;

    // ボタン設定
    const buttonRadius = 40; // 半径
    const padding = 60;      // 画面端からの距離
    const color = 0xffffff;
    const alpha = 0.3;       // 半透明

    // --- 左ボタン (←) ---
    const leftX = padding;
    const leftY = height - padding;

    const leftBtn = this.scene.add.circle(leftX, leftY, buttonRadius, color, alpha)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive();

    // 矢印アイコン（簡易的にテキストで）
    this.scene.add.text(leftX, leftY, "←", { fontSize: "40px", color: "#ffffff" })
      .setScrollFactor(0)
      .setDepth(101)
      .setOrigin(0.5);

    // --- 右ボタン (→) ---
    const rightX = padding + buttonRadius * 2 + 20; // 左ボタンの隣
    const rightY = height - padding;

    const rightBtn = this.scene.add.circle(rightX, rightY, buttonRadius, color, alpha)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive();

    this.scene.add.text(rightX, rightY, "→", { fontSize: "40px", color: "#ffffff" })
      .setScrollFactor(0)
      .setDepth(101)
      .setOrigin(0.5);

    // --- ジャンプボタン (JUMP) ---
    const jumpX = width - padding;
    const jumpY = height - padding;
    const jumpColor = 0x22c55e; // 緑色

    const jumpBtn = this.scene.add.circle(jumpX, jumpY, buttonRadius, jumpColor, alpha)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive();

    this.scene.add.text(jumpX, jumpY, "J", { fontSize: "40px", color: "#ffffff" })
      .setScrollFactor(0)
      .setDepth(101)
      .setOrigin(0.5);

    // --- イベント登録 ---
    this.setupButton(leftBtn,
      () => this.leftPressed = true,
      () => this.leftPressed = false
    );

    this.setupButton(rightBtn,
      () => this.rightPressed = true,
      () => this.rightPressed = false
    );

    this.setupButton(jumpBtn,
      () => this.jumpPressed = true,
      () => this.jumpPressed = false
    );
  }

  private setupButton(obj: Phaser.GameObjects.GameObject, onDown: () => void, onUp: () => void) {
    // タッチ開始
    obj.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      onDown();
    });

    // タッチ終了・キャンセル・範囲外へ出た場合
    const clear = () => {
      onUp();
    };

    obj.on("pointerup", clear);
    obj.on("pointerout", clear);
    obj.on("pointercancel", clear);
  }
}