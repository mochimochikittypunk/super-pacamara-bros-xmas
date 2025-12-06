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

        // Target Colors
        const skyColor = { r: 160, g: 184, b: 255 };
        const snowBarColor = { r: 245, g: 245, b: 255 };

        let minX = width, maxX = 0, minY = height, maxY = 0;
        let hasContent = false;

        image.scan(0, 0, width, height, (x, y, idx) => {
            const r = image.bitmap.data[idx + 0];
            const g = image.bitmap.data[idx + 1];
            const b = image.bitmap.data[idx + 2];
            const a = image.bitmap.data[idx + 3];

            // If already transparent, skip (assuming previous runs might have cleared some)
            // But we want to re-run logic to be safe, so let's re-evaluate colors.
            // Note: If input is already processed, 'a' might be 0.

            let isTransparent = (a === 0);

            if (!isTransparent) {
                // Distance to Sky
                const distSky = Math.sqrt(Math.pow(r - skyColor.r, 2) + Math.pow(g - skyColor.g, 2) + Math.pow(b - skyColor.b, 2));
                // Distance to Snow Bar
                const distSnow = Math.sqrt(Math.pow(r - snowBarColor.r, 2) + Math.pow(g - snowBarColor.g, 2) + Math.pow(b - snowBarColor.b, 2));

                if (distSky < 40) {
                    image.bitmap.data[idx + 3] = 0;
                    isTransparent = true;
                } else if (distSnow < 10) {
                    image.bitmap.data[idx + 3] = 0;
                    isTransparent = true;
                }
            }

            // Update bounds if NOT transparent
            if (!isTransparent) {
                hasContent = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        });

        if (hasContent) {
            const cropW = maxX - minX + 1;
            const cropH = maxY - minY + 1;
            console.log(`Bounding Box: x=${minX}, y=${minY}, w=${cropW}, h=${cropH}`);

            // Fix: Jimp v1.0+ might require options object for crop based on Zod error
            image.crop({ x: minX, y: minY, w: cropW, h: cropH });
        } else {
            console.warn("Image is completely transparent!");
        }

        await image.write(outputPath);
        console.log(`Saved processed image to ${outputPath}`);
        console.log(`Final Dimensions: ${image.bitmap.width}x${image.bitmap.height}`);

    } catch (err) {
        console.error("Error processing image:", err);
        process.exit(1);
    }
}

main();
