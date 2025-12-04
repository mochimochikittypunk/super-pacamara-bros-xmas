import Phaser from "phaser";

type ClearSceneData = {
    beans: number;
    totalBeans: number;
};

export class ClearSceneSimple extends Phaser.Scene {
    private beans = 0;
    private totalBeans = 0;
    private clearBgm?: Phaser.Sound.BaseSound;

    constructor() {
        super("ClearSceneSimple");
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

        // タイトル
        this.add
            .text(width / 2, 80, "STAGE CLEAR!", {
                fontSize: "40px",
                color: "#facc15"
            })
            .setOrigin(0.5);

        // 豆リザルト
        this.add
            .text(width / 2, 160, `Beans: ${this.beans} / ${this.totalBeans}`, {
                fontSize: "24px",
                color: "#e5e7eb"
            })
            .setOrigin(0.5);

        // メッセージ
        this.add
            .text(
                width / 2,
                height / 2 - 20,
                "新しいステージを毎日更新！\n応援してね◎",
                {
                    fontSize: "20px",
                    color: "#f9fafb",
                    align: "center",
                    lineSpacing: 10
                }
            )
            .setOrigin(0.5);

        // リプレイボタン
        const retryBtn = this.add
            .rectangle(width / 2 - 100, height - 80, 160, 50, 0x22c55e)
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
            .rectangle(width / 2 + 100, height - 80, 160, 50, 0x4b5563)
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
    }
}
