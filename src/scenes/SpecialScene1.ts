
import Phaser from "phaser";
import { TouchControls } from "../ui/TouchControls";

export class SpecialScene1 extends Phaser.Scene {
    private player?: Phaser.Physics.Arcade.Sprite;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private platforms?: Phaser.Physics.Arcade.StaticGroup;
    private beans?: Phaser.Physics.Arcade.Group;
    private pipeExit?: Phaser.Physics.Arcade.Image;
    private touchControls!: TouchControls;

    // Time Attack
    private timeLimit = 50; // 50 seconds
    private timerText?: Phaser.GameObjects.Text;
    private timerEvent?: Phaser.Time.TimerEvent;
    private isTimeOver = false;
    private giantEnemy?: Phaser.Physics.Arcade.Sprite;

    // Jump Variables
    private jumpCount = 0;
    private maxJumpCount = 2;
    private prevJumpPressed = false;

    private beansCollected = 0;

    constructor() {
        super("SpecialScene1");
    }

    init(data: any) {
        this.beansCollected = data.beans ?? 0;
    }

    preload() {
        this.load.image("player", "/assets/santa.png");
        this.load.image("ground_under", "/assets/underground1.png");
        this.load.image("block_under", "/assets/underground_block1.png");
        this.load.image("pipe", "/assets/pipe.png");
        this.load.image("goldBean", "/assets/gold_bean.png"); // Gold Pacamara
        this.load.image("enemySmile", "/assets/enemy_smile.png"); // Giant Enemy
    }

    create() {
        const height = this.scale.height;
        const levelWidth = 8000;

        // Background: Black
        this.cameras.main.setBackgroundColor("#000000");
        this.physics.world.setBounds(0, 0, levelWidth, height);

        this.platforms = this.physics.add.staticGroup();

        // 1. Ground (underground1.png) - All the way to 8000
        const groundY = height - 32;
        for (let x = 0; x < levelWidth; x += 32) {
            const g = this.platforms!.create(x, groundY, "ground_under");
            g.setOrigin(0, 0.5);
            g.setDisplaySize(32, 64);
            g.refreshBody();
        }

        // 2. Ceiling (block_under) - All the way
        for (let x = 0; x < levelWidth; x += 32) {
            const b = this.platforms!.create(x, 16, "block_under");
            b.setDisplaySize(32, 32); b.refreshBody();
        }

        // 3. Start Pipe (Vertical) at x=100
        const startPipe = this.platforms!.create(100, height - 32 - 30, "pipe"); // -30 similar to Stage 6 ground adjust
        startPipe.setOrigin(0.5, 1);
        startPipe.setDisplaySize(58, 96);
        startPipe.refreshBody();

        // 4. End Pipe (Horizontal) at x=7900
        // Horizontal pipe size: 96x58
        const endPipeX = 7900;
        const endPipeY = height - 90;
        this.pipeExit = this.platforms!.create(endPipeX, endPipeY, "pipe");
        this.pipeExit!.setAngle(-90);
        this.pipeExit!.setDisplaySize(58, 96); // Sprite size
        this.pipeExit!.refreshBody();
        // Adjust body for horizontal collision if needed, but Zone will handle trigger
        const pBody = this.pipeExit!.body as Phaser.Physics.Arcade.StaticBody;
        pBody.setSize(96, 58); pBody.updateFromGameObject();

        // 5. Beans (Gold Pacamara) - Filled from Start to End
        this.beans = this.physics.add.group({ allowGravity: false, immovable: true });

        // Fill from x=300 to x=7700
        // Double density: x += 30 (was 60)
        for (let x = 300; x < 7700; x += 30) {
            // Create rows or waves?
            // "敷き詰められている" -> Filled. Let's do 3 rows like a feast!
            // Heights: Low, Mid, High
            this.createBean(x, height - 100);
            this.createBean(x, height - 150);
            this.createBean(x, height - 200);
            this.createBean(x, height - 240); // Fill gap
            // Double Jump Height (High Altitude)
            this.createBean(x, height - 280);
        }

        // 6. Player
        this.player = this.physics.add.sprite(100, height - 150, "player");
        this.player.setCollideWorldBounds(true);
        (this.player.body as Phaser.Physics.Arcade.Body).setSize(32, 64);

        // Controls
        this.touchControls = new TouchControls(this);
        this.touchControls.create();
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Camera
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, levelWidth, height);

        // Collisions
        this.physics.add.collider(this.player, this.platforms, () => {
            if (this.player?.body.touching.down) this.jumpCount = 0;
        });
        this.physics.add.overlap(this.player, this.beans, this.collectBean, undefined, this);

