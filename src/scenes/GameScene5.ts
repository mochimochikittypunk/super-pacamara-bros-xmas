import Phaser from "phaser";
import { TouchControls } from "../ui/TouchControls";

type GameSceneData = {
    lives: number;
    hp: number;
    beans: number;
};

export class GameScene5 extends Phaser.Scene {
    private player?: Phaser.Physics.Arcade.Sprite;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private platforms?: Phaser.Physics.Arcade.StaticGroup;
    private spikes?: Phaser.Physics.Arcade.StaticGroup;
    private bgObjects?: Phaser.GameObjects.Group; // 背景管理用

    private score = 0;
    private scoreText?: Phaser.GameObjects.Text;

    private lives = 3;
    private livesText?: Phaser.GameObjects.Text;
    private hp = 2; // HP制導入 (2=Big, 1=Small, 0=Dead)
    private hpText?: Phaser.GameObjects.Text;

    private isInvincible = false; // 無敵状態
    private isGameActive = true;

    // Locked Block removed
    // ★ Golden Bean vars
    private hasGoldBean = false;
    private goldBeanIcon?: Phaser.GameObjects.Image;

    // ステージ長とゴール
    private levelWidth = 4800; // 長めのステージ
    private goalX = 4700;

    constructor() {
        super("GameScene5");
    }
    private enemiesSlow!: Phaser.Physics.Arcade.Group;
    private enemiesGreen!: Phaser.Physics.Arcade.Group; // enemy_green用グループ
    private beans!: Phaser.Physics.Arcade.Group;
    private goal!: Phaser.Physics.Arcade.Sprite;

    private questionBoxes!: Phaser.Physics.Arcade.StaticGroup; // グループ化
    // Key item removed, isKeySpawned removed
    private goldBeanItem!: Phaser.Physics.Arcade.Sprite;
    private isGoldBeanSpawned = false;

    // Pipes
    private pipe1!: Phaser.Physics.Arcade.Sprite; // To Underground
    private pipe2!: Phaser.Physics.Arcade.Sprite; // From Underground

    private touchControls!: TouchControls;

    private bgm?: Phaser.Sound.BaseSound;

    private beansCollected = 0;
    private totalBeans = 20;

    private beansText?: Phaser.GameObjects.Text;
    private messageText?: Phaser.GameObjects.Text; // ガイドメッセージ用

    private isOnGround = false;
    private jumpCount = 0;
    private maxJumpCount = 2;
    private prevJumpPressed = false;

    // Input
    private spaceKey?: Phaser.Input.Keyboard.Key;

    private fromUnderground = false; // Flag to check warp return
    private visitedUnderground = false; // Flag to prevent re-entry

    init(data: GameSceneData & { fromUnderground?: boolean, visitedUnderground?: boolean, hasGoldBean?: boolean }) {
        this.lives = data.lives ?? 3;
        this.hp = data.hp ?? 2;
        this.beansCollected = data.beans ?? 0;
        this.fromUnderground = data.fromUnderground ?? false;
        this.visitedUnderground = data.visitedUnderground ?? (this.fromUnderground ? true : false);

        // Restore Gold Bean state
        // If passed in data, use it. Otherwise default to false.
        this.hasGoldBean = data.hasGoldBean ?? false;
        this.isGoldBeanSpawned = false;
    }

