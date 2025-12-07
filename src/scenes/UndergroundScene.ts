
import Phaser from "phaser";
import { TouchControls } from "../ui/TouchControls";

export class UndergroundScene extends Phaser.Scene {
    private player?: Phaser.Physics.Arcade.Sprite;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private platforms?: Phaser.Physics.Arcade.StaticGroup;
    private beans?: Phaser.Physics.Arcade.Group;
    private pipeExit?: Phaser.Physics.Arcade.Image; // Exit pipe detection

    private touchControls!: TouchControls;

    // Jump Variables
    private jumpCount = 0;
    private maxJumpCount = 2;
    private prevJumpPressed = false;

    private score = 0;
    private beansCollected = 0;

    // 前のシーンから引き継ぐデータ
    private requestData: any;

    constructor() {
        super("UndergroundScene");
    }

    init(data: any) {
        this.requestData = data;
        this.score = data.score ?? 0;
        this.beansCollected = data.beans ?? 0;
        // hasGoldBean is in data, we just pass it back
    }

    preload() {
        // Player
        this.load.image("player", "/assets/santa.png");

        // Underground Assets
        this.load.image("ground_under", "/assets/underground1.png");
        this.load.image("block_under", "/assets/underground_block1.png");
        this.load.image("bean", "/assets/coffee_bean.png");
        this.load.image("pipe", "/assets/pipe.png");

        // BGM (Main for now, or maybe silent/different?)
        // this.load.audio("bgmUnder", "/assets/bgm_main.mp3");
    }

    create() {
        const { width, height } = this.scale;

        // Background: Black
        this.cameras.main.setBackgroundColor("#000000");
        this.physics.world.setBounds(0, 0, width, height);

        this.platforms = this.physics.add.staticGroup();

        // 1. Ground (underground1.png)
        // Tile across the bottom
        const groundY = height - 32;
        for (let x = 0; x < width; x += 32) {
            const g = this.platforms.create(x, groundY, "ground_under");
            g.setOrigin(0, 0.5);
            g.setDisplaySize(32, 64); // Assume 32x64 or 32x32? Image suggests blocks.
            // Usually ground is 32-64px high. Let's assume 32x32 blocks if not specified.
            // User said "use underground1.png".
            g.refreshBody();
        }

        // 2. Left Wall (block_under)
        for (let y = 0; y < height - 32; y += 32) {
            this.createBlock(16, y);
            // Make it thicker? Image shows maybe 2 blocks wide?
            this.createBlock(48, y);
        }

        // 3. Ceiling (partial?) - Image shows blocks at top
        for (let x = 0; x < width; x += 32) {
            // Only center part?
            if (x > 100 && x < width - 100) {
                this.createBlock(x, 16);
                this.createBlock(x, 48);
            }
        }

        // 4. Center Platform (Bonus area)
        const centerX = width / 2;
        const platformY = height - 150;

        // Build a pyamid/block structure? Image shows a rectangular block mass.
        // Let's make a platform 8 blocks wide.
        const startX = centerX - (4 * 32);
        for (let x = startX; x < startX + (8 * 32); x += 32) {
            // 4 rows of blocks?
            for (let y = 0; y < 4; y++) {
                this.createBlock(x, height - 64 - (y * 32));
            }
        }

        // 5. Pipe (Right side, horizontal)
        // Stage 5 size was 58x96. Horizontal means 96x58.
        const pipeX = width - 60;
        const pipeY = height - 90;
        // Use Image for visual, check overlap via Zone or Physics Image
        // create creates a sprite in static group with physics body
        this.pipeExit = this.platforms.create(pipeX, pipeY, "pipe") as Phaser.Physics.Arcade.Image;
        this.pipeExit.setAngle(-90); // Rotate to point left
        this.pipeExit.setDisplaySize(58, 96);
        this.pipeExit.refreshBody();

        // Since rotated -90, the body might not rotate with simple arcade static body unless configured carefully.
        // For static body, rotation doesn't always rotate the body box in Arcade Physics (before Phaser 3.80+ it was tricky).
        // Let's manually set body size to horizontal if needed, or use a zone.
        // 58x96 -> Rotated -> 96x58.
        const body = (this.pipeExit.body as Phaser.Physics.Arcade.StaticBody);
        body.setSize(96, 58); // Manually set horizontal size
        body.updateFromGameObject(); // Sync position

        // Slightly offset player collisions if needed, but for "entering", we want overlap.
        // Actually, user wants "walk in". So it should trigger on overlap.
        // But we also want the pipe to be solid?
        // Usually pipes are solid, but the entry part triggers warp.
        // Let's add an invisible zone for the warp trigger at the pipe mouth. 
        // Pipe mouth is on the left side of the pipe image.
        // If pipeX is center, left is -48px approx.
        // Visual pipe is solid. Trigger is separate.

        // Change pipe to just visual/solid platform
        // Trigger added separately below.


        // 6. Beans (20 total)
        this.beans = this.physics.add.group({ allowGravity: false, immovable: true });

        // Arrange in a pyramid/formation above the central platform
        // Platform top is at height - 64 - (3 * 32) -> height - 160.
        const beanBaseY = height - 160 - 40;

        // 3 rows: 5, 7, 8 = 20
        this.createBeanRow(centerX, beanBaseY - 80, 5);
        this.createBeanRow(centerX, beanBaseY - 40, 7);
        this.createBeanRow(centerX, beanBaseY, 8);


        // Player
        // Start from left top/drop? Or Pipe?
        // User didn't specify start pos. Let's put safe left.
        // Player
        // Start from top-left (falling from hole)
        this.player = this.physics.add.sprite(50, 50, "player");
        this.player.setCollideWorldBounds(true);
        (this.player.body as Phaser.Physics.Arcade.Body).setSize(32, 64);

        // Touch Controls
        this.touchControls = new TouchControls(this);
        this.touchControls.create();

        // Collisions
        this.physics.add.collider(this.player, this.platforms, () => {
            // Reset jump count on ground
            if (this.player?.body.touching.down) {
                this.jumpCount = 0;
            }
        });
        this.physics.add.overlap(this.player, this.beans, this.collectBean, undefined, this);

        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Warp Trigger Zone (at Pipe Mouth)
        const warpZone = this.add.zone(pipeX - 50, pipeY, 20, 50);
        this.physics.add.existing(warpZone, true);
        this.physics.add.overlap(this.player, warpZone, this.handlePipeExit, undefined, this);
    }