        // Goal Trigger (Zone at End Pipe)
        const warpZone = this.add.zone(endPipeX - 20, endPipeY, 20, 60); // Entrance of horizontal pipe
        this.physics.add.existing(warpZone, true);
        this.physics.add.overlap(this.player!, warpZone, this.handleGoal, undefined, this); // Entering triggers Goal

        // Timer Text (Fixed to screen)
        this.timerText = this.add.text(16, 16, `TIME: ${this.timeLimit}`, {
            fontSize: "32px",
            color: "#00ff00", // Fluorescent Green
            fontStyle: "bold"
        }).setScrollFactor(0);

        // Start Timer
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.onSecondTick,
            callbackScope: this,
            loop: true
        });
    }

    private onSecondTick() {
        if (this.isTimeOver) return;
        this.timeLimit--;
        if (this.timeLimit < 0) this.timeLimit = 0;
        this.timerText?.setText(`TIME: ${this.timeLimit}`);
        if (this.timeLimit <= 0) {
            this.handleTimeOver();
        }
    }

    private handleTimeOver() {
        if (this.isTimeOver) return;
        this.isTimeOver = true;
        this.timerEvent?.remove();
        this.timerText?.setText("TIME OVER! Run!");
        this.timerText?.setColor("#ff0000");

        // Spawn Giant Enemy Smile at Right Edge (x=8000)
        // Y: height - 150 (Ground level approx)
        const height = this.scale.height;
        this.giantEnemy = this.physics.add.sprite(8000, height - 150, "enemySmile");
        this.giantEnemy!.setDisplaySize(300, 300); // Giant 300px
        (this.giantEnemy!.body as Phaser.Physics.Arcade.Body).setSize(300, 300);
        this.giantEnemy!.setCollideWorldBounds(true);
        (this.giantEnemy!.body as Phaser.Physics.Arcade.Body).setAllowGravity(false); // Floating chase? Or walking?
        // User said "come towards us". Let's enable gravity but make it fast?
        // Or "Ghost" style? "enemy_smile" is ghost?
        // Let's assume ground chase if gravity, or flying if ghost.
        // Usually Smile is ghost. Let's make it float/fly chase.
        (this.giantEnemy!.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

        this.physics.add.overlap(this.player!, this.giantEnemy, this.handleHitEnemy, undefined, this);
    }

    private handleHitEnemy(player: any, enemy: any) {
        this.timerEvent?.remove();
        this.scene.start("GameOverScene", { returnToTitle: true });
    }

    private createBean(x: number, y: number) {
        const bean = this.beans!.create(x, y, "goldBean");
        bean.setDisplaySize(32, 32);
        // Gold Bean usually floats or glows? It's fine static for now.
    }

    private collectBean(player: any, bean: any) {
        bean.destroy();
        this.beansCollected++;
        // Maybe sound?
    }

    private handleGoal(player: any, zone: any) {
        // Goal Reached!
        // Transition to Review Flow with BEANS Score (not time)
        this.scene.start("ReviewNameScene", {
            score: this.beansCollected
        });
    }

    update() {
        const speed = 400; // Fast for fun? Or normal 200. User didn't say. Keep 200.
        const left = this.cursors?.left.isDown || this.touchControls.leftPressed;
        const right = this.cursors?.right.isDown || this.touchControls.rightPressed;
        const jump = this.cursors?.up.isDown || this.touchControls.jumpPressed;

        // X Movement
        if (left) {
            this.player?.setVelocityX(-200); this.player?.setFlipX(true);
        } else if (right) {
            this.player?.setVelocityX(200); this.player?.setFlipX(false);
        } else {
            this.player?.setVelocityX(0);
        }

        // Jump
        const isJumpJustPressed = jump && !this.prevJumpPressed;
        if (this.player?.body.touching.down && !jump) this.jumpCount = 0;
        if (isJumpJustPressed && this.jumpCount < this.maxJumpCount) {
            this.player?.setVelocityY(-420); this.jumpCount++;
        }
        this.prevJumpPressed = jump;

        // Fall check
        if (this.player!.y > this.scale.height + 100) {
            this.scene.restart();
        }

        // Giant Enemy Chase Logic
        if (this.isTimeOver && this.giantEnemy && this.giantEnemy.active) {
            // Move towards player
            this.physics.moveToObject(this.giantEnemy, this.player!, 600); // Very fast chase
        }
    }
}
