
import Phaser from "phaser";

export class ReviewNameScene extends Phaser.Scene {
    private score = 0; // Remaining Time
    private inputElement?: HTMLInputElement;

    constructor() {
        super("ReviewNameScene");
    }

    init(data: any) {
        this.score = data.score ?? 0;
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#000000");

        // Title
        this.add.text(width / 2, 50, "STAGE 1 CLEAR!", {
            fontSize: "32px",
            color: "#facc15",
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Score
        this.add.text(width / 2, 100, `SCORE (Beans): ${this.score}`, {
            fontSize: "24px",
            color: "#00ff00"
        }).setOrigin(0.5);

        this.add.text(width / 2, 150, "Enter Your Name:", {
            fontSize: "20px",
            color: "#ffffff"
        }).setOrigin(0.5);

        // HTML Input Overlay
        this.createInput(width / 2, 200);

        // Next Button
        const btn = this.add.rectangle(width / 2, 300, 200, 50, 0x3b82f6)
            .setInteractive({ useHandCursor: true });

        this.add.text(btn.x, btn.y, "Next >", {
            fontSize: "24px",
            color: "#ffffff"
        }).setOrigin(0.5);

        btn.on("pointerdown", () => {
            if (this.inputElement && this.inputElement.value.trim() !== "") {
                this.submitName();
            } else {
                // Shake button or show error
                this.tweens.add({ targets: btn, x: btn.x + 10, yoyo: true, duration: 50, repeat: 3 });
            }
        });
    }

    private createInput(x: number, y: number) {
        // Create an input element on the DOM
        this.inputElement = document.createElement("input");
        this.inputElement.type = "text";
        this.inputElement.placeholder = "Name";
        this.inputElement.style.position = "absolute";
        // Calculate position relative to canvas
        // This is tricky if canvas scales.
        // For now, simpler constraint: Use Phaser DOM Element if enabled, or simple absolute centering 
        // assuming standard containment.
        // Let's stick "center" style.
        this.inputElement.style.left = "50%";
        this.inputElement.style.top = "40%"; // Approx 200px / 540px ~ 37%
        this.inputElement.style.transform = "translate(-50%, -50%)";
        this.inputElement.style.width = "200px";
        this.inputElement.style.padding = "10px";
        this.inputElement.style.fontSize = "16px";
        this.inputElement.maxLength = 10;

        document.body.appendChild(this.inputElement);

        this.inputElement.focus();
    }

    private submitName() {
        const name = this.inputElement!.value.trim().substring(0, 10);
        // Clean up DOM
        if (this.inputElement) {
            document.body.removeChild(this.inputElement);
            this.inputElement = undefined;
        }

        this.scene.start("ReviewStarScene", {
            score: this.score,
            name: name
        });
    }

    // Important: Clean up DOM if scene shuts down unexpectedly
    shutdown() {
        if (this.inputElement && document.body.contains(this.inputElement)) {
            document.body.removeChild(this.inputElement);
        }
    }
}
