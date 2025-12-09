
import Phaser from "phaser";

export class MiniGameIntroScene extends Phaser.Scene {
    constructor() {
        super("MiniGameIntroScene");
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#000000");

        // Text 1
        this.add.text(width / 2, height / 2 - 40, "たくさんのゴールドパカマラを集めて\nランク上位を目指せ！", {
            fontSize: "24px",
            color: "#facc15",
            align: "center",
            lineSpacing: 10
        }).setOrigin(0.5);

        // Text 2
        this.add.text(width / 2, height / 2 + 60, "週間ランキングを\nInstagramで発表するよ☆", {
            fontSize: "20px",
            color: "#ffffff",
            align: "center",
            lineSpacing: 10
        }).setOrigin(0.5);

        // Progress Indication (Optional, e.g. "Loading..." or simple count)

        // Wait 4 seconds then start SpecialScene1
        this.time.delayedCall(4000, () => {
            this.scene.start("SpecialScene1");
        });
    }
}
