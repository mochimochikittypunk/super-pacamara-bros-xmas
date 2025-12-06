import Phaser from "phaser";
import { TouchControls } from "../ui/TouchControls";

type GameSceneData = {
    lives: number;
    hp: number;
    beans: number;
};

export class GameScene4 extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private spaceKey!: Phaser.Input.Keyboard.Key;

    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private enemiesSlow!: Phaser.Physics.Arcade.Group;
    private enemiesGreen!: Phaser.Physics.Arcade.Group; // enemy_green用グループ
    private spikes!: Phaser.Physics.Arcade.StaticGroup;
    private beans!: Phaser.Physics.Arcade.Group;
    private goal!: Phaser.Physics.Arcade.Sprite;

    private questionBox!: Phaser.Physics.Arcade.Sprite;
    // Key related vars removed

    private touchControls!: TouchControls;

    private bgm?: Phaser.Sound.BaseSound;

    private lives = 3;
    private hp = 2;
    private beansCollected = 0;
    private totalBeans = 20;

    private hpText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private beansText!: Phaser.GameObjects.Text;
    private messageText!: Phaser.GameObjects.Text; // ガイドメッセージ用

    private isOnGround = false;
    private jumpCount = 0;
    private maxJumpCount = 2;
    private prevJumpPressed = false;

    private isInvincible = false;

    private levelWidth = 4800;

    constructor() {
        super("GameScene4");
    }

    init(data: GameSceneData) {
        this.lives = data.lives ?? 3;
        this.hp = data.hp ?? 2;
        this.beansCollected = data.beans ?? 0;
        this.beansCollected = data.beans ?? 0;
        // hasKey, isKeySpawned removed
    }

    preload() {
        // プレイヤー
        this.load.image("player", "/assets/santa.png");

        // ★ ステージ4用アセット (2を使用)
        this.load.image("ground2", "/assets/ground2.png");
        this.load.image("platform2", "/assets/platform2.png");
        this.load.image("cloud", "/assets/cloud.png"); // ★ 雲画像
        this.load.image("mountain", "/assets/snow_mountain.png"); // ★ 山画像（雪山）

        // 共通アセット
        this.load.image("spike", "/assets/spike.png");
        this.load.image("bean", "/assets/coffee_bean.png");
        this.load.image("tree", "/assets/tree.png");

        // 敵
        this.load.image("enemySlow", "/assets/enemy_slow.png");
        this.load.image("enemyGreen", "/assets/enemy_green.png");

        // ★ ギミック
        this.load.image("questionBox", "/assets/question_box.png");
        // key removed
        this.load.image("castle", "/assets/castle.png"); // 城
        this.load.image("empty", "/assets/Platform.png"); // 透明用ダミー（なければ適当な画像で代用可、今回は使わずsetAlpha(0)でもOK）
        // BGM
        this.load.audio("bgmMain", "/assets/bgm_main.mp3");
    }

    create() {
        const { height, width } = this.scale;

        // ワールド全体の物理範囲
        this.physics.world.setBounds(0, 0, this.levelWidth, height);

        // ★ 背景色：曇り空
        this.cameras.main.setBackgroundColor("#5b6b7c");

        // ▼ 背景（雲多め）
        const bgObjects: Phaser.GameObjects.GameObject[] = [];

        // ★ 山（画像を使用・疎らに配置）
        for (let x = 200; x < this.levelWidth; x += Phaser.Math.Between(800, 1200)) {
            const mountain = this.add.image(x, height - 10, "mountain") // height - 20 -> height - 10
                .setOrigin(0.5, 1)
                .setScale(0.2)
                .setScrollFactor(0.15)
                .setDepth(-20);

            bgObjects.push(mountain);
        }

        // 雲（画像を使用）
        const cloudCount = Phaser.Math.Between(5, 8);
        for (let i = 0; i < cloudCount; i++) {
            const cx = Phaser.Math.Between(0, this.levelWidth);
            const cy = Phaser.Math.Between(50, 200);
            // 元画像が大きい(1024x1024)ので、縮小して使う
            const scale = Phaser.Math.FloatBetween(0.1, 0.15); // 0.1(100px) ~ 0.3(300px) くらい
            const cloud = this.add.image(cx, cy, "cloud").setScrollFactor(Phaser.Math.FloatBetween(0.1, 0.3));
            cloud.setScale(scale);
            cloud.setAlpha(0.8);
            bgObjects.push(cloud);
        }

        // ぜんぶ「一番うしろ」に送る
        bgObjects.forEach((obj) => (obj as Phaser.GameObjects.Image).setDepth(-10));

        // ▼ 足場グループ（静的）
        this.platforms = this.physics.add.staticGroup();

        // ★ 地面：ground2.png
        for (let x = 0; x < this.levelWidth; x += 64) {
            // 穴あきエリア
            if ((x > 1200 && x < 1400) || (x > 2400 && x < 2600) || (x > 3600 && x < 3800)) {
                continue;
            }

            const groundBlock = this.platforms.create(
                x + 32,
                height - 16,
                "ground2"
            ) as Phaser.Physics.Arcade.Sprite;

            groundBlock.setDisplaySize(64, 32);
            groundBlock.refreshBody();
        }

        // ★ 浮いている足場：platform2.png
        // ステージ3に近い難易度レイアウト
        const platformData = [
            { x: 300, y: height - 120 },
            { x: 500, y: height - 180 },
            { x: 700, y: height - 120 },
            { x: 900, y: height - 200 },
            // 穴のあたり
            { x: 1300, y: height - 150 },
            { x: 1500, y: height - 220 }, // ここにBOXを置くかも？
            // { x: 1700, y: height - 150 }, // ← ここをハテナブロックにするので削除
            // 中盤
            { x: 2100, y: height - 180 },
            { x: 2300, y: height - 240 },
            { x: 2500, y: height - 160 }, // 穴上
            // 後半
            { x: 3000, y: height - 200 },
            { x: 3200, y: height - 140 },
            { x: 3400, y: height - 200 },
            { x: 3700, y: height - 160 }, // 穴上
            { x: 4000, y: height - 120 },
            { x: 4200, y: height - 180 },
            { x: 4400, y: height - 120 }
        ];

        platformData.forEach((p) => {
            const plat = this.platforms.create(
                p.x,
                p.y,
                "platform2"
            ) as Phaser.Physics.Arcade.Sprite;
            plat.setDisplaySize(64, 16);
            plat.refreshBody();
        });

        // ▼ ギミック：ハテナブロック
        // 足場の代わりとして安全な場所に配置
        const boxX = 1700;
        const boxY = height - 150;

        // 足場として機能させる
        this.questionBox = this.physics.add.staticSprite(boxX, boxY, "questionBox");
        this.questionBox.setDisplaySize(48, 48); // 少し大きめ
        this.questionBox.refreshBody();

        // ▼ 鍵（最初は非表示） -> 削除、FakeBoxは無限なので特別な初期化不要
        this.questionBox.setDisplaySize(48, 48); // 少し大きめ
        this.questionBox.refreshBody();
        // this.questionBox.setData("isOpened", false); // 無限なのでフラグ不要

        // ▼ プレイヤー
        this.player = this.physics.add
            .sprite(100, height - 150, "player")
            .setCollideWorldBounds(true);
        (this.player.body as Phaser.Physics.Arcade.Body).setSize(32, 64);

        // ▼ 敵グループ
        this.enemiesSlow = this.physics.add.group();
        this.enemiesGreen = this.physics.add.group();

        // 敵配置
        // enemy_slow: 高くジャンプ
        this.createEnemy(this.enemiesSlow, 600, height - 64, 40, "enemySlow");
        this.createEnemy(this.enemiesSlow, 1600, height - 64, 40, "enemySlow");
        this.createEnemy(this.enemiesSlow, 2800, height - 64, 40, "enemySlow");
        this.createEnemy(this.enemiesSlow, 4100, height - 64, 40, "enemySlow");

        // enemy_green: 左右移動距離が長い
        this.createEnemy(this.enemiesGreen, 1000, height - 64, 80, "enemyGreen", 250); // range 250
        this.createEnemy(this.enemiesGreen, 2000, height - 64, 80, "enemyGreen", 300);
        this.createEnemy(this.enemiesGreen, 3200, height - 64, 80, "enemyGreen", 250);
        this.createEnemy(this.enemiesGreen, 3900, height - 64, 80, "enemyGreen", 200);


        // ▼ トゲ
        this.spikes = this.physics.add.staticGroup();
        // 適当に配置
        const spikeXPositions = [800, 1800, 2900, 4300];
        spikeXPositions.forEach(x => {
            const spike = this.spikes.create(x, height - 28, "spike") as Phaser.Physics.Arcade.Sprite;
            spike.setOrigin(0.5, 1);
            spike.setDisplaySize(32, 32);
            spike.refreshBody();
        });

        // ▼ 豆
        this.beans = this.physics.add.group({ allowGravity: false, immovable: true });
        this.spawnBeans(height);

        this.goal = this.physics.add
            .sprite(this.levelWidth - 100, height - 120, "tree")
            .setImmovable(true);
        this.goal.setDisplaySize(80, 200);
        (this.goal.body as Phaser.Physics.Arcade.Body).allowGravity = false;

        // ゴール判定用の領域を少し手前に広げる（お城の入り口付近で反応させる）
        // x座標判定ではなくoverlapを使う形式に変更するため、collider設定を確認

        // ▼ 衝突判定
        this.physics.add.collider(this.player, this.platforms, () => {
            this.isOnGround = true;
            this.jumpCount = 0;
        });
        this.physics.add.collider(this.enemiesSlow, this.platforms);
        this.physics.add.collider(this.enemiesGreen, this.platforms);
        this.physics.add.overlap(this.player, this.goal, this.handleGoal, undefined, this);

        // ハテナブロックとの衝突（下から叩く判定）
        this.physics.add.collider(this.player, this.questionBox, this.handleBoxHit, undefined, this);

        // 鍵とのオーバーラップ削除

        this.physics.add.collider(this.player, this.enemiesSlow, this.handlePlayerEnemyCollision, undefined, this);
        this.physics.add.collider(this.player, this.enemiesGreen, this.handlePlayerEnemyCollision, undefined, this);
        this.physics.add.collider(this.player, this.spikes, () => this.takeDamage(true), undefined, this);
        this.physics.add.overlap(this.player, this.beans, this.collectBean, undefined, this);

        // カメラ
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, this.levelWidth, height);

        // 入力
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.touchControls = new TouchControls(this);
        this.touchControls.create();

        // UI
        this.createHUD();

        // 鍵UI削除

        // BGM
        this.bgm = this.sound.add("bgmMain", { volume: 0.5, loop: true });
        this.bgm.play();
    }

    // クリア演出中フラグ削除


    private spawnBeans(height: number) {
        for (let i = 0; i < 20; i++) {
            const x = 300 + i * 200;
            if (x > 2200 && x < 2400) continue; // BOX付近は除外
            const y = height - 150 - (i % 3) * 40;
            const bean = this.beans.create(x, y, "bean");
            bean.setDisplaySize(24, 24);
            bean.setCircle(10);
        }
    }

    private createEnemy(group: Phaser.Physics.Arcade.Group, x: number, y: number, speed: number, texture: string, patrolRange: number = 80) {
        const enemy = group.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
        enemy.setCollideWorldBounds(false);
        enemy.setBounce(0, 0);
        enemy.setDisplaySize(64, 64);
        (enemy.body as Phaser.Physics.Arcade.Body).setSize(64, 64);

        // データ設定
        enemy.setData("startX", x);
        enemy.setData("speed", speed);
        enemy.setData("patrolRange", patrolRange);

        const dir = Math.random() < 0.5 ? -1 : 1;
        enemy.setVelocityX(speed * dir);

        // enemy_slowはジャンプする
        if (texture === "enemySlow") {
            (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
            enemy.setData("canJump", true);
            enemy.setData("nextJumpTime", this.time.now + 2000); // 2秒ごとにジャンプ
        } else {
            (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        }
    }

    private createHUD() {
        const { width } = this.scale;
        this.livesText = this.add.text(16, 16, `Lives: ${this.lives}`, { fontSize: "18px", color: "#f9fafb" }).setScrollFactor(0);
        this.hpText = this.add.text(16, 40, `HP: ${this.hp}`, { fontSize: "18px", color: "#f97316" }).setScrollFactor(0);
        this.beansText = this.add.text(width - 16, 16, `${this.beansCollected} / 10 pc`, { fontSize: "18px", color: "#e5e7eb" }).setOrigin(1, 0).setScrollFactor(0);

        this.messageText = this.add.text(width / 2, 80, "", {
            fontSize: "24px",
            color: "#ffffff",
            backgroundColor: "#00000080",
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setScrollFactor(0).setVisible(false);
    }

    update() {
        const height = this.scale.height;
        if (this.player.y > height + 50) this.takeDamage(true);

        this.updateEnemies();

        // 入力
        const moveLeft = this.cursors.left?.isDown || this.touchControls.leftPressed;
        const moveRight = this.cursors.right?.isDown || this.touchControls.rightPressed;
        const speed = 200;

        if (moveLeft && !moveRight) this.player.setVelocityX(-speed);
        else if (moveRight && !moveLeft) this.player.setVelocityX(speed);
        else this.player.setVelocityX(0);

        const jumpInput = this.spaceKey.isDown || this.cursors.up?.isDown || this.touchControls.jumpPressed;
        if (jumpInput && !this.prevJumpPressed) this.handleJump();
        this.prevJumpPressed = jumpInput;

        this.isOnGround = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down;
        if (this.isOnGround && (this.player.body as Phaser.Physics.Arcade.Body).velocity.y >= 0) this.jumpCount = 0;

        this.hpText.setText(`HP: ${this.hp}`);
        this.beansText.setText(`${this.beansCollected} / 10 pc`);
    }

    private handleJump() {
        if (this.isOnGround || this.jumpCount < this.maxJumpCount) {
            this.player.setVelocityY(-420);
            this.jumpCount++;
            this.isOnGround = false;
        }
    }

    private updateEnemies() {
        // Green (Wide Patrol)
        this.enemiesGreen.getChildren().forEach(obj => {
            const enemy = obj as Phaser.Physics.Arcade.Sprite;
            const startX = enemy.getData("startX") as number;
            const speed = enemy.getData("speed") as number;
            const range = enemy.getData("patrolRange") as number;

            if (enemy.x < startX - range) enemy.setVelocityX(speed);
            else if (enemy.x > startX + range) enemy.setVelocityX(-speed);
        });

        // Slow (Jump)
        this.enemiesSlow.getChildren().forEach(obj => {
            const enemy = obj as Phaser.Physics.Arcade.Sprite;
            const startX = enemy.getData("startX") as number;
            const speed = enemy.getData("speed") as number;
            const range = 80;

            if (enemy.x < startX - range) enemy.setVelocityX(speed);
            else if (enemy.x > startX + range) enemy.setVelocityX(-speed);

            // Jump Logic
            if ((enemy.body as Phaser.Physics.Arcade.Body).blocked.down) {
                const nextJump = enemy.getData("nextJumpTime") as number;
                if (this.time.now > nextJump) {
                    enemy.setVelocityY(-600); // ステージ3より少し低めだが頻度高め
                    enemy.setData("nextJumpTime", this.time.now + 3000);
                }
            }
        });
    }

    // ハテナブロックを叩いた処理
    private handleBoxHit(player: any, box: any) {
        const pBody = player.body as Phaser.Physics.Arcade.Body;
        const bBody = box.body as Phaser.Physics.Arcade.Body;

        // プレイヤーが下から衝突した場合
        // ニセモノBOX（無限）
        if (pBody.touching.up && bBody.touching.down) {
            this.spawnBeanFromBox(box);
        }
    }

    private spawnBeanFromBox(box: Phaser.Physics.Arcade.Sprite) {
        // isOpenedチェックなし（無限）

        // ブロックが跳ねる演出
        this.tweens.add({
            targets: box,
            y: box.y - 10,
            yoyo: true,
            duration: 100
        });

        // 豆が出現
        const bean = this.beans.create(box.x, box.y - 48, "bean");
        bean.setDisplaySize(24, 24);
        bean.setCircle(10);
        bean.setVelocityY(-200); // シンプルな飛び出し
        (bean.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        bean.setBounce(0.5);
        bean.setCollideWorldBounds(true);
        this.physics.add.collider(bean, this.platforms);

        this.showMessage("パカマラ！");
    }

    // spawnKey, collectKey removed

    private showMessage(text: string) {
        this.messageText.setText(text);
        this.messageText.setVisible(true);
        this.time.delayedCall(2000, () => this.messageText.setVisible(false));
    }

    private handlePlayerEnemyCollision(player: any, enemy: any) {
        if (this.isInvincible) return;
        const pBody = player.body as Phaser.Physics.Arcade.Body;
        const eBody = enemy.body as Phaser.Physics.Arcade.Body;

        if (pBody.velocity.y > 0 && pBody.y < eBody.y - 40) {
            // 踏んだ
            enemy.destroy();
            player.setVelocityY(-300);
        } else {
            this.takeDamage(false, enemy);
        }
    }

    private takeDamage(fall: boolean, enemy?: any) {
        if (this.isInvincible) return;
        this.hp--;
        if (this.hp > 0 && !fall) {
            this.startInvincible();
            // ノックバック
            const dir = this.player.x < (enemy?.x ?? 0) ? -1 : 1;
            this.player.setVelocityX(-200 * dir);
            return;
        }

        this.lives--;
        this.bgm?.stop();
        if (this.lives > 0) this.scene.restart({ lives: this.lives, hp: 2, beans: this.beansCollected });
        else this.scene.start("GameOverScene");
    }

    private startInvincible() {
        this.isInvincible = true;
        this.tweens.add({
            targets: this.player,
            alpha: 0.3,
            yoyo: true,
            repeat: 5,
            duration: 100,
            onComplete: () => {
                this.isInvincible = false;
                this.player.setAlpha(1);
            }
        });
    }

    private collectBean(player: any, bean: any) {
        bean.destroy();
        this.beansCollected++;
    }

    private handleGoal() {
        // 鍵チェック削除
        // if (!this.hasKey) { ... }

        this.bgm?.stop();
        // ステージクリア -> ステージ5へ
        this.scene.start("GameScene5");
    }
}
