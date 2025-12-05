import Phaser from "phaser";

type GameSceneData = {
    lives: number;
    hp: number;
    beans: number;
};

export class LoadingScene extends Phaser.Scene {
    private gameData!: GameSceneData;

    constructor() {
        super("LoadingScene");
    }

    init(data: GameSceneData) {
        this.gameData = data;
    }

    preload() {
        this.load.image("enemyGreen", "/assets/enemy_green.png");
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor("#ffffff");

        // 緑の敵を中央に配置
        const enemy = this.add.sprite(width / 2, height / 2, "enemyGreen");
        // setScaleだと元画像サイズ次第で巨大になるため、明示的にサイズ指定
        // ゲーム内では64x64なので、その2倍の128x128くらいにする
        enemy.setDisplaySize(128, 128);

        // ピョンピョン跳ねるアニメーション
        this.tweens.add({
            targets: enemy,
            y: height / 2 - 50,
            yoyo: true,
            repeat: -1,
            duration: 300,
            ease: "Sine.easeInOut"
        });

        // 吹き出しテキスト
        // 吹き出しの背景（適当な図形）
        const bubbleX = width / 2;
        const bubbleY = height / 2 - 120;

        // 楕円で吹き出しっぽく
        const bubble = this.add.ellipse(bubbleX, bubbleY, 300, 60, 0x000000);
        this.add.triangle(bubbleX, bubbleY + 40, bubbleX - 10, bubbleY + 20, bubbleX + 10, bubbleY + 20, 0x000000);

        const text = this.add.text(bubbleX, bubbleY, "Loading New Stage...", {
            fontSize: "24px",
            color: "#ffffff",
            fontFamily: "Pixelify Sans, sans-serif"
        }).setOrigin(0.5);

        // 2.0秒後にGameScene4へ遷移
        this.time.delayedCall(2000, () => {
            this.scene.start("GameScene4", this.gameData);
        });
    }
}
