import Phaser from "phaser";

type ClearSceneData = {
    beans: number;
    totalBeans: number;
    nextStage?: string | null;
};

export class ClearSceneSimple extends Phaser.Scene {
    private beans = 0;
    private totalBeans = 0;
    private nextStage: string | null = null;
    private clearBgm?: Phaser.Sound.BaseSound;

    constructor() {
        super("ClearSceneSimple");
    }

    init(data: ClearSceneData) {
        this.beans = data.beans ?? 0;
        this.totalBeans = data.totalBeans ?? 20;
        this.nextStage = data.nextStage ?? null;
    }

    preload() {
        // クリア画面用BGMを読み込む
        this.load.audio("bgmClear", "/assets/bgm_clear.mp3");
        // サンタ画像（演出用）
        this.load.image("santa", "/assets/santa.png");
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

        // タイトル
        this.add
            .text(width / 2, 60, "STAGE CLEAR!", {
                fontSize: "40px",
                color: "#facc15"
            })
            .setOrigin(0.5);

        // 豆リザルト
        this.add
            .text(width / 2, 120, `Beans: ${this.beans} / ${this.totalBeans}`, {
                fontSize: "24px",
                color: "#e5e7eb"
            })
            .setOrigin(0.5);

        // メッセージ
        this.add
            .text(
                width / 2,
                height / 2 - 40,
                "新しいステージを毎日更新！\n応援してね◎",
                {
                    fontSize: "20px",
                    color: "#f9fafb",
                    align: "center",
                    lineSpacing: 10
                }
            )
            .setOrigin(0.5);

        // --- 商品プロモーション ---
        const promoY = height / 2 + 40;

        this.add.text(width / 2, promoY, "クリスマスブレンド PRESS IT PRESS 2025", {
            fontSize: "18px",
            color: "#fbbf24"
        }).setOrigin(0.5);

        this.add.text(width / 2, promoY + 25, "好評発売中！", {
            fontSize: "16px",
            color: "#ffffff"
        }).setOrigin(0.5);

        // 商品リンクボタン
        const linkBtn = this.add.rectangle(width / 2, promoY + 65, 240, 44, 0xef4444)
            .setInteractive({ useHandCursor: true });

        this.add.text(linkBtn.x, linkBtn.y, "商品ページはこちら！", {
            fontSize: "18px",
            color: "#ffffff"
        }).setOrigin(0.5);

        linkBtn.on("pointerdown", () => {
            const url = "https://salvador.supersale.jp/items/127238779";

            // 1. ポップアップブロック対策：クリックイベント内で先にウィンドウを開く
            const newWindow = window.open("", "_blank");

            // 2. 演出開始（完了後にURL遷移）
            this.playSantaAnimation(width, height, () => {
                if (newWindow) {
                    newWindow.location.href = url;
                } else {
                    // 万が一ウィンドウが開けなかった場合はリダイレクト
                    window.location.href = url;
                }
            });
        });


        // リプレイボタン
        const retryBtn = this.add
            .rectangle(width / 2 - 100, height - 60, 160, 50, 0x22c55e)
            .setInteractive({ useHandCursor: true });
        this.add
            .text(retryBtn.x, retryBtn.y, "もう一度遊ぶ", {
                fontSize: "18px",
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
            .rectangle(width / 2 + 100, height - 60, 160, 50, 0x4b5563)
            .setInteractive({ useHandCursor: true });
        this.add
            .text(titleBtn.x, titleBtn.y, "タイトルへ", {
                fontSize: "18px",
                color: "#e5e7eb"
            })
            .setOrigin(0.5);

        titleBtn.on("pointerdown", () => {
            this.clearBgm?.stop();
            this.scene.start("TitleScene");
        });

        // Next Stage Button (Only if nextStage is set)

        if (this.nextStage) {
            const nextBtn = this.add
                .rectangle(width / 2, height - 120, 200, 50, 0xfacc15)
                .setInteractive({ useHandCursor: true });

            this.add.text(nextBtn.x, nextBtn.y, "次のステージへ", {
                fontSize: "20px",
                color: "#1e293b",
                fontStyle: "bold"
            }).setOrigin(0.5);

            nextBtn.on("pointerdown", () => {
                this.clearBgm?.stop();
                if (this.nextStage) {
                    this.scene.start(this.nextStage, {
                        lives: 3, hp: 2, beans: 0 // Reset or carry over? Usually reset for new stage
                    });
                }
            });
        }
    }

    // サンタ演出
    private playSantaAnimation(width: number, height: number, onComplete?: () => void) {
        // 既にサンタがいたら何もしない（連打防止）
        if (this.children.getByName("santaActor")) return;

        // サンタ作成（画面左外）
        const santa = this.add.image(-50, height - 100, "santa")
            .setName("santaActor")
            .setScale(1.5); // 少し大きめに

        // 1. 歩いてくる
        this.tweens.add({
            targets: santa,
            x: width / 2,
            duration: 1000,
            ease: "Power1",
            onComplete: () => {
                // 2. ジャンプ
                this.tweens.add({
                    targets: santa,
                    y: height - 200,
                    duration: 300,
                    yoyo: true,
                    ease: "Quad.easeOut",
                    onComplete: () => {
                        // 吹き出し表示
                        const bubble = this.add.text(santa.x, santa.y - 60, "Thank you♡", {
                            fontSize: "24px",
                            color: "#ff0000",
                            backgroundColor: "#ffffff",
                            padding: { x: 10, y: 5 }
                        }).setOrigin(0.5);

                        // 0.5秒待ってからコールバック実行（リンク遷移）
                        this.time.delayedCall(500, () => {
                            if (onComplete) onComplete();
                        });

                        // 少し待ってから消える
                        this.time.delayedCall(2000, () => {
                            santa.destroy();
                            bubble.destroy();
                        });
                    }
                });
            }
        });
    }
}
