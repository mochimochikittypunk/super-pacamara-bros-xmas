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
  public downPressed = false; // 新しい操作: 下ボタン

  // スライド操作用の状態管理
  private movePointerId: number | null = null;
  private moveStartX = 0;
  // ジャンプ操作用の状態管理（追加）
  private jumpPointerId: number | null = null;
  // 下ボタン操作用
  private downPointerId: number | null = null;

  private config: { enableDown?: boolean } = {};

  constructor(scene: Phaser.Scene, config?: { enableDown?: boolean }) {
    this.scene = scene;
    this.config = config || {};
  }

  create() {
    // PC (デスクトップ) の場合は表示しない
    if (this.scene.sys.game.device.os.desktop) {
      return;
    }

    // ★ マルチタッチを有効化（デフォルトは2本指までかもしれないので増やす）
    this.scene.input.addPointer(3);

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

    // 下ボタンガイド (有効な場合のみ)
    if (this.config.enableDown) {
      // Jボタン(width - padding)の左隣
      // padding = 60, radius = 40. J center ~ width-60.
      // Left of J = width - 60 - 40 - 20 - 40 = width - 160 (approx)
      const downX = width - padding - 100; // 少し離す
      this.scene.add.circle(downX, height - padding, buttonRadius, 0x3b82f6, alpha) // 青色
        .setScrollFactor(0).setDepth(100);
      this.scene.add.text(downX, height - padding, "↓", { fontSize: "40px", color: "#ffffff" })
        .setScrollFactor(0).setDepth(101).setOrigin(0.5);
    }


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

    // 3. 下ボタンエリア (有効な場合のみ、Jumpより手前)
    let downZone: Phaser.GameObjects.Zone | null = null;
    if (this.config.enableDown) {
      const downX = width - padding - 100;
      // 半径40だが、判定は少し広めに (80x80 -> 100x100)
      downZone = this.scene.add.zone(downX, height - padding, 100, 100)
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(210) // JumpZoneより手前
        .setInteractive();
    }

    // --- イベント処理 ---

    // 移動ロジック
    moveZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // 既に移動操作中の指がある場合は無視（あるいは上書き）
      if (this.movePointerId === null) {
        this.movePointerId = pointer.id;
        this.updateMoveDirection(pointer.x);
      }
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
    jumpZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // 既にジャンプ操作中の指がある場合は無視
      if (this.jumpPointerId === null) {
        this.jumpPointerId = pointer.id;
        this.jumpPressed = true;
      }
    });

    const resetJump = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.jumpPointerId) {
        this.jumpPointerId = null;
        this.jumpPressed = false;
      }
    };

    jumpZone.on("pointerup", resetJump);
    jumpZone.on("pointerout", resetJump);
    jumpZone.on("pointercancel", resetJump);

    // 下ボタンロジック
    if (downZone && this.config.enableDown) {
      downZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (this.downPointerId === null) {
          this.downPointerId = pointer.id;
          this.downPressed = true;
        }
      });

      const resetDown = (pointer: Phaser.Input.Pointer) => {
        if (pointer.id === this.downPointerId) {
          this.downPointerId = null;
          this.downPressed = false;
        }
      };

      downZone.on("pointerup", resetDown);
      downZone.on("pointerout", resetDown);
      downZone.on("pointercancel", resetDown);
    }
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