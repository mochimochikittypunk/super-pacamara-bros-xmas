import Phaser from "phaser";
import { TouchControls } from "../ui/TouchControls";

export class UndergroundScene6 extends Phaser.Scene {
    private player?: Phaser.Physics.Arcade.Sprite;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private platforms?: Phaser.Physics.Arcade.StaticGroup;
    private enemies!: Phaser.Physics.Arcade.Group;
    private pipeExit?: Phaser.Physics.Arcade.Image;
    private touchControls!: TouchControls;

    // Key Item
    private keyItem!: Phaser.Physics.Arcade.Sprite;
    private questionBox!: Phaser.Physics.Arcade.Sprite;
    private hasKey = false;
    private isKeySpawned = false;

    private requestData: any;
    private beansCollected = 0;

    // Jump
    private jumpCount = 0;
    private maxJumpCount = 2;
    private prevJumpPressed = false;

    constructor() {
        super("UndergroundScene6");
    }

    init(data: any) {
        this.requestData = data;
        this.beansCollected = data.beans ?? 0;
        // Reset key state on entry usually, or pass if needed (but key is unique here)
        this.hasKey = false;
        this.isKeySpawned = false;
    }

    preload() {
        this.load.image("player", "/assets/santa.png");
        this.load.image("ground_under", "/assets/underground1.png");
        this.load.image("block_under", "/assets/underground_block1.png");
        this.load.image("pipe", "/assets/pipe.png");
        this.load.image("enemy_smile", "/assets/enemy_smile.png");
        this.load.image("question_box", "/assets/question_box.png");
        this.load.image("key", "/assets/key1.png");
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#000000");
        this.physics.world.setBounds(0, 0, width, height);

        this.platforms = this.physics.add.staticGroup();
        this.createLevel(width, height);

        // Enemies: Giant Smile (Boss style, matching Stage 3)
        this.enemies = this.physics.add.group();
        this.createGiantEnemy(width * 0.35, height - 32);
        this.createGiantEnemy(width * 0.65, height - 32);

        // Player
        this.player = this.physics.add.sprite(50, 50, "player");
        this.player.setCollideWorldBounds(true);
        (this.player.body as Phaser.Physics.Arcade.Body).setSize(32, 64);

        // Pipe Exit (Right side)
        const pipeX = width - 60;
        const pipeY = height - 90;
        this.pipeExit = this.platforms.create(pipeX, pipeY, "pipe") as Phaser.Physics.Arcade.Image;
        this.pipeExit.setAngle(-90);
        this.pipeExit.setDisplaySize(58, 96);
        this.pipeExit.refreshBody();
        (this.pipeExit.body as Phaser.Physics.Arcade.StaticBody).setSize(96, 58);

        // Warp Zone
        const warpZone = this.add.zone(pipeX - 50, pipeY, 20, 50);
        this.physics.add.existing(warpZone, true);
        this.physics.add.overlap(this.player, warpZone, this.handlePipeExit, undefined, this);

        // Question Box (Center) containing Key
        // Place high enough to need jump or platform
        const boxX = width / 2;
        const boxY = height - 344; // Moved up by 64px (280 -> 344)
        this.questionBox = this.physics.add.sprite(boxX, boxY, "question_box");
        this.platforms.add(this.questionBox);
        this.questionBox.setDisplaySize(40, 40); // Fix size to match Stage 5
        this.questionBox.setImmovable(true);
        (this.questionBox.body as Phaser.Physics.Arcade.Body).allowGravity = false;

        // Key (Hidden)
        this.keyItem = this.physics.add.sprite(boxX, boxY, "key");
        this.keyItem.setVisible(false);
        this.keyItem.disableBody(true, true);

        // Controls
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.touchControls = new TouchControls(this);
        this.touchControls.create();

        // Collisions
        this.physics.add.collider(this.player, this.platforms, () => {
            if (this.player?.body.touching.down) this.jumpCount = 0;
        });
        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.collider(this.player, this.enemies, this.handlePlayerEnemyCollision, undefined, this);
        this.physics.add.collider(this.player, this.questionBox, this.handleBoxHit, undefined, this);
        this.physics.add.overlap(this.player, this.keyItem, this.collectKey, undefined, this);
    }

