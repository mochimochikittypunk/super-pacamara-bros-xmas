import Phaser from "phaser";
import { TouchControls } from "../ui/TouchControls";

type GameSceneData = {
    lives: number;
    hp: number;
    beans: number;
};

export class GameScene6 extends Phaser.Scene {
    private player?: Phaser.Physics.Arcade.Sprite;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private platforms?: Phaser.Physics.Arcade.StaticGroup;
    private spikes?: Phaser.Physics.Arcade.StaticGroup;
    private bgObjects?: Phaser.GameObjects.Group;

    private lives = 3;
    private livesText?: Phaser.GameObjects.Text;
    private hp = 2;
    private hpText?: Phaser.GameObjects.Text;

    private isInvincible = false;

    // KEY LOGIC (Replacement for Gold Bean)
    private hasKey = false;
    private keyIcon?: Phaser.GameObjects.Image;

    // GOLD BEAN LOGIC (Pipe Entry Requirement)
    private hasGoldBean = false;
    private goldBeanItem!: Phaser.Physics.Arcade.Sprite;

    private levelWidth = 4800;
    private goalX = 4700;

    constructor() {
        super("GameScene6");
    }
    private enemiesSlow!: Phaser.Physics.Arcade.Group;
    private enemiesGreen!: Phaser.Physics.Arcade.Group;
    private beans!: Phaser.Physics.Arcade.Group;
    private goal!: Phaser.Physics.Arcade.Sprite;

    private questionBoxes!: Phaser.Physics.Arcade.StaticGroup;
    // No gold bean item here (Key is in Underground)

    // Pipes
    private pipe1!: Phaser.Physics.Arcade.Sprite;
    private pipe2!: Phaser.Physics.Arcade.Sprite;

    private touchControls!: TouchControls;
    private bgm?: Phaser.Sound.BaseSound;

    private beansCollected = 0;
    private totalBeans = 0;

    private beansText?: Phaser.GameObjects.Text;
    private messageText?: Phaser.GameObjects.Text;

    private isOnGround = false;
    private jumpCount = 0;
    private maxJumpCount = 2;
    private prevJumpPressed = false;
    private spaceKey?: Phaser.Input.Keyboard.Key;

    private fromUnderground = false;
    private visitedUnderground = false;

    init(data: GameSceneData & { fromUnderground?: boolean, visitedUnderground?: boolean, hasKey?: boolean, hasGoldBean?: boolean }) {
        this.lives = data.lives ?? 3;
        this.hp = data.hp ?? 2;
        this.beansCollected = data.beans ?? 0;
        this.totalBeans = 0; // Reset total count to prevent accumulation
        this.fromUnderground = data.fromUnderground ?? false;
        this.visitedUnderground = data.visitedUnderground ?? (this.fromUnderground ? true : false);
        this.hasKey = data.hasKey ?? false;
        this.hasGoldBean = data.hasGoldBean ?? false; // Maintain Gold Bean state if needed (though mostly for entry)
    }

    preload() {
        this.load.image("player", "/assets/santa.png");
        // Reuse Stage 5 assets
        this.load.image("ground2", "/assets/ground2.png");
        this.load.image("platform2", "/assets/platform2.png");
        this.load.image("block1", "/assets/block1.png");
        this.load.image("cloud", "/assets/cloud.png");
        this.load.image("mountain", "/assets/snow_mountain.png");
        this.load.image("spike", "/assets/spike.png");
        this.load.image("bean", "/assets/coffee_bean.png");
        this.load.image("tree", "/assets/tree.png");
        this.load.image("enemySlow", "/assets/enemy_slow.png");
        this.load.image("enemyGreen", "/assets/enemy_green.png");
        this.load.image("questionBox", "/assets/question_box.png");
        this.load.image("goldBean", "/assets/gold_bean.png"); // Load Gold Bean
        this.load.image("key", "/assets/key1.png");
        this.load.image("pipe", "/assets/pipe.png");
        this.load.image("castle", "/assets/castle.png");
        this.load.audio("bgmMain", "/assets/bgm_main.mp3");
    }