    preload() {
        // プレイヤー
        this.load.image("player", "/assets/santa.png");

        // ★ ステージ5用アセット
        this.load.image("ground2", "/assets/ground2.png");
        this.load.image("platform2", "/assets/platform2.png");
        this.load.image("block1", "/assets/block1.png"); // ★ 新しいブロック
        this.load.image("cloud", "/assets/cloud.png");
        this.load.image("mountain", "/assets/snow_mountain.png");

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
        this.load.image("goldBean", "/assets/gold_bean.png"); // 新しいアセット
        this.load.image("pipe", "/assets/pipe.png"); // 土管
        this.load.image("castle", "/assets/castle.png"); // 城       // BGM
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

        // ★ 山（画像を使用・疎らに配置） - 位置を上に修正
        for (let x = 200; x < this.levelWidth; x += Phaser.Math.Between(800, 1200)) {
            const mountain = this.add.image(x, height - 20, "mountain") // height - 64 -> height - 20 (埋める)
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
        this.spikes = this.physics.add.staticGroup(); // ここに移動

        // 地面ライン：ground2.png
        for (let x = 0; x < this.levelWidth; x += 64) {
            // 穴（落下ポイント + トゲ）を作る - 幅広に (1600-1850, 3200-3450)
            if ((x > 1600 && x < 1850) || (x > 3200 && x < 3450)) {
                // 穴の底にトゲを配置
                if (x % 32 === 0) { // 間隔を詰める
                    const s = this.spikes.create(x, height - 20, "spike");
                    s.setOrigin(0.5, 1);
                    s.setDisplaySize(32, 32);
                    s.refreshBody();
                }
                continue;
            }
            const g = this.platforms.create(x, height - 32, "ground2");
            g.setDisplaySize(64, 64); // サイズを固定して隙間をなくす
            g.refreshBody();
        }

        // ★ block1 を使った複雑な地形生成
        // 1. ピラミッド（階段）- 少し幅広に
        this.createPyramid(500, height - 64, 4);

        // 2. 空中ブロック群 - バラバラではなく連結させる
        // 長い足場を作る
        this.createSolidPlatform(1100, height - 200, 5); // 5個連結
        this.createSolidPlatform(1500, height - 250, 4);

        // 3. 穴の上の飛び石 (platform2ではなくblock1で構成)
        // 穴 (1600-1700) の上
        const b = this.platforms.create(1650, height - 200, "block1");
        b.setDisplaySize(32, 32);
        b.refreshBody();

        // 4. トンネルのような狭い通路 - 天井を繋げる
        for (let x = 2200; x < 2800; x += 32) {
            // 天井
            const c1 = this.platforms.create(x, height - 250, "block1");
            c1.setDisplaySize(32, 32);
            c1.refreshBody();

            const c2 = this.platforms.create(x, height - 282, "block1"); // 厚みを持たせる
            c2.setDisplaySize(32, 32);
            c2.refreshBody();

            // 下にもブロックを置いて狭くする（柱のように）
            if (x % 200 === 0) {
                this.createTower(x, height - 64, 2); // 低い柱
            }
        }

        // 5. 高層建築（ゴール前の難所） - 低くして連結
        // 壁のように立ちはだかるが、飛び越えられる高さ
        this.createTower(3600, height - 64, 4); // 高さ4 (128px)
        this.createTower(3632, height - 64, 5); // 少し高く
        this.createTower(3664, height - 64, 4);

        // 6. ゴール前の階段
        this.createPyramid(4200, height - 64, 5);

        // ▼ プレイヤー
        // Check spawn point
        let spawnX = 100;
        let spawnY = height - 150;
        if (this.fromUnderground) {
            // Spawn at Pipe 2 (x=2100)
            spawnX = 2100;
            spawnY = height - 200; // Above pipe
            this.fromUnderground = false; // Reset flag
        }

        this.player = this.physics.add
            .sprite(spawnX, spawnY, "player")
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


        // ▼ トゲ (createTerrainで生成しているのでここは空にするか、追加分があれば)
        // 地形のループ内で生成するように変更したので、ここでの個別生成は削除または調整
        // 下記は削除

        // 4. ハテナブロック（鍵入り、パワーアップ入り）
        this.questionBoxes = this.physics.add.staticGroup();

        // 最初のピラミッドの上
        this.createQuestionBox(564, height - 286, "bean"); // height - 250 -> height - 286 (-36px)

        // 空中ブロック地帯 (ニセモノハテナBOX)
        this.createQuestionBox(1164, height - 350, "bean");
        this.createQuestionBox(1564, height - 400, "bean");

        // ★ 鍵ブロック（難所の後）だった場所
        const goldBox = this.createQuestionBox(3750, height - 350, "goldBean");

        // Restore Box State if already collected
        if (this.hasGoldBean) {
            goldBox.setData("isOpened", true);
            goldBox.setTint(0x888888); // Opened visual
        }

        // ▼ Golden Bean（最初は非表示）
        // ボックスの位置に生成
        this.goldBeanItem = this.physics.add.sprite(goldBox.x, goldBox.y, "goldBean");
        this.goldBeanItem.setDisplaySize(32, 32); // サイズは適宜調整
        this.goldBeanItem.setVisible(false);
        this.goldBeanItem.setDepth(10); // 手前に表示
        this.goldBeanItem.disableBody(true, true); // 物理無効化

        // ▼ 土管 1 (Golden PacamaraGet後、ゴール手前)
        // x=3750 (GoldBox) ... x=4200 (Pyramid)
        // x=4000 あたりに配置
        // Original: 19x32 -> 1.5x: 29x48 -> Further 2x: 58x96
        this.pipe1 = this.platforms.create(4000, height - 32 - 30, "pipe"); // Position kept same
        this.pipe1.setOrigin(0.5, 1);
        this.pipe1.setDisplaySize(58, 96); // 2x of previous size
        this.pipe1.refreshBody(); // StaticGroupの一部として追加するので当たり判定は自動

        // ▼ 土管 2 (前半)
        this.pipe2 = this.platforms.create(2100, height - 32 - 30, "pipe");
        this.pipe2.setOrigin(0.5, 1);
        this.pipe2.setDisplaySize(58, 96); // Same size as Pipe 1
        this.pipe2.refreshBody();

        // ▼ 豆
        this.beans = this.physics.add.group({ allowGravity: false, immovable: true });
        this.spawnBeans(height);

        // ▼ ゴール
        // ▼ ゴール
        this.goal = this.physics.add
            .sprite(this.levelWidth - 100, height - 120, "tree")
            .setImmovable(true);
        this.goal.setDisplaySize(80, 200);
        (this.goal.body as Phaser.Physics.Arcade.Body).allowGravity = false;

        // Locked Block removed

        // ▼ 衝突判定
        this.physics.add.collider(this.player, this.platforms, () => {
            this.isOnGround = true;
            this.jumpCount = 0;
        });
        this.physics.add.collider(this.enemiesSlow, this.platforms);
        this.physics.add.collider(this.enemiesGreen, this.platforms);
        this.physics.add.overlap(this.player, this.goal, this.handleGoal, undefined, this);

        // ハテナブロックとの衝突（下から叩く判定）
        this.physics.add.collider(this.player, this.questionBoxes, this.handleBoxHit, undefined, this);

        // Golden Bean collection
        this.physics.add.overlap(this.player, this.goldBeanItem, this.collectGoldBean, undefined, this);

        this.physics.add.collider(this.player, this.enemiesSlow, this.handlePlayerEnemyCollision, undefined, this);
        this.physics.add.collider(this.player, this.enemiesGreen, this.handlePlayerEnemyCollision, undefined, this);
        this.physics.add.collider(this.player, this.spikes, () => this.takeDamage(true, null), undefined, this); // Changed to pass null for enemy
        this.physics.add.overlap(this.player, this.beans, this.collectBean, undefined, this);

        // カメラ
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, this.levelWidth, height);

        // 入力
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.touchControls = new TouchControls(this, { enableDown: true });
        this.touchControls.create();

        // UI
        this.createHUD();

        // 鍵UI削除

        // BGM
        this.bgm = this.sound.add("bgmMain", { volume: 0.5, loop: true });
        this.bgm.play();

    }



