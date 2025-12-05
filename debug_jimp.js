const lib = require("jimp");
console.log("Keys:", Object.keys(lib));
console.log("Jimp on lib:", !!lib.Jimp);
if (lib.Jimp) {
    console.log("Jimp.read exists?", !!lib.Jimp.read);
}
console.log("lib.read exists?", !!lib.read);