    private createLevel(width: number, height: number) {
        // Floor
        for (let x = 0; x < width; x += 32) {
            const g = this.platforms!.create(x, height - 32, "ground_under");
            g.setDisplaySize(32, 32);
            g.refreshBody();
        }
        // Walls
        for (let y = 0; y < height; y += 32) {
            this.platforms!.create(0, y, "block_under").setDisplaySize(32, 32).refreshBody();
            this.platforms!.create(width - 32, y, "block_under").setDisplaySize(32, 32).refreshBody();
        }
        // Platforms for jumping
        this.platforms!.create(width * 0.2, height - 150, "block_under").setDisplaySize(96, 32).refreshBody();
        this.platforms!.create(width * 0.8, height - 150, "block_under").setDisplaySize(96, 32).refreshBody();
        this.platforms!.create(width * 0.5, height - 250 + 40, "block_under").setDisplaySize(96, 32).refreshBody(); // Below box
    }

    private createGiantEnemy(x: number, y: number) {
        const enemy = this.enemies.create(x, y, "enemy_smile");

        // Match Stage 3 Boss Size
        enemy.setDisplaySize(320, 320);
        enemy.setOrigin(0.5, 1); // Anchor bottom center

        // Physics Body (Small core)
        enemy.body.setSize(32, 32);
        enemy.body.setOffset(144, 288); // Center horizontally, Bottom vertically

        enemy.setCollideWorldBounds(true);
        enemy.setBounce(1, 0);
        enemy.setVelocityX(100);
        (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(false); // Disable gravity to fit Stage 3 style
    }

    private handleBoxHit(player: any, box: any) {
        if (player.body.touching.up && box.body.touching.down) {
            if (this.isKeySpawned) return;

            // Spawn Key
            this.isKeySpawned = true;
            box.setTint(0x888888);

            // Bounce box
            this.tweens.add({ targets: box, y: box.y - 10, yoyo: true, duration: 100 });

            // Pop Key
            this.keyItem.enableBody(true, box.x, box.y - 64, true, true); // Spawn slightly higher
            this.keyItem.setVisible(true);
            this.keyItem.setScale(2.0); // 2x Size
            // this.keyItem.setVelocityY(-300); // Remove velocity, use tween

            // Disable gravity so it floats
            (this.keyItem.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

            // Floating Tween (Up and Down)
            this.tweens.add({
                targets: this.keyItem,
                y: this.keyItem.y - 48, // Float higher
                yoyo: true,
                repeat: -1,
                duration: 1000,
                ease: "Sine.easeInOut"
            });

            // Glowing Tween (Alpha pulsing)
            this.tweens.add({
                targets: this.keyItem,
                alpha: 0.7,
                yoyo: true,
                repeat: -1,
                duration: 500
            });
        }
    }

    private collectKey(player: any, key: any) {
        key.destroy();
        this.hasKey = true;
        // Sound?
    }

    private handlePipeExit(player: any, zone: any) {
        this.scene.start("GameScene6", {
            lives: this.requestData?.lives ?? 3,
            hp: this.requestData?.hp ?? 2,
            beans: this.beansCollected,
            fromUnderground: true,
            visitedUnderground: true,
            hasKey: this.hasKey, // Pass Key!
            hasGoldBean: this.requestData?.hasGoldBean ?? true // Maintain Gold Bean state
        });
    }

    private handlePlayerEnemyCollision(player: any, enemy: any) {
        // If Giant, maybe hard to stamp?
        // Let's allow stamping if high enough
        if (player.body.touching.down && enemy.body.touching.up) {
            enemy.destroy();
            player.setVelocityY(-400);
        } else {
            // Damage check (handled in GameScene usually, but here needs simple restart or damage logic)
            // For now, let's just restart scene with penalty or push back
            this.scene.start("GameScene6", {
                lives: (this.requestData?.lives ?? 3) - 1,
                hp: 2,
                beans: this.beansCollected
            });
        }
    }

    update() {
        const moveLeft = this.cursors!.left?.isDown || this.touchControls.leftPressed;
        const moveRight = this.cursors!.right?.isDown || this.touchControls.rightPressed;
        const speed = 200;

        if (moveLeft && !moveRight) {
            this.player!.setVelocityX(-speed);
            this.player!.setFlipX(true);
        } else if (moveRight && !moveLeft) {
            this.player!.setVelocityX(speed);
            this.player!.setFlipX(false);
        } else {
            this.player!.setVelocityX(0);
        }

        const jumpInput = this.cursors!.up?.isDown || this.touchControls.jumpPressed;
        if (jumpInput && !this.prevJumpPressed) {
            if (this.player?.body.touching.down || this.jumpCount < this.maxJumpCount) {
                this.player?.setVelocityY(-400);
                this.jumpCount++;
            }
        }
        this.prevJumpPressed = jumpInput;
    }
}
