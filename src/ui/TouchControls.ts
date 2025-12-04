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
    // PC では pointer: fine なので、CSS側で #touch-ui は非表示。
    const container = document.getElementById("touch-ui");
    if (!container) {
      // 見つからない場合は何もしない（PCなど）
      return;
    }

    const leftBtn = document.getElementById("btn-left");
    const rightBtn = document.getElementById("btn-right");
    const jumpBtn = document.getElementById("btn-jump");

    const attachButton = (
      el: HTMLElement | null,
      onDown: () => void,
      onUp: () => void
    ) => {
      if (!el) return;

      // pointer イベント（モバイル・PC両対応）
      el.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        onDown();
      });

      const clear = (ev: Event) => {
        ev.preventDefault();
        onUp();
      };

      el.addEventListener("pointerup", clear);
      el.addEventListener("pointerleave", clear);
      el.addEventListener("pointercancel", clear);
      el.addEventListener("pointerout", clear);
    };

    attachButton(
      leftBtn,
      () => {
        this.leftPressed = true;
      },
      () => {
        this.leftPressed = false;
      }
    );

    attachButton(
      rightBtn,
      () => {
        this.rightPressed = true;
      },
      () => {
        this.rightPressed = false;
      }
    );

    attachButton(
      jumpBtn,
      () => {
        this.jumpPressed = true;
      },
      () => {
        this.jumpPressed = false;
      }
    );
  }
}