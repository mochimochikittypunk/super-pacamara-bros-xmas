
import Phaser from "phaser";
import { ApiClient, RankingEntry } from "../utils/ApiClient";

export class RankingScene extends Phaser.Scene {
    constructor() {
        super("RankingScene");
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#000000");

        this.add.text(width / 2, 40, "RANKING", {
            fontSize: "36px", color: "#facc15", fontStyle: "bold"
        }).setOrigin(0.5);

        this.add.text(width / 2, 70, "TOP PLAYERS", { fontSize: "16px", color: "#888" }).setOrigin(0.5);

        // Fetch Ranking
        this.showRanking(width, height);

        // Screenshot Button
        const shotBtn = this.add.rectangle(width / 2, height - 90, 200, 40, 0x8b5cf6)
            .setInteractive({ useHandCursor: true });

        this.add.text(shotBtn.x, shotBtn.y, "スクショを撮る", {
            fontSize: "18px", color: "#ffffff"
        }).setOrigin(0.5);

        shotBtn.on("pointerdown", () => {
            this.takeScreenshot();
        });

        // Finish Button
        const btn = this.add.rectangle(width / 2, height - 40, 200, 40, 0xef4444)
            .setInteractive({ useHandCursor: true });

        this.add.text(btn.x, btn.y, "Back to Title", {
            fontSize: "18px", color: "#ffffff"
        }).setOrigin(0.5);

        btn.on("pointerdown", () => {
            this.scene.start("TitleScene");
        });
    }

    private async showRanking(width: number, height: number) {
        const loading = this.add.text(width / 2, height / 2, "Loading...", { fontSize: "20px", color: "#fff" }).setOrigin(0.5);

        const data = await ApiClient.getRanking();

        loading.destroy();

        if (data.length === 0) {
            this.add.text(width / 2, height / 2, "No Records Yet", { color: "#888" }).setOrigin(0.5);
            return;
        }

        const startY = 100;
        const lineHeight = 30;

        // Header
        this.add.text(100, startY, "Rank", { fontSize: "16px", color: "#aaa" });
        this.add.text(200, startY, "Name", { fontSize: "16px", color: "#aaa" });
        this.add.text(450, startY, "Score", { fontSize: "16px", color: "#aaa" });

        data.forEach((entry, index) => {
            if (index >= 10) return; // Top 10

            const y = startY + (index + 1) * lineHeight + 10;
            const rankColor = index === 0 ? "#facc15" : (index === 1 ? "#94a3b8" : (index === 2 ? "#b45309" : "#fff"));

            this.add.text(100, y, `#${index + 1}`, { fontSize: "18px", color: rankColor });
            this.add.text(200, y, entry.name, { fontSize: "18px", color: "#fff" });
            this.add.text(450, y, `${entry.score} ゴールドパカマラ`, { fontSize: "18px", color: "#00ff00" });
        });
    }

    private takeScreenshot() {
        this.game.renderer.snapshot((image: any) => {
            // image is an Image Element (HTMLImageElement)
            // Show Popup
            this.showPopup();

            // To be helpful, we can try to trigger a download
            const link = document.createElement("a");
            link.href = image.src;
            link.download = `pacamara_ranking_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    private showPopup() {
        const { width, height } = this.scale;
        const container = this.add.container(width / 2, height / 2);

        const bg = this.add.rectangle(0, 0, 400, 200, 0xffffff).setStrokeStyle(4, 0x000000);
        const text = this.add.text(0, -20, "インスタにアップして\nマウントをとろう！", {
            fontSize: "24px", color: "#000000", align: "center", fontStyle: "bold"
        }).setOrigin(0.5);

        const closeBtn = this.add.rectangle(0, 60, 100, 40, 0xef4444).setInteractive({ useHandCursor: true });
        const closeText = this.add.text(0, 60, "OK", { fontSize: "18px", color: "#fff" }).setOrigin(0.5);

        container.add([bg, text, closeBtn, closeText]);
        container.setDepth(100);

        closeBtn.on("pointerdown", () => {
            container.destroy();
        });
    }
}
