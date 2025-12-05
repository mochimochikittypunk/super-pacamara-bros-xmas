const Jimp = require("jimp");

async function run() {
    const input = process.argv[2];

    // Try to handle Jimp import issues
    let image;
    try {
        image = await Jimp.read(input);
    } catch (e) {
        // Fallback or alternate property access might be needed depending on jimp version
        try {
            const { Jimp: JimpLib } = require("jimp");
            image = await JimpLib.read(input);
        } catch (e2) {
            console.log("Attempting lib.Jimp...");
            // Sometimes Jimp default export works differently
            image = await require("jimp").read(input);
        }
    }

    // Safety check
    if (!image && Jimp.default) {
        try {
            image = await Jimp.default.read(input);
        } catch (e3) { }
    }

    if (!image) {
        throw new Error("Could not load image with any Jimp method");
    }

    const width = image.bitmap.width;
    const height = image.bitmap.height;

    const corners = [
        { x: 0, y: 0, name: "Top-Left" },
        { x: width - 1, y: 0, name: "Top-Right" },
        { x: 0, y: height - 1, name: "Bottom-Left" }, // Might be mountain base?
        { x: width - 1, y: height - 1, name: "Bottom-Right" }
    ];

    console.log(`Image Size: ${width}x${height}`);

    corners.forEach(c => {
        const hex = image.getPixelColor(c.x, c.y).toString(16);
        const rgba = Jimp.intToRGBA(image.getPixelColor(c.x, c.y));
        console.log(`${c.name}: Hex=${hex}, RGBA=${JSON.stringify(rgba)}`);
    });

    // Check for "snow" (white pixels) near top left
    let snowFound = false;
    for (let y = 0; y < 50; y++) {
        for (let x = 0; x < 50; x++) {
            const rgba = Jimp.intToRGBA(image.getPixelColor(x, y));
            if (rgba.r > 240 && rgba.g > 240 && rgba.b > 240) {
                console.log(`Potential snow found at ${x},${y}: ${JSON.stringify(rgba)}`);
                snowFound = true;
                break;
            }
        }
        if (snowFound) break;
    }
}

run().catch(console.error);
