const { Jimp } = require("jimp");
const fs = require("fs");

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
    console.error("Usage: node process_cloud.js <input> <output>");
    process.exit(1);
}

async function main() {
    try {
        const lib = require("jimp");
        const Jimp = lib.Jimp;
        console.log("Jimp class found:", !!Jimp);

        console.log("Reading image from:", inputPath);
        const image = await Jimp.read(inputPath);
        console.log("Image read success. Processing pixels...");
        console.log("Image keys:", Object.keys(image));
        console.log("Image prototype keys:", Object.keys(Object.getPrototypeOf(image)));

        const width = image.bitmap.width;
        const height = image.bitmap.height;

        // Flood Fill Logic
        // Target color at (0,0)
        // Use lib.intToRGBA because Jimp variable might be the class
        const intToRGBA = lib.intToRGBA || Jimp.intToRGBA || ((i) => ({ r: (i >>> 24) & 0xFF, g: (i >>> 16) & 0xFF, b: (i >>> 8) & 0xFF, a: i & 0xFF }));
        const rgbaToInt = lib.rgbaToInt || Jimp.rgbaToInt || ((r, g, b, a) => ((r << 24) | (g << 16) | (b << 8) | a) >>> 0);

        const startColor = intToRGBA(image.getPixelColor(0, 0));
        console.log("Flood fill start color:", startColor);

        const stack = [[0, 0]];
        const visited = new Set();
        const tolerance = 60; // Color distance tolerance (increase if needed)

        // Helper to check color match
        function isMatch(x, y) {
            const c = intToRGBA(image.getPixelColor(x, y));
            // Check if color is close to start color OR is white (snow in sky)
            // User said it's okay to delete falling snow.
            // Snow is close to 255,255,255
            const dist = Math.sqrt(
                Math.pow(c.r - startColor.r, 2) +
                Math.pow(c.g - startColor.g, 2) +
                Math.pow(c.b - startColor.b, 2)
            );

            // Allow tolerant match to start color
            if (dist < tolerance) return true;

            // Also swallow white/near-white pixels if they are connected to sky
            // R,G,B > 200
            if (c.r > 200 && c.g > 200 && c.b > 200) return true;

            return false;
        }

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            visited.add(key);

            // Set alpha to 0
            const currentColor = intToRGBA(image.getPixelColor(x, y));
            // Keep RGB, set A=0
            const newColor = rgbaToInt(currentColor.r, currentColor.g, currentColor.b, 0);
            image.setPixelColor(newColor, x, y);

            // Check neighbors
            const neighbors = [
                [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
            ];

            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nKey = `${nx},${ny}`;
                    if (!visited.has(nKey) && isMatch(nx, ny)) {
                        stack.push([nx, ny]);
                    }
                }
            }
        }

        console.log(`Flood fill completed. Processed ${visited.size} pixels.`);

        // Also do a pass to convert any remaining PURE BLACK to transparent if any (legacy support)
        // Or if we want to be safe, stick to flood fill. 
        // Let's stick to flood fill as primary. But maybe the user image has some other artifacts.
        // For now, flood fill from (0,0) should kill the sky and floating snow.

        console.log("Saving image via write()...");
        await new Promise((resolve, reject) => {
            image.write(outputPath, (err) => {
                if (err) reject(err);
                else {
                    console.log(`Saved transparent image to ${outputPath}`);
                    resolve();
                }
            });
        });

    } catch (err) {
        console.error("Error processing image:", err);
        console.log("Jimp export:", require("jimp"));
        process.exit(1);
    }
}

main();
