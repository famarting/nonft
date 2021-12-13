const Jimp = require('jimp');
const fs = require('fs');

const imgw = 64;
const imgh = 64;
const black = 0x000000FF;

var args = process.argv.slice(2);

let fileName = args[0]
if (!fileName) {
    console.log("Source pixel art file is mandatory")
    process.exit(1)
}

let outputFile = args[1]
if (!outputFile) {
    console.log("Target shape coordinates file is mandatory")
    process.exit(1)
}


Jimp.read(fileName)
    .then(pixelart => {
        if (pixelart.getHeight() != imgh) {
            console.log("Image height is not valid, must be " + imgh)
            process.exit(1)
        }
        if (pixelart.getWidth() != imgw) {
            console.log("Image width is not valid, must be " + imgh)
            process.exit(1)
        }

        let shapeCoordinates = []
        for (var x = 0; x < imgw; x++) {
            for (var y = 0; y < imgh; y++) {
                let pixelcolor = pixelart.getPixelColor(x, y)
                // console.log(pixelcolor)
                if (pixelcolor === black){
                    shapeCoordinates.push({x: x, y: y})
                }
            }   
        }

        fs.writeFileSync(outputFile, JSON.stringify({shape: shapeCoordinates}))

    })
    .catch(err => {
        console.error(err);
    });