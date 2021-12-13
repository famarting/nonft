
const faceShape = require("./resources/output-shape.json")
const debug = false

const Jimp = require('jimp');
const classifyPoint = require("robust-point-in-polygon")

//constants

//image
const imgw = 64;
const imgh = 64;

//eyes
const eyesStartPoint = [
    {x: 34, y: 31},
    {x: 26, y: 31}
]

//mouth 
const mouthStartPoint = {x: 27, y: 41}
const maxMouthHeight = 10;
const maxMouthWidth = 16;

//hair
const curlyHairPopulation = 15/100;
const normalHairPopulation = 95/100;

//colors
const colorsDiffFactor = 0; //TODO investigate
const black = 0x000000FF;
const white = 0xFFFFFFFF;

const eyeColor = white;
const [faceColor, backgroundColor, mouthColor, hairColor, bodyColor] = randomColors(5)

// random utilities
function randomColor() {
    return Math.random() * 0x100000000;
}

function randomNewColor(currentColors) {
    let newColor = 0xFFFFFFFF
    do {
        newColor = randomColor()
    } while (currentColors.includes(newColor) && isAnyClose(currentColors, newColor, colorsDiffFactor));
    console.log("Random new color is " + newColor)
    return newColor;
}

function isAnyClose(colors, testColor, factor) {
    for (const color of colors) {
        let diff = color - testColor;
        let adiff = diff < 0 ? diff * -1 : diff;
        if (adiff <= factor) {
            return true;
        }
    }
    return false;
}

function randomColors(num) {
    let colors = []
    for (var i = 0; i<num; i++) {
        colors.push(randomNewColor([black, white].concat(colors)))
    }
    return colors;
}

function randomBoolean() {
    return Math.random() < 0.5;
}

//

function writeImage(config) {

    Jimp.create(imgw, imgh, backgroundColor).then(image => {
    
        config.layers.forEach(layer => {
            console.log("Writing layer " + layer.id)
            layer.shapes.forEach(shape => {
                if (shape.coordinates.length == 0 || shape.disabled) {
                    return;
                }
                let polygon = []
                shape.coordinates.forEach(coord => {
                    if (coord.x < 0 || coord.x >= imgw) {
                        console.log("coordinate out of bounds")
                        process.exit(1)
                    }
                    if (coord.y < 0 || coord.y >= imgh) {
                        console.log("coordinate out of bounds")
                        process.exit(1)
                    }
                    polygon.push([coord.x, coord.y]);
                    paintPixel(image, shape.color, coord.x, coord.y);
                });
                if (shape.fill) {
                    if (debug) console.log("Polygon is " + polygon)
                    for (var x = 0; x < imgw; x++) {
                        for (var y = 0; y < imgh; y++) {
                            let classification = classifyPoint(polygon, [x, y]);
                            if (debug) console.log("Point " + [x, y] + " classification is " + classification)
                            let target = shape.oppositeFill ? -1 : 0;
                            if (classification === target) {
                                paintPixel(image, shape.color, x, y)
                            }
                        }   
                    }
                }
            });
        });

        image.opaque()
      
        console.log("Writing output png")
        image.write('output/nonft.png', (err) => {
            if (err) throw err;
        });
    })

}

function paintPixel(image, color, x, y) {
    if (debug) {
        console.log("painting " + [x, y])
    }
    image.setPixelColor(color, x, y)
}

function isCircleBorder(circleCenter, circleRadius, point) {
    //pythagorean theorem https://i.ytimg.com/vi/wzQstigxbuo/maxresdefault.jpg
    xsub2 = Math.pow(circleCenter.x - point.x , 2)
    ysub2 = Math.pow(circleCenter.y - point.y , 2)
    subsSum = Math.floor(xsub2 + ysub2);

    radius2 = Math.floor(Math.pow(circleRadius, 2));
    return radius2 === subsSum
        || (radius2 - 1) === subsSum 
        || (radius2 + 1) === subsSum
        || (radius2 + 2) === subsSum;
}

function findTopRight(coordinates) {
    let max = null;
    for (const point of coordinates) {
        if (max == null) {
            max = point;
        }
        if (point.x >= max.x && point.y <= max.y) {
            max = point;
        }
    }
    return max;
}

function findBottomRight(coordinates) {
    let max = null;
    for (const point of coordinates) {
        if (max == null) {
            max = point;
        }
        if (point.x >= max.x && point.y >= max.y) {
            max = point;
        }
    }
    return max;
}

function findTopLeft(coordinates) {
    let max = null;
    for (const point of coordinates) {
        if (max == null) {
            max = point;
        }
        if (point.x <= max.x && point.y <= max.y) {
            max = point;
        }
    }
    return max;
}

function findBottomLeft(coordinates) {
    let max = null;
    for (const point of coordinates) {
        if (max == null) {
            max = point;
        }
        if (point.x <= max.x && point.y >= max.y) {
            max = point;
        }
    }
    return max;
}

function createHorizontalLine(a, b) {
    if (a.y !== b.y) {
        console.log("points not in same y coordinate")
        process.exit(1)
    }
    let start = Math.min(a.x, b.x)
    let finish = Math.max(a.x, b.x)

    let dots = finish - start

    let line = []
    for (let i = 1; i <= dots; i++) {
        line.push({x: (start + i), y: a.y});
    }
    return line;
}

function createVerticalLine(a, b) {
    if (a.x !== b.x) {
        console.log("points not in same x coordinate")
        process.exit(1)
    }
    let start = Math.min(a.y, b.y)
    let finish = Math.max(a.y, b.y)

    let dots = finish - start

    let line = []
    for (let i = 1; i <= dots; i++) {
        line.push({x: a.x, y: (start + i)});
    }
    return line;
}

function buildLayer(id) {
    return {id, shapes:[]}
}

// image layers setup

let layers = []

//

let faceLayer = buildLayer("face")
faceLayer.shapes.push({
    coordinates: faceShape.shape,
    color: faceColor,
    fill: true
})
layers.push(faceLayer)

//

let eyesLayer = buildLayer("eyes")
layers.push(eyesLayer)

let randomEyeCenter = {
    x: Math.ceil(Math.random() * 6),
    y: Math.ceil(Math.random() * 6),
}

let eyesContext = []
eyesStartPoint.forEach(startPoint => {
    eyesContext.push({ eyeCenter: {x: randomEyeCenter.x + startPoint.x, y: randomEyeCenter.y + startPoint.y}, coordinates: [] })
});

let randomEyeRadius = Math.ceil((Math.random() * 2) + 1)

for (var x = 0; x < imgw; x++) {
    for (var y = 0; y < imgh; y++) {
        eyesContext.forEach(eyeCtx => {
            if (isCircleBorder(eyeCtx.eyeCenter, randomEyeRadius, {x, y})) {
                eyeCtx.coordinates.push({x, y})
            }
        })
    }
}

eyesContext.forEach(eyeCtx => {
    eyesLayer.shapes.push({
        //eye white
        color: eyeColor,
        fill: true,
        coordinates: eyeCtx.coordinates
    },
    {
        //eye border
        color: black,
        fill: false,
        coordinates: eyeCtx.coordinates
    });
})

if (randomEyeRadius > 1) {
    let randomPupilCoords = {
        x: Math.ceil(Math.random()) * (randomBoolean() ? -1 : 1),
        y: Math.floor(Math.random()) * (randomBoolean() ? -1 : 1),
    }
    eyesContext.forEach(eyeCtx => {
        let pupilCenter = {
            x: randomPupilCoords.x + eyeCtx.eyeCenter.x,
            y: randomPupilCoords.y + eyeCtx.eyeCenter.y
        }
        eyesLayer.shapes.push({
            //pupil
            color: black,
            fill: false,
            coordinates: [pupilCenter]
        });
    });
}

//

let mouthLayer = buildLayer("mouth")
layers.push(mouthLayer)

let randomMouthStartCenter = {
    x: Math.floor(Math.random() * (maxMouthWidth/2)),
    y: Math.ceil(Math.random() * maxMouthHeight),
}
let randomMouthEndCenter = {
    x: Math.ceil(Math.random() * (maxMouthWidth/2)),
    y: randomMouthStartCenter.y
}

let mouthSideRadius = Math.min(randomMouthStartCenter.x,
            ((maxMouthWidth/2) - randomMouthEndCenter.x),
            randomMouthStartCenter.y,
            (maxMouthHeight - randomMouthStartCenter.y),
            3 )//radius 4 causes trouble, swap to 3 in that case
console.log("mouth radius is " + mouthSideRadius)
let randomMouthStartPointCenter = {
    x: mouthStartPoint.x + randomMouthStartCenter.x,
    y: mouthStartPoint.y + randomMouthStartCenter.y,
}
let randomMouthEndPointCenter = {
    x: randomMouthStartPointCenter.x + (maxMouthWidth/2),
    y: randomMouthStartPointCenter.y
}

let mouthLeftSideCoordinates = []
let mouthRightSideCoordinates = []

