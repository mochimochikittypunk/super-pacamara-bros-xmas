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

  // スライド操作用の状態管理
  private movePointerId: number | null = null;
  private moveStartX = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create() {
    // PC (デスクトップ) の場合は表示しない
    if (this.scene.sys.game.device.os.desktop) {
      return;
    }

    const { width, height } = this.scene.scale;

    // --- ガイド表示（見た目だけ） ---
    const buttonRadius = 40;
    const padding = 60;
    const color = 0xffffff;
    const alpha = 0.3;

    // 左ガイド
    this.scene.add.circle(padding, height - padding, buttonRadius, color, alpha)
      .setScrollFactor(0).setDepth(100);
    this.scene.add.text(padding, height - padding, "←", { fontSize: "40px", color: "#ffffff" })
      .setScrollFactor(0).setDepth(101).setOrigin(0.5);

    // 右ガイド
    this.scene.add.circle(padding + buttonRadius * 2 + 20, height - padding, buttonRadius, color, alpha)
      .setScrollFactor(0).setDepth(100);
    this.scene.add.text(padding + buttonRadius * 2 + 20, height - padding, "→", { fontSize: "40px", color: "#ffffff" })
      .setScrollFactor(0).setDepth(101).setOrigin(0.5);

    // ジャンプガイド
    this.scene.add.circle(width - padding, height - padding, buttonRadius, 0x22c55e, alpha)
      .setScrollFactor(0).setDepth(100);
    this.scene.add.text(width - padding, height - padding, "J", { fontSize: "40px", color: "#ffffff" })
      .setScrollFactor(0).setDepth(101).setOrigin(0.5);


    // --- 判定エリア（不可視） ---

    // 1. 移動エリア（画面左半分）
    const moveZone = this.scene.add.zone(0, 0, width / 2, height)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(200) // 最前面
      .setInteractive();

    // 2. ジャンプエリア（画面右半分）
    const jumpZone = this.scene.add.zone(width / 2, 0, width / 2, height)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive();

    // --- イベント処理 ---

    // 移動ロジック
    moveZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.movePointerId = pointer.id;
      this.updateMoveDirection(pointer.x);
    });

    moveZone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.movePointerId) {
        this.updateMoveDirection(pointer.x);
      }
    });

    const resetMove = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.movePointerId) {
        this.movePointerId = null;
        this.leftPressed = false;
        this.rightPressed = false;
      }
    };

    moveZone.on("pointerup", resetMove);
    moveZone.on("pointerout", resetMove); // ゾーンから出たらリセット
    moveZone.on("pointercancel", resetMove);


    // ジャンプロジック
    jumpZone.on("pointerdown", () => {
      this.jumpPressed = true;
    });

    const resetJump = () => {
      this.jumpPressed = false;
    };

    jumpZone.on("pointerup", resetJump);
    jumpZone.on("pointerout", resetJump);
    jumpZone.on("pointercancel", resetJump);
  }

  // X座標に基づいて移動方向を更新
  private updateMoveDirection(x: number) {
    // 画面左端から150pxあたりを境界線とする（ガイドボタンの間くらい）
    const threshold = 150;

    if (x < threshold) {
      this.leftPressed = true;
      this.rightPressed = false;
    } else {
      this.leftPressed = false;
      this.rightPressed = true;
    }
  }
}