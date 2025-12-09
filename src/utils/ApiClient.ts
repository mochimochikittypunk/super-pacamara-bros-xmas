
export interface RankingEntry {
    name: string;
    score: number; // Remaining Time
    review: number; // Star rating
    timestamp: number;
}

export class ApiClient {
    // Real API URL provided by User
    private static readonly API_URL = "https://script.google.com/macros/s/AKfycbx4NkNvMAb6rKxbryfTeyJF5g2VylzEh39U8p7FDhI8BDqo7A7XqRDaBQ7EUzc3_zTI/exec";
    private static readonly MOCK_STORAGE_KEY = "pacamara_ranking_mock";

    static async submitScore(name: string, score: number, review: number): Promise<boolean> {
        if (!this.API_URL) {
            // Mock: Save to LocalStorage
            const current: RankingEntry[] = JSON.parse(localStorage.getItem(this.MOCK_STORAGE_KEY) || "[]");
            current.push({ name, score, review, timestamp: Date.now() });
            // Sort by Score Desc
            current.sort((a, b) => b.score - a.score);
            // Keep top 20
            if (current.length > 20) current.length = 20;
            localStorage.setItem(this.MOCK_STORAGE_KEY, JSON.stringify(current));

            // Artificial delay
            await new Promise(resolve => setTimeout(resolve, 500));
            return true;
        }

        // Real API Implementation (Future)
        try {
            const response = await fetch(this.API_URL, {
                method: "POST",
                body: JSON.stringify({ name, score, review, action: "submit" }),
                headers: {
                    "Content-Type": "text/plain" // Avoid CORS Preflight
                }
            });
            return response.ok;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    static async getRanking(): Promise<RankingEntry[]> {
        if (!this.API_URL) {
            // Mock
            const current: RankingEntry[] = JSON.parse(localStorage.getItem(this.MOCK_STORAGE_KEY) || "[]");

            // Add some fake data if empty
            if (current.length === 0) {
                return [
                    { name: "Santa", score: 45, review: 5, timestamp: Date.now() },
                    { name: "Paca", score: 30, review: 4, timestamp: Date.now() },
                    { name: "Mara", score: 10, review: 3, timestamp: Date.now() }
                ];
            }
            return current;
        }

        // Real API
        try {
            const response = await fetch(`${this.API_URL}?action=get`);
            const data = await response.json();
            return data as RankingEntry[];
        } catch (e) {
            console.error(e);
            return [];
        }
    }
}