    private createBlock(x: number, y: number) {
        const b = this.platforms!.create(x, y, "block_under");
        b.setDisplaySize(32, 32);
        b.refreshBody();
    }

    private createBeanRow(centerX: number, y: number, count: number) {
        const spacing = 40;
        const startX = centerX - ((count - 1) * spacing) / 2;
        for (let i = 0; i < count; i++) {
            const bean = this.beans!.create(startX + i * spacing, y, "bean");
            bean.setDisplaySize(24, 24);
        }
    }

    private collectBean(player: any, bean: any) {
        bean.destroy();
        this.beansCollected++;
        // Sound?
    }

    private handlePipeExit(player: any, zone: any) {
        // Return to Stage 5
        this.scene.start("GameScene5", {
            lives: this.requestData?.lives ?? 3, // Keep lives (or update if stored in scene prop)
            hp: this.requestData?.hp ?? 2,
            beans: this.beansCollected,
            beans: this.beansCollected,
            fromUnderground: true, // Flag to spawn at Pipe 2
            visitedUnderground: true, // Confirm visited state
            hasGoldBean: this.requestData?.hasGoldBean ?? false // Maintain state
        });
    }

    update() {
        // Player movement logic (same as GameScene)
        const speed = 200;
        const left = this.cursors?.left.isDown || this.touchControls.leftPressed;
        const right = this.cursors?.right.isDown || this.touchControls.rightPressed;
        const jump = this.cursors?.up.isDown || this.touchControls.jumpPressed;

        if (left) {
            this.player?.setVelocityX(-speed);
            this.player?.setFlipX(true);
        } else if (right) {
            this.player?.setVelocityX(speed);
            this.player?.setFlipX(false);
        } else {
            this.player?.setVelocityX(0);
        }

        // Jump Logic (Double Jump)
        const isJumpJustPressed = jump && !this.prevJumpPressed;

        // Reset jump count if on ground (redundant safety check, main reset in collision)
        if (this.player?.body.touching.down && !jump) {
            this.jumpCount = 0;
        }

        if (isJumpJustPressed && this.jumpCount < this.maxJumpCount) {
            this.player?.setVelocityY(-400);
            this.jumpCount++;
        }

        this.prevJumpPressed = jump;
    }
}
