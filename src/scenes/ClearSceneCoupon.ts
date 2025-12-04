import Phaser from "phaser";

type ClearSceneData = {
  beans: number;
  totalBeans: number;
};

const COUPON_CODE = "2511payid";
const PRODUCT_URL = "https://salvador.supersale.jp/items/125483031";

export class ClearSceneCoupon extends Phaser.Scene {
  private beans = 0;
  private totalBeans = 0;

  private copyMessage?: Phaser.GameObjects.Text;

  private clearBgm?: Phaser.Sound.BaseSound;

  constructor() {
    super("ClearSceneCoupon");
  }

  init(data: ClearSceneData) {
    this.beans = data.beans ?? 0;
    this.totalBeans = data.totalBeans ?? 20;
  }

  preload() {
    // クリア画面用BGMを読み込む
    this.load.audio("bgmClear", "/assets/bgm_clear.mp3");
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#0f172a");

    // ★ クリアBGMを再生（1回きり・ループなし）
    this.clearBgm = this.sound.add("bgmClear", {
      volume: 0.8,
      loop: false
    });
    this.clearBgm.play();

    this.add
      .text(width / 2, 60, "STAGE CLEAR!", {
        fontSize: "32px",
        color: "#facc15"
      })
      .setOrigin(0.5);

    // タイトル
    this.add
      .text(width / 2, 60, "STAGE CLEAR!", {
        fontSize: "32px",
        color: "#facc15"
      })
      .setOrigin(0.5);

    // 豆リザルト
    this.add
      .text(width / 2, 110, `Beans: ${this.beans} / ${this.totalBeans}`, {
        fontSize: "20px",
        color: "#e5e7eb"
      })
      .setOrigin(0.5);

    // クーポンパネル
    const panel = this.add
      .rectangle(width / 2, height / 2, width * 0.85, 260, 0x1f2937, 0.9)
      .setStrokeStyle(2, 0x4b5563);

    this.add
      .text(
        panel.x,
        panel.y - 90,
        "クリアおめでとう！Xmas BOXのクーポンをゲットだ！",
        {
          fontSize: "18px",
          color: "#f9fafb",
          wordWrap: { width: width * 0.75 }
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        panel.x,
        panel.y - 50,
        "リンク先の商品ページで、このコードを入力すると割引が適用されます。(PayIDアプリのみ)",
        {
          fontSize: "14px",
          color: "#e5e7eb",
          wordWrap: { width: width * 0.75 }
        }
      )
      .setOrigin(0.5);

    this.add
      .text(panel.x, panel.y - 20, "15%OFF（上限1000円）", {
        fontSize: "16px",
        color: "#fbbf24"
      })
      .setOrigin(0.5);

    // クーポンコード枠
    const codeBgWidth = Math.min(260, width * 0.6);
    const codeBgHeight = 44;

    const codeBg = this.add
      .rectangle(panel.x - 70, panel.y + 20, codeBgWidth, codeBgHeight, 0x111827)
      .setStrokeStyle(1, 0x4b5563)
      .setOrigin(0.5);

    this.add
      .text(codeBg.x, codeBg.y, COUPON_CODE, {
        fontSize: "18px",
        color: "#e5e7eb"
      })
      .setOrigin(0.5);

    // コピー ボタン（少し大きめ）
    const copyBtn = this.add
      .rectangle(panel.x + codeBgWidth / 2 + 40, panel.y + 20, 110, 44, 0x22c55e)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(copyBtn.x, copyBtn.y, "コピー", {
        fontSize: "18px",
        color: "#022c22"
      })
      .setOrigin(0.5);

    copyBtn.on("pointerdown", () => {
      this.copyCoupon();
    });

    // コピー結果メッセージ
    this.copyMessage = this.add
      .text(panel.x, panel.y + 60, "", {
        fontSize: "14px",
        color: "#34d399",
        wordWrap: { width: width * 0.75 }
      })
      .setOrigin(0.5);

    // 商品リンクボタン（幅広＆背が高めでタップしやすく）
    const linkBtn = this.add
      .rectangle(panel.x, panel.y + 120, panel.width * 0.85, 52, 0x3b82f6)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(linkBtn.x, linkBtn.y, "大抽選！クリスマスBOX！2025！はコチラ", {
        fontSize: "16px",
        color: "#eff6ff",
        wordWrap: { width: panel.width * 0.8 }
      })
      .setOrigin(0.5);

    linkBtn.on("pointerdown", () => {
      this.openProductPage();
    });

    // リトライボタン
    const retryBtn = this.add
      .rectangle(width / 2 - 120, height - 60, 150, 44, 0x22c55e)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(retryBtn.x, retryBtn.y, "もう一度遊ぶ", {
        fontSize: "16px",
        color: "#022c22"
      })
      .setOrigin(0.5);

    retryBtn.on("pointerdown", () => {
      this.clearBgm?.stop();
      this.scene.start("GameScene", {
        lives: 3,
        hp: 2,
        beans: 0
      });
    });

    // タイトルへボタン
    const titleBtn = this.add
      .rectangle(width / 2 + 120, height - 60, 150, 44, 0x4b5563)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(titleBtn.x, titleBtn.y, "タイトルへ", {
        fontSize: "16px",
        color: "#e5e7eb"
      })
      .setOrigin(0.5);

    titleBtn.on("pointerdown", () => {
      this.clearBgm?.stop();
      this.scene.start("TitleScene");
    });
  }

  // ★ モバイル対応版：コピー処理
  private async copyCoupon() {
    try {
      // 1. モダンな Clipboard API（HTTPS & 対応ブラウザ）
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(COUPON_CODE);
        this.copyMessage?.setText("コピー成功！");
        return;
      }

      // 2. フォールバック：textarea + execCommand("copy")
      const temp = document.createElement("textarea");
      temp.value = COUPON_CODE;
      temp.style.position = "fixed";
      temp.style.left = "-9999px";
      temp.style.top = "0";
      document.body.appendChild(temp);

      temp.focus();
      temp.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(temp);

      if (successful) {
        this.copyMessage?.setText("コピー成功！");
      } else {
        throw new Error("execCommand failed");
      }
    } catch (e) {
      console.error(e);
      this.copyMessage?.setText(
        `コピーに失敗しました。\nがんばってコードを暗記してください： ${COUPON_CODE}`
      );
    }
  }

  // ★ モバイル対応版：商品ページを開く処理
  private openProductPage() {
    try {
      // 新しいタブで開く（PC / 一部モバイル）
      const win = window.open(PRODUCT_URL, "_blank", "noopener,noreferrer");

      // ポップアップブロックなどで失敗した場合は、同一タブで遷移
      if (!win) {
        window.location.href = PRODUCT_URL;
      }
    } catch (e) {
      console.error(e);
      // 最悪の場合でも同一タブで遷移を試みる
      window.location.href = PRODUCT_URL;
    }
  }
}