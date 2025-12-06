const { Jimp } = require("jimp");
const fs = require("fs");

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
    console.error("Usage: node process_castle.js <input> <output>");
    process.exit(1);
}

async function main() {
    try {
        const lib = require("jimp");
        const Jimp = lib.Jimp;

        console.log("Reading image from:", inputPath);
        const image = await Jimp.read(inputPath);

        const width = image.bitmap.width;
        const height = image.bitmap.height;

        // Determine background color from top-left (assuming it's background)
        const intToRGBA = lib.intToRGBA || Jimp.intToRGBA || ((i) => ({ r: (i >>> 24) & 0xFF, g: (i >>> 16) & 0xFF, b: (i >>> 8) & 0xFF, a: i & 0xFF }));
        const rgbaToInt = lib.rgbaToInt || Jimp.rgbaToInt || ((r, g, b, a) => ((r << 24) | (g << 16) | (b << 8) | a) >>> 0);

        const startColor = intToRGBA(image.getPixelColor(0, 0));
        console.log("Background color detected:", startColor);

        // Flood fill from all 4 corners to catch disconnected background regions
        const seeds = [
            [0, 0],
            [width - 1, 0],
            [0, height - 1],
            [width - 1, height - 1]
        ];

        const visited = new Set();
        const tolerance = 40; // Increased tolerance slightly to catch artifacts

        function isMatch(x, y) {
            const c = intToRGBA(image.getPixelColor(x, y));
            const dist = Math.sqrt(
                Math.pow(c.r - startColor.r, 2) +
                Math.pow(c.g - startColor.g, 2) +
                Math.pow(c.b - startColor.b, 2)
            );
            return dist < tolerance;
        }

        const stack = [...seeds];

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            visited.add(key);

            if (x >= 0 && x < width && y >= 0 && y < height) {
                if (isMatch(x, y)) {
                    // Set to transparent
                    const c = intToRGBA(image.getPixelColor(x, y));
                    // Check if it's already transparent
                    if (c.a !== 0) {
                        image.setPixelColor(0x00000000, x, y);
                    }

                    // Push neighbors
                    stack.push([x + 1, y]);
                    stack.push([x - 1, y]);
                    stack.push([x, y + 1]);
                    stack.push([x, y - 1]);
                }
            }
        }

        console.log("Transparency applied.");

        // Autocrop to remove empty space around the castle
        // This will fix the "floating" issue if the image has bottom padding
        image.autocrop();
        console.log("Image autocropped.");

        await image.write(outputPath);
        console.log(`Saved processed image to ${outputPath}`);

    } catch (err) {
        console.error("Error processing image:", err);
        process.exit(1);
    }
}

main();