    private spawnBeans(height: number) {
        for (let i = 0; i < 20; i++) {
            const x = 300 + i * 200;
            if (x > 2200 && x < 2400) continue; // BOX付近は除外
            const y = height - 150 - (i % 3) * 40;
            const bean = this.beans.create(x, y - 40, "bean"); // 少し浮かせる
            bean.setDisplaySize(24, 24);
            bean.setCircle(10);
        }
    }

    private createEnemy(group: Phaser.Physics.Arcade.Group, x: number, y: number, speed: number, texture: string, patrolRange: number = 80) {
        // y座標調整: 地面に埋まらないように少し上げる
        const enemy = group.create(x, y - 32, texture) as Phaser.Physics.Arcade.Sprite;
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
        if (this.player!.y > height + 50) this.takeDamage(true, null); // Changed to pass null for enemy

        this.updateEnemies();

        // 入力
        const moveLeft = this.cursors!.left?.isDown || this.touchControls.leftPressed;
        const moveRight = this.cursors!.right?.isDown || this.touchControls.rightPressed;
        const speed = 200;

        if (moveLeft && !moveRight) {
            this.player?.setVelocityX(-speed);
            this.player?.setFlipX(true);
        } else if (moveRight && !moveLeft) {
            this.player?.setVelocityX(speed);
            this.player?.setFlipX(false);
        } else {
            this.player?.setVelocityX(0);
        }

        const jumpInput = this.spaceKey?.isDown || this.cursors?.up?.isDown || this.touchControls.jumpPressed;
        if (jumpInput && !this.prevJumpPressed) this.handleJump();
        this.prevJumpPressed = jumpInput;

        // Debug: Down input
        if (this.cursors?.down?.isDown || this.touchControls.downPressed) {
            // Warp Check (Pipe 1)
            const playerBody = this.player!.body as Phaser.Physics.Arcade.Body;
            const pipeBody = this.pipe1.body as Phaser.Physics.Arcade.StaticBody;

            // Check if player is on top of Pipe 1
            // 1. Horizontal overlap (allow some margin, e.g. 20px from center)
            const pCenter = playerBody.center.x;
            const pipeCenter = pipeBody.center.x;
            const hDiff = Math.abs(pCenter - pipeCenter);

            // 2. Vertical touching (Player bottom ~ Pipe top)
            // Allow small threshold (e.g. 5px)
            const vDiff = Math.abs(playerBody.bottom - pipeBody.top);

            // Ensure player is effectively "on" the pipe
            const onPipe1 = hDiff < 30 && vDiff < 5;

            // One-time entry check
            if (onPipe1 && !this.visitedUnderground) {
                if (this.hasGoldBean) {
                    this.bgm?.stop(); // Stop BGM before warp
                    this.scene.start("UndergroundScene", {
                        lives: this.lives,
                        hp: this.hp,
                        beans: this.beansCollected,
                        hasGoldBean: this.hasGoldBean
                    });
                } else {
                    this.showMessage("ゴールドパカマラをゲットしよう！");
                }
            }
        }

        this.isOnGround = (this.player!.body as Phaser.Physics.Arcade.Body).blocked.down;
        if (this.isOnGround && (this.player!.body as Phaser.Physics.Arcade.Body).velocity.y >= 0) this.jumpCount = 0;

        this.hpText!.setText(`HP: ${this.hp}`);
        this.beansText!.setText(`${this.beansCollected} / 10 pc`);

        // ゴール判定
        // ゴール判定は overlap で行うので update 内の判定は削除
        // ロックブロックチェック削除
        // if (this.lockedBlock?.active) return;
    }

    private handleJump() {
        if (this.isOnGround || this.jumpCount < this.maxJumpCount) {
            this.player!.setVelocityY(-420);
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
            const body = enemy.body as Phaser.Physics.Arcade.Body;

            // 壁に当たったら反転
            if (body.blocked.left || body.blocked.right) {
                enemy.setVelocityX(body.blocked.left ? speed : -speed);
                return; // 反転したターンは座標チェックしない
            }

            if (enemy.x < startX - range) enemy.setVelocityX(speed);
            else if (enemy.x > startX + range) enemy.setVelocityX(-speed);
        });

        // Slow (Jump)
        this.enemiesSlow.getChildren().forEach(obj => {
            const enemy = obj as Phaser.Physics.Arcade.Sprite;
            const startX = enemy.getData("startX") as number;
            const speed = enemy.getData("speed") as number;
            const range = 80;
            const body = enemy.body as Phaser.Physics.Arcade.Body;

            // 壁に当たったら反転
            if (body.blocked.left || body.blocked.right) {
                enemy.setVelocityX(body.blocked.left ? speed : -speed);
            } else {
                if (enemy.x < startX - range) enemy.setVelocityX(speed);
                else if (enemy.x > startX + range) enemy.setVelocityX(-speed);
            }

            // Jump Logic
            if (body.blocked.down) {
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
        if (pBody.touching.up && bBody.touching.down) {
            const item = box.getData("item");
            if (item === "goldBean") {
                // Check if already collected
                if (this.hasGoldBean) return;

                if (!box.getData("isOpened")) {
                    this.spawnGoldBean(box);
                }
            } else if (item === "bean") {
                // Fake (bean) is Infinite
                this.spawnBeanFromBox(box);
            }
        }
    }

    private spawnGoldBean(box: Phaser.Physics.Arcade.Sprite) {
        box.setData("isOpened", true);
        box.setTint(0x888888);

        // ブロックが跳ねる演出
        this.tweens.add({
            targets: box,
            y: box.y - 10,
            yoyo: true,
            duration: 100
        });

        // Golden Bean出現
        this.goldBeanItem.enableBody(true, box.x, box.y - 48, true, true);
        this.goldBeanItem.setVisible(true);
        // ふわふわ浮かせる
        (this.goldBeanItem.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

        // ピカピカさせる (Flash/Alpha)
        const startY = this.goldBeanItem.y;
        this.tweens.add({
            targets: this.goldBeanItem,
            y: startY - 10,
            yoyo: true,
            repeat: -1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });

        // 明滅
        this.tweens.add({
            targets: this.goldBeanItem,
            alpha: 0.5,
            yoyo: true,
            repeat: -1,
            duration: 300
        });
    }

    private collectGoldBean(player: any, bean: any) {
        if (this.hasGoldBean) return;

        bean.destroy();
        this.hasGoldBean = true;
        this.showMessage("ゴールドパカマラゲット！");

        // SEあれば鳴らす
        // this.sound.play("powerup");
    }

    private spawnBeanFromBox(box: Phaser.Physics.Arcade.Sprite) {
        // Fake Box Logic (Infinite)

        // ブロックが跳ねる演出
        this.tweens.add({
            targets: box,
            y: box.y - 10,
            yoyo: true,
            duration: 100
        });

        const bean = this.beans.create(box.x, box.y - 48, "bean");
        bean.setDisplaySize(24, 24);
        bean.setCircle(10);
        // シンプルな飛び出し (両方とも)
        bean.setVelocityY(-350);
        (bean.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        bean.setBounce(0.5);
        bean.setCollideWorldBounds(true);
        if (this.platforms) {
            this.physics.add.collider(bean, this.platforms);
        }

        bean.setVelocityY(-200); // Fake is simple hop
        this.showMessage("パカマラ！");
    }

    // spawnKey removed
    // collectKey removed

    private showMessage(text: string) {
        if (!this.messageText) return;
        this.messageText.setText(text);
        this.messageText.setVisible(true);
        this.time.delayedCall(2000, () => this.messageText?.setVisible(false));
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

    // ★ block1を使ったピラミッド生成
    private createPyramid(startX: number, startY: number, height: number) {
        for (let i = 0; i < height; i++) {
            // ピラミッド型：段が上がるにつれて幅が狭くなる
            const widthNum = height - i; // 段のブロック数
            const offset = (height - widthNum) * 16; // 中央寄せのためのオフセット
            for (let w = 0; w < widthNum; w++) {
                const x = startX + offset + (w * 32);
                const y = startY - (i * 32);
                const b = this.platforms?.create(x, y, "block1");
                b.setDisplaySize(32, 32);
                b.refreshBody();
            }
        }
    }

    // ★ 横に連結した足場ブロック
    private createSolidPlatform(startX: number, y: number, widthCount: number) {
        for (let i = 0; i < widthCount; i++) {
            const b = this.platforms?.create(startX + (i * 32), y, "block1");
            b.setDisplaySize(32, 32);
            b.refreshBody();
        }
    }

    // ★ 縦に積まれたブロック（塔）
    private createTower(x: number, groundY: number, height: number) {
        for (let i = 0; i < height; i++) {
            const b = this.platforms?.create(x, groundY - (i * 32), "block1");
            b.setDisplaySize(32, 32);
            b.refreshBody();
        }
    }

    private createQuestionBox(x: number, y: number, item: string) {
        const box = this.questionBoxes.create(x, y, "questionBox") as Phaser.Physics.Arcade.Sprite;
        box.setData("item", item);
        box.setDisplaySize(40, 40); // 64 -> 40 (ブロックより少し大きい程度)
        box.refreshBody();
        // isOpened defaults to false
        return box;
    }

    // handleLockedBlock removed

    // 被ダメージ処理
    private takeDamage(fall: boolean, enemy: any | null) {
        if (this.isInvincible) return;
        this.hp--;
        if (this.hp > 0 && !fall) {
            this.startInvincible();
            // ノックバック
            // enemyがいる場合はその位置関係、いない場合(トゲなど)は進行方向の逆など
            let dir = 0;
            if (enemy) {
                dir = this.player!.x < enemy.x ? -1 : 1;
            } else {
                dir = -1; // デフォルト左へ
            }
            this.player!.setVelocityX(200 * dir);
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
                this.player!.setAlpha(1);
            }
        });
    }

    private collectBean(player: any, bean: any) {
        bean.destroy();
        this.beansCollected++;
    }

    private handleGoal() {
        this.bgm?.stop();
        this.scene.start("GameScene6", {
            lives: this.lives,
            hp: this.hp,
            beans: this.beansCollected
        });
    }
}