for (var x = 0; x < imgw; x++) {
    for (var y = 0; y < imgh; y++) {

        if (isCircleBorder(randomMouthStartPointCenter, mouthSideRadius, {x, y})) {
            //now only print left side of the circle
            if (x <= randomMouthStartPointCenter.x) {
                mouthLeftSideCoordinates.push({x, y})
            }
        }
        if (isCircleBorder(randomMouthEndPointCenter, mouthSideRadius, {x, y})) {
            //now only print right side of the circle
            if (x >= randomMouthEndPointCenter.x) {
                mouthRightSideCoordinates.push({x, y})
            }
        }

    }
}

let mouthLeftSideTop = findTopRight(mouthLeftSideCoordinates)
let mouthLeftSideBottom = findBottomRight(mouthLeftSideCoordinates)

let mouthRightSideTop = findTopLeft(mouthRightSideCoordinates)
let mouthRightSideBottom = findBottomLeft(mouthRightSideCoordinates)

let mouthTopLine = createHorizontalLine(mouthLeftSideTop, mouthRightSideTop)
let mouthBottomLine = createHorizontalLine(mouthLeftSideBottom, mouthRightSideBottom)

let mouthBorder = []
mouthBorder = mouthBorder.concat(mouthLeftSideCoordinates, mouthTopLine, mouthRightSideCoordinates, mouthBottomLine)

mouthLayer.shapes.push({
    //lips
    color: mouthColor,
    fill: mouthSideRadius <= 1,
    oppositeFill: true,
    coordinates: mouthBorder
});

if (mouthSideRadius <= 1) {
    let mothLeftLine = createVerticalLine(mouthLeftSideTop, mouthLeftSideBottom)
    let mothRightLine = createVerticalLine(mouthRightSideTop, mouthRightSideBottom)
    let mouthSquare = []
    mouthSquare = mouthSquare.concat(mothLeftLine, mouthTopLine, mothRightLine, mouthBottomLine)
    mouthLayer.shapes.push({
        //mouth fill
        color: mouthColor,
        fill: true,
        oppositeFill: true,
        coordinates: mouthSquare
    })
}

//

let hairLayer = buildLayer("hair")
layers.push(hairLayer)

const randomHairAreaSize = 6;
const randomHairStartPoints = [
    {x: 37, y: 22},
    {x: 35, y: 20},
    {x: 34, y: 21},
    {x: 31, y: 20},
    {x: 29, y: 21},
    {x: 26, y: 20},
    {x: 23, y: 19},
    {x: 19, y: 22},
    {x: 17, y: 20},
    {x: 17, y: 24},
    {x: 15, y: 23},
    {x: 14, y: 28},
    {x: 14, y: 32},
    {x: 13, y: 34},
]
const initialHairGrowthProbability = 2; //200%
const hairGrowthProbabilityDecrease = 0.00000000001;

function addHair(hair, current) {
    return addHair(hair, current, initialHairGrowthProbability, {x:0,y:0})
}

function addHair(hair, current, growthProbability, prevMove) {
    if (Math.random() <= growthProbability){
        let move = null;
        do {
            move = {
                x: Math.ceil(Math.random()) * (randomBoolean() ? -1 : 1),
                y: Math.floor(Math.random()) * (randomBoolean() ? -1 : 1),
            }
        } while ((move.x - prevMove.x === 0) && (move.y - prevMove.y === 0))

        let newPoint = {
            x: current.x + move.x,
            y: current.y + move.y
        }
        hair.push(newPoint)
        return addHair(hair, newPoint, growthProbability - hairGrowthProbabilityDecrease, move)
    }
    return hair;
}

function addCurls(hair, start) {
    let sidecurl = randomBoolean();
    let sidecurldirection = randomBoolean() ? -1 : 1;
    let curlLength = (Math.random() * 7) + 1;
    let current = start;
    for (var i=1; i <= curlLength; i++) {
        let direction
        if (sidecurl) {
            direction = sidecurldirection;
        } else {
            direction = i%2 !== 0 ? -1 : 1;
        }
        let newdot = {
            x: current.x + direction,
            y: current.y + 1
        }
        current = newdot;
        hair.push(newdot);
    }
    return hair;
}

let curly = randomBoolean();

let hairsNum = (curly ? curlyHairPopulation : normalHairPopulation) * ((randomHairAreaSize * randomHairAreaSize))

let hair = []
randomHairStartPoints.forEach(start => {

    for (var i=0; i < hairsNum; i++) {
        let hairStart = {
            x: (Math.random() * randomHairAreaSize) + start.x,
            y: (Math.random() * randomHairAreaSize) + start.y
        }
        hair.push(hairStart)
        if (curly) {
            hair = addCurls(hair, hairStart)
        } else {
            hair = addHair(hair, hairStart)
        }
    }
    
});

hairLayer.shapes.push({
    //hair
    color: hairColor,
    fill: false,
    coordinates: hair
})

//

writeImage({layers})