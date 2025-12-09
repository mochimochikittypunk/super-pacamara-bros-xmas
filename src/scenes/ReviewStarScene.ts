
import Phaser from "phaser";
import { ApiClient } from "../utils/ApiClient";

export class ReviewStarScene extends Phaser.Scene {
    private score = 0;
    private userName = "";
    private rating = 0;
    private stars: Phaser.GameObjects.Text[] = [];

    constructor() {
        super("ReviewStarScene");
    }

    init(data: any) {
        this.score = data.score;
        this.userName = data.name;
    }

    create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor("#000000");

        this.add.text(width / 2, 80, "このミニゲームは\n面白かったですか？", {
            fontSize: "28px",
            color: "#ffffff",
            align: "center"
        }).setOrigin(0.5);

        // 5 Stars
        // Usually use graphics or text. Let's use Text "★" / "☆".
        const startX = width / 2 - 100;
        const starY = height / 2;

        for (let i = 1; i <= 5; i++) {
            const star = this.add.text(startX + (i - 1) * 50, starY, "☆", {
                fontSize: "40px",
                color: "#facc15" // Yellow
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            star.setData("value", i);
            star.on("pointerdown", () => this.setRating(i));
            this.stars.push(star);
        }

        // Submit Button
        const btn = this.add.rectangle(width / 2, height - 100, 200, 50, 0x22c55e)
            .setInteractive({ useHandCursor: true });

        this.add.text(btn.x, btn.y, "レビューを送信", {
            fontSize: "20px",
            color: "#ffffff"
        }).setOrigin(0.5);

        btn.on("pointerdown", () => {
            if (this.rating > 0) {
                this.submitReview();
            } else {
                // Blink text
                this.cameras.main.shake(100, 0.01);
            }
        });
    }

    private setRating(value: number) {
        this.rating = value;
        this.stars.forEach((star, index) => {
            if (index < value) {
                star.setText("★");
            } else {
                star.setText("☆");
            }
        });
    }

    private async submitReview() {
        // Show Loading?
        const { width, height } = this.scale;
        const loading = this.add.text(width / 2, height / 2 + 60, "Sending...", { fontSize: "16px", color: "#aaa" }).setOrigin(0.5);

        const success = await ApiClient.submitScore(this.userName, this.score, this.rating);

        this.scene.start("RankingScene");
    }
}