    create() {
        const { height, width } = this.scale;
        this.physics.world.setBounds(0, 0, this.levelWidth, height);
        this.cameras.main.setBackgroundColor("#5b6b7c");

        // BACKGROUND
        const bgObjects: Phaser.GameObjects.GameObject[] = [];
        for (let x = 200; x < this.levelWidth; x += Phaser.Math.Between(800, 1200)) {
            const mountain = this.add.image(x, height - 20, "mountain").setOrigin(0.5, 1).setScale(0.2).setScrollFactor(0.15).setDepth(-20);
            bgObjects.push(mountain);
        }
        for (let i = 0; i < 8; i++) {
            const cloud = this.add.image(Phaser.Math.Between(0, this.levelWidth), Phaser.Math.Between(50, 200), "cloud")
                .setScrollFactor(Phaser.Math.FloatBetween(0.1, 0.3)).setScale(0.15).setAlpha(0.8).setDepth(-10);
            bgObjects.push(cloud);
        }

        this.platforms = this.physics.add.staticGroup();
        this.spikes = this.physics.add.staticGroup();
        this.questionBoxes = this.physics.add.staticGroup();
        this.beans = this.physics.add.group({ allowGravity: false, immovable: true }); // Beans group init early for helpers

        // --- NEW LAYOUT GENERATION ---

        // 1. START AREA (Left) - Brick Ground
        // Width: 0 to 400
        for (let x = 0; x < 400; x += 32) {
            for (let y = height - 32; y < height; y += 32) {
                this.platforms.create(x, y, "block1").setDisplaySize(32, 32).refreshBody(); // Brick floor
            }
        }

        // 2. PILLARS (Mushroom-like structures: Stalk=block1, Top=ground2)

        // Pillar 1: Low (x=600)
        this.createPillar(600, height, 3, 3); // x, groundY, widthBlocks, heightBlocks

        // Pillar 2: Medium + 3 Beans (x=1000)
        this.createPillar(1000, height, 4, 6);
        this.createBeans(1000, height - (6 * 32) - 50, 3); // On top

        // Pillar 3: Low + 1 Bean (x=1400)
        this.createPillar(1400, height, 2, 4);
        this.createBeans(1400, height - (4 * 32) - 50, 1);

        // Pillar 4: Medium (x=1700)
        this.createPillar(1700, height, 3, 7);

        // Pillar 5: TALLEST WALL (x=2100)
        this.createPillar(2100, height, 5, 12); // Huge wall

        // Gap with Floating Platform? (x=2500)
        // Image shows floating platform with arrow? Let's use platform2
        const floatP = this.platforms.create(2600, height - 300, "platform2");
        floatP.setDisplaySize(96, 32); floatP.refreshBody();
        this.createBeans(2600, height - 350, 2);

        // Pillar 6: ITEM TOWER (x=3000) - Has Question Box & 4 Beans
        this.createPillar(3000, height, 5, 10);
        this.createBeans(3000, height - (10 * 32) - 80, 4); // High above
        // Question Box (Gold Pacamara) placed here later manually

        // Pillar 7: Low (x=3500)
        this.createPillar(3500, height, 3, 4);

        // Pillar 8: High (x=3800)
        this.createPillar(3800, height, 2, 8);

        // End Area (x=4100 to end)
        this.createPillar(4100, height, 3, 11); // Before Pipe

        // Pipe Area Platform
        for (let x = 4400; x < this.levelWidth; x += 32) {
            this.platforms.create(x, height - 32, "block1").setDisplaySize(32, 32).refreshBody();
        }

        // --- OBJECTS PLACEMENT ---

        // Gold Bean Box (On Pillar 6, x=3000, TopY = height - 10*32 = height - 320)
        // Place box floating above pillar
        const goldBoxX = 3000;
        const goldBoxY = height - 320 - 100; // Floating high
        const goldBox = this.createQuestionBox(goldBoxX, goldBoxY, "goldBean");
        if (this.hasGoldBean) { goldBox.setData("isOpened", true); goldBox.setTint(0x888888); }

        // Gold Bean Item
        this.goldBeanItem = this.physics.add.sprite(goldBoxX, goldBoxY, "goldBean");
        this.goldBeanItem.setVisible(false); this.goldBeanItem.setDisplaySize(32, 32); this.goldBeanItem.disableBody(true, true);

        // Random Boxes
        this.createQuestionBox(1000, height - 300, "bean");
        this.createQuestionBox(2100, height - 500, "bean");

        // PIPES
        // Pipe 1 (To Underground) - Place at x=4500 (End platform)
        this.pipe1 = this.platforms.create(4500, height - 32 - 14, "pipe"); // Moved down 16px (was -30)
        this.pipe1.setOrigin(0.5, 1); this.pipe1.setDisplaySize(58, 96); this.pipe1.refreshBody();

        // Pipe 2 (Return) - Place at x=150 (Start area)
        this.pipe2 = this.platforms.create(150, height - 32 - 14, "pipe"); // Moved down 6px (was -20)
        this.pipe2.setOrigin(0.5, 1); this.pipe2.setDisplaySize(58, 96); this.pipe2.refreshBody();

        // PLAYER
        let spawnX = 50; let spawnY = height - 100;
        if (this.fromUnderground) { spawnX = 150; spawnY = height - 200; this.fromUnderground = false; }
        this.player = this.physics.add.sprite(spawnX, spawnY, "player").setCollideWorldBounds(true);
        (this.player.body as Phaser.Physics.Arcade.Body).setSize(32, 64);

        // ENEMIES
        this.enemiesSlow = this.physics.add.group();
        this.enemiesGreen = this.physics.add.group();

        // Place enemies on pillars 1, 3, 7(8), 8(9) as requested
        // Pillar 1 (x=600, w=3, h=3)
        this.createEnemy(this.enemiesGreen, 600, height - (3 * 32), 80, "enemyGreen", 20);
        // Pillar 3 (x=1400, w=2, h=4) - Narrow
        this.createEnemy(this.enemiesGreen, 1400, height - (4 * 32), 80, "enemyGreen", 10);
        // Pillar 7 (User's #8) (x=3500, w=3, h=4)
        this.createEnemy(this.enemiesGreen, 3500, height - (4 * 32), 80, "enemyGreen", 20);
        // Pillar 8 (User's #9) (x=3800, w=2, h=8) - Narrow
        this.createEnemy(this.enemiesGreen, 3800, height - (8 * 32), 80, "enemyGreen", 10);


        // GOAL
        this.goal = this.physics.add.sprite(this.levelWidth - 100, height - 120, "tree").setImmovable(true);
        this.goal.setDisplaySize(80, 200); (this.goal.body as Phaser.Physics.Arcade.Body).allowGravity = false;

        // COLLIDERS
        this.physics.add.collider(this.player, this.platforms, () => { this.isOnGround = true; this.jumpCount = 0; });
        this.physics.add.collider(this.enemiesSlow, this.platforms);
        this.physics.add.collider(this.enemiesGreen, this.platforms);
        this.physics.add.overlap(this.player, this.goal, this.handleGoal, undefined, this);
        this.physics.add.collider(this.player, this.questionBoxes, this.handleBoxHit, undefined, this);
        this.physics.add.collider(this.player, this.enemiesSlow, this.handlePlayerEnemyCollision, undefined, this);
        this.physics.add.collider(this.player, this.enemiesGreen, this.handlePlayerEnemyCollision, undefined, this);
        this.physics.add.collider(this.player, this.spikes, () => this.takeDamage(true, null), undefined, this);
        this.physics.add.overlap(this.player, this.beans, this.collectBean, undefined, this);
        this.physics.add.overlap(this.player, this.goldBeanItem, this.collectGoldBean, undefined, this);

        // CAM & INPUT
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, this.levelWidth, height);
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.touchControls = new TouchControls(this, { enableDown: true });
        this.touchControls.create();
        this.createHUD();
        this.bgm = this.sound.add("bgmMain", { volume: 0.5, loop: true });
        this.bgm.play();
    }

    // Helper to create Pillars (Stalk + Top)
    private createPillar(centerX: number, groundY: number, widthBlocks: number, heightBlocks: number) {
        // Iterate Height. Top layer is ground2. Rest is block1.
        const startX = centerX - (widthBlocks * 32) / 2 + 16;
        for (let h = 0; h < heightBlocks; h++) {
            for (let w = 0; w < widthBlocks; w++) {
                const isTop = (h === heightBlocks - 1);
                const tex = isTop ? "ground2" : "block1";
                const b = this.platforms!.create(startX + w * 32, groundY - 16 - (h * 32), tex);
                b.setDisplaySize(32, 32); b.refreshBody();
            }
        }
    }

    private createBeans(centerX: number, y: number, count: number) {
        const startX = centerX - (count * 32) / 2 + 16;
        for (let i = 0; i < count; i++) {
            this.beans.create(startX + i * 32, y, "bean").setDisplaySize(24, 24).setCircle(10);
            this.totalBeans++; // Increment totalBeans when creating them
        }
    }

    // --- Helpers ---
    private createEnemy(group: Phaser.Physics.Arcade.Group, x: number, y: number, speed: number, texture: string, patrolRange: number = 80, canJump: boolean = true) {
        const enemy = group.create(x, y - 32, texture) as Phaser.Physics.Arcade.Sprite;
        enemy.setCollideWorldBounds(false); enemy.setBounce(0, 0); enemy.setDisplaySize(64, 64);
        (enemy.body as Phaser.Physics.Arcade.Body).setSize(64, 64);
        enemy.setData("startX", x); enemy.setData("speed", speed); enemy.setData("patrolRange", patrolRange);
        enemy.setVelocityX(speed * (Math.random() < 0.5 ? -1 : 1));
        if (texture === "enemySlow") {
            (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
            enemy.setData("canJump", canJump); // Use param
            enemy.setData("nextJumpTime", this.time.now + 2000);
        } else {
            (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(true); // Enable gravity for Green too
        }
    }

    private createPyramid(startX: number, startY: number, height: number) {
        for (let i = 0; i < height; i++) {
            const widthNum = height - i;
            const offset = (height - widthNum) * 16;
            for (let w = 0; w < widthNum; w++) {
                const b = this.platforms?.create(startX + offset + (w * 32), startY - (i * 32), "block1");
                b.setDisplaySize(32, 32); b.refreshBody();
            }
        }
    }
    private createSolidPlatform(startX: number, y: number, widthCount: number) {
        for (let i = 0; i < widthCount; i++) {
            const b = this.platforms?.create(startX + (i * 32), y, "block1");
            b.setDisplaySize(32, 32); b.refreshBody();
        }
    }
    private createTower(x: number, groundY: number, height: number) {
        for (let i = 0; i < height; i++) {
            const b = this.platforms?.create(x, groundY - (i * 32), "block1");
            b.setDisplaySize(32, 32); b.refreshBody();
        }
    }
    private createQuestionBox(x: number, y: number, item: string) {
        const box = this.questionBoxes.create(x, y, "questionBox") as Phaser.Physics.Arcade.Sprite;
        box.setData("item", item);
        box.setDisplaySize(40, 40); box.refreshBody();
        return box;
    }
    private spawnBeans(height: number) {
        for (let i = 0; i < 10; i++) {
            const x = 300 + i * 200;
            if (x > 2200 && x < 2400) continue;
            this.beans.create(x, height - 190 - (i % 3) * 40, "bean").setDisplaySize(24, 24).setCircle(10);
            this.totalBeans++;
        }
    }

    private createHUD() {
        const { width } = this.scale;
        this.livesText = this.add.text(16, 16, `Lives: ${this.lives}`, { fontSize: "18px", color: "#f9fafb" }).setScrollFactor(0);
        this.hpText = this.add.text(16, 40, `HP: ${this.hp}`, { fontSize: "18px", color: "#f97316" }).setScrollFactor(0);
        this.beansText = this.add.text(width - 16, 16, `${this.beansCollected} / ${this.totalBeans}`, { fontSize: "18px", color: "#e5e7eb" }).setOrigin(1, 0).setScrollFactor(0);

        // Key Icon
        this.keyIcon = this.add.image(width - 40, 60, "key").setScrollFactor(0).setDisplaySize(32, 32);
        if (!this.hasKey) { this.keyIcon.setTint(0x000000); this.keyIcon.setAlpha(0.5); }
        else { this.keyIcon.clearTint(); this.keyIcon.setAlpha(1); }

        this.messageText = this.add.text(width / 2, 80, "", { fontSize: "24px", color: "#ffffff", backgroundColor: "#00000080", padding: { x: 10, y: 5 } }).setOrigin(0.5).setScrollFactor(0).setVisible(false);
    }

    update() {
        const height = this.scale.height;
        if (this.player!.y > height + 50) this.takeDamage(true, null);

        // Player Movement Logic
        const moveLeft = this.cursors!.left?.isDown || this.touchControls.leftPressed;
        const moveRight = this.cursors!.right?.isDown || this.touchControls.rightPressed;
        const speed = 200;
        if (moveLeft && !moveRight) { this.player!.setVelocityX(-speed); this.player!.setFlipX(true); }
        else if (moveRight && !moveLeft) { this.player!.setVelocityX(speed); this.player!.setFlipX(false); }
        else this.player!.setVelocityX(0);

        const jumpInput = this.spaceKey?.isDown || this.cursors?.up?.isDown || this.touchControls.jumpPressed;
        if (jumpInput && !this.prevJumpPressed) {
            if (this.isOnGround || this.jumpCount < this.maxJumpCount) {
                this.player!.setVelocityY(-420); this.jumpCount++; this.isOnGround = false;
            }
        }
        this.prevJumpPressed = jumpInput;

        // WARP LOGIC
        if (this.cursors?.down?.isDown || this.touchControls.downPressed) {
            const pCenter = this.player!.body!.center.x;
            const pipeCenter = this.pipe1.body!.center.x;
            const hDiff = Math.abs(pCenter - pipeCenter);
            const vDiff = Math.abs(this.player!.body!.bottom - this.pipe1.body!.top);
            if (hDiff < 30 && vDiff < 5 && !this.visitedUnderground) {
                if (this.hasGoldBean) {
                    this.bgm?.stop();
                    this.scene.start("UndergroundScene6", {
                        lives: this.lives, hp: this.hp, beans: this.beansCollected,
                        hasGoldBean: this.hasGoldBean // Pass boolean
                    });
                } else {
                    this.showMessage("ゴールドパカマラを見つけよう！");
                }
            }
        }

        this.isOnGround = (this.player!.body as Phaser.Physics.Arcade.Body).blocked.down;
        if (this.isOnGround && this.player!.body!.velocity.y >= 0) this.jumpCount = 0;
        this.hpText!.setText(`HP: ${this.hp}`);
        this.beansText!.setText(`${this.beansCollected} / ${this.totalBeans}`);
    }

    private handleBoxHit(player: any, box: any) {
        if (player.body.touching.up && box.body.touching.down) {
            const item = box.getData("item");
            if (item === "goldBean") {
                if (this.hasGoldBean) return;
                if (!box.getData("isOpened")) {
                    this.spawnGoldBean(box);
                }
            } else {
                this.tweens.add({ targets: box, y: box.y - 10, yoyo: true, duration: 100 });
                // Basic bean
                const bean = this.beans.create(box.x, box.y - 48, "bean");
                bean.setDisplaySize(24, 24); bean.setCircle(10);
                bean.setVelocityY(-350); (bean.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
                bean.setCollideWorldBounds(true); this.physics.add.collider(bean, this.platforms!);
                this.showMessage("パカマラ！");
                box.setData("isOpened", true); // Should probably lock box? Stage 5 allows infinite "bean"?
                // Line 550 in GS5 says "Fake (bean) is Infinite".
                // But GS6 uses basic logic. Let's keep infinite for now or just one.
                // The code above didn't check isOpened for basic box.
            }
        }
    }

    private spawnGoldBean(box: Phaser.Physics.Arcade.Sprite) {
        box.setData("isOpened", true);
        box.setTint(0x888888);
        this.tweens.add({ targets: box, y: box.y - 10, yoyo: true, duration: 100 });

        this.goldBeanItem.enableBody(true, box.x, box.y - 48, true, true);
        this.goldBeanItem.setVisible(true);
        (this.goldBeanItem.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

        // Flash/Float similar to Stage 5
        const startY = this.goldBeanItem.y;
        this.tweens.add({
            targets: this.goldBeanItem, y: startY - 10, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: this.goldBeanItem, alpha: 0.5, yoyo: true, repeat: -1, duration: 300
        });
    }

    private collectGoldBean(player: any, bean: any) {
        if (this.hasGoldBean) return;
        bean.destroy();
        this.hasGoldBean = true;
        this.showMessage("ゴールドパカマラゲット！");
    }
    private collectBean(player: any, bean: any) { bean.destroy(); this.beansCollected++; }

    private takeDamage(fall: boolean, enemy: any | null) {
        if (this.isInvincible) return;
        this.hp--;
        if (this.hp > 0 && !fall) {
            this.isInvincible = true;
            this.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, repeat: 5, duration: 100, onComplete: () => { this.isInvincible = false; this.player!.setAlpha(1); } });
            // Knockback
            const dir = enemy ? (this.player!.x < enemy.x ? -1 : 1) : -1;
            this.player!.setVelocityX(200 * dir); this.player!.setVelocityY(-200);
            return;
        }
        this.lives--; this.bgm?.stop();
        if (this.lives > 0) this.scene.restart({ lives: this.lives, hp: 2, beans: this.beansCollected });
        else this.scene.start("GameOverScene");
    }

    private handlePlayerEnemyCollision(player: any, enemy: any) {
        if ((player.body.velocity.y > 0) && (player.y < enemy.y - 40)) {
            enemy.destroy(); player.setVelocityY(-300);
        } else {
            this.takeDamage(false, enemy);
        }
    }

    private showMessage(text: string) {
        if (!this.messageText) return;
        this.messageText.setText(text); this.messageText.setVisible(true);
        this.time.delayedCall(2000, () => this.messageText?.setVisible(false));
    }

    private handleGoal() {
        // KEY CHECK
        const pRect = this.player!.getBounds();
        const goalRect = this.goal.getBounds();
        if (!Phaser.Geom.Rectangle.Overlaps(pRect, goalRect)) return;

        if (!this.hasKey) {
            this.showMessage("鍵がありません！");
            return;
        }
        this.bgm?.stop();
        this.scene.start("ClearSceneSimple", { beans: this.beansCollected, totalBeans: this.totalBeans, nextStage: null });
    }
}
