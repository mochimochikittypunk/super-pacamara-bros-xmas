const { Jimp } = require("jimp");

async function main() {
    const image = await Jimp.read("public/assets/castle.png");
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    console.log(`Dimensions: ${width}x${height}`);

    const intToRGBA = (i) => ({ r: (i >>> 24) & 0xFF, g: (i >>> 16) & 0xFF, b: (i >>> 8) & 0xFF, a: i & 0xFF });

    // Sample corners
    console.log("Top-Left:", intToRGBA(image.getPixelColor(0, 0)));
    console.log("Top-Right:", intToRGBA(image.getPixelColor(width - 1, 0)));
    console.log("Bottom-Left:", intToRGBA(image.getPixelColor(0, height - 1)));
    console.log("Bottom-Right:", intToRGBA(image.getPixelColor(width - 1, height - 1)));

    // Sample middle bottom
    console.log("Bottom-Middle:", intToRGBA(image.getPixelColor(Math.floor(width / 2), height - 1)));

    // Sample a few rows from the bottom to see how tall the "bar" is
    for (let y = height - 1; y >= height - 20; y -= 5) {
        console.log(`Row ${y} Middle:`, intToRGBA(image.getPixelColor(Math.floor(width / 2), y)));
    }
}

main();
