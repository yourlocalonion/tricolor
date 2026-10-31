// ABANDON ALL HOPE (FOR CLEAN CODE)
// YE WHO ENTER HERE

const drawingCanvas = document.getElementById("drawingCanvas") as HTMLCanvasElement
if (!drawingCanvas) {
    throw Error("Canvas not found!")
}

const debugCanvas = document.getElementById("debugCanvas") as HTMLCanvasElement
if (!debugCanvas) {
    throw Error("Debug canvas not found!")
}

const drawingContext = drawingCanvas.getContext("2d")
if (!drawingContext) {
    throw Error("Canvas context cant be retrieved!")
}

const debugContext = debugCanvas.getContext("2d")
if (!debugContext) {
    throw Error("Canvas context cant be retrieved!")
}

drawingContext.imageSmoothingEnabled = false
drawingContext.lineWidth = 4

debugContext.imageSmoothingEnabled = false

// init debug context
const debugRect = debugCanvas.getBoundingClientRect()
debugCanvas.width = debugRect.width
debugCanvas.height = debugRect.height

let isMouseHeld = false
let isPanning = false
let isHoldingRotate = false
let isRotating = false

let currentMouseScreenPoint = new DOMPoint(0, 0) // screen
let lastMouseScreenPoint = new DOMPoint(0, 0) // screen
let offsetScreenPoint = new DOMPoint(0, 0) // screen
let pivotCanvasPoint = new DOMPoint(drawingCanvas.clientWidth / 2, drawingCanvas.clientHeight / 2) // canvas

// initial set
const rect = drawingCanvas.getBoundingClientRect()
let canvasOrigin = new DOMPoint(rect.left, rect.top)
let canvasMatrix = new DOMMatrix()

function toDegrees(rad: number): number {
    return rad * (180 / Math.PI)
}

function screenToCanvasSpace(x: number, y: number) {
    return new DOMPoint(x - canvasOrigin.x, y - canvasOrigin.y).matrixTransform(canvasMatrix.inverse())
}

function canvasToScreenSpace(x: number, y: number) {
    const point = new DOMPoint(x, y).matrixTransform(canvasMatrix)
    return new DOMPoint(
        point.x + canvasOrigin.x,
        point.y + canvasOrigin.y
    )
}

function getScreenSpacePivot() {
    return pivotCanvasPoint.matrixTransform(canvasMatrix)
}

function applyTransforms() {
    drawingCanvas.style.transformOrigin = "0 0"
    drawingCanvas.style.transform = canvasMatrix.toString()
}

function rotateCanvas(angle: number) {
    const pivotX = pivotCanvasPoint.x
    const pivotY = pivotCanvasPoint.y

    canvasMatrix.translateSelf(pivotX, pivotY)
    canvasMatrix.rotateSelf(angle)
    canvasMatrix.translateSelf(-pivotX, -pivotY)

    applyTransforms()
}

function scaleCanvas(scale: number) {
    const pivotX = pivotCanvasPoint.x
    const pivotY = pivotCanvasPoint.y

    canvasMatrix.translateSelf(pivotX, pivotY)
    canvasMatrix.scaleSelf(scale)
    canvasMatrix.translateSelf(-pivotX, -pivotY)

    applyTransforms()
}

function drawDebugStuff() {
    // clear rect
    debugContext.clearRect(
        0,
        0,
        debugCanvas.width,
        debugCanvas.height
    )

    const pivotScreenPoint = canvasToScreenSpace(pivotCanvasPoint.x, pivotCanvasPoint.y)

    if (isHoldingRotate) {
        debugContext.beginPath()
        debugContext.moveTo(pivotScreenPoint.x, pivotScreenPoint.y)
        debugContext.lineTo(currentMouseScreenPoint.x, currentMouseScreenPoint.y)
        debugContext.stroke()
    }
}

function onPointerDown(ev: PointerEvent) {
    console.log("down")
    isMouseHeld = true

    lastMouseScreenPoint.x = ev.clientX
    lastMouseScreenPoint.y = ev.clientY

    if (isPanning) {
        const rect = drawingCanvas.getBoundingClientRect()

        offsetScreenPoint.x = rect.left - ev.clientX
        offsetScreenPoint.y = rect.top - ev.clientY
    }

    if (isHoldingRotate) {
        isRotating = true
    }
    drawDebugStuff()
}

function onPointerUp() {
    console.log("up")
    isMouseHeld = false
    
    if (isRotating) {
        isRotating = false
    }
    drawDebugStuff()
}

function onPointerMove(ev: PointerEvent) {
    const x = ev.clientX
    const y = ev.clientY
    currentMouseScreenPoint.x = x
    currentMouseScreenPoint.y = y

    const dx = x - lastMouseScreenPoint.x
    const dy = y - lastMouseScreenPoint.y

    // panning
    if (isPanning) {
        canvasMatrix.e += dx
        canvasMatrix.f += dy
        applyTransforms()
    }

    // rotating
    if (isRotating) {
        const pivot = getScreenSpacePivot()

        const previousAngle = Math.atan2(lastMouseScreenPoint.y - pivot.y, lastMouseScreenPoint.x - pivot.x)
        const currentAngle = Math.atan2(y - pivot.y, x - pivot.x)

        let delta = currentAngle - previousAngle
        if (delta > Math.PI) delta -= 2 * Math.PI
        if (delta < -Math.PI) delta += 2 * Math.PI

        rotateCanvas(toDegrees(delta))
    }

    // drawing
    if (isMouseHeld && !isPanning && !isRotating) {
        const previous = screenToCanvasSpace(lastMouseScreenPoint.x, lastMouseScreenPoint.y)
        const current = screenToCanvasSpace(x, y)

        drawingContext.beginPath()
        drawingContext.moveTo(previous.x, previous.y)
        drawingContext.lineTo(current.x, current.y)
        drawingContext.stroke()
    }

    lastMouseScreenPoint.x = x
    lastMouseScreenPoint.y = y
    drawDebugStuff()
}

function onKeyDown(ev: KeyboardEvent) {
    if (ev.key == " " && !ev.repeat) {
        isPanning = true
    }

    if (ev.key == "r" && !ev.repeat) {
        pivotCanvasPoint = screenToCanvasSpace(
            currentMouseScreenPoint.x,
            currentMouseScreenPoint.y
        )

        isHoldingRotate = true
    }
    drawDebugStuff()
}

function onKeyUp(ev: KeyboardEvent) {
    if (ev.key == " ") {
        isPanning = false
    }

    if (ev.key == "r") {
        isHoldingRotate = false
        isRotating = false
    }
    drawDebugStuff()
}

function onWheel(ev: WheelEvent) {
    const scrollDirection = Math.min(1, Math.max(-1, ev.deltaY))
    const scrollAmount = 0.1
    const finalScroll = 1 - (scrollDirection * scrollAmount)

    pivotCanvasPoint = screenToCanvasSpace(
        currentMouseScreenPoint.x,
        currentMouseScreenPoint.y
    )

    console.log(finalScroll)
    scaleCanvas(finalScroll)
}

document.addEventListener("pointerdown", onPointerDown)
document.addEventListener("pointerup", onPointerUp)
document.addEventListener("pointermove", onPointerMove)
document.addEventListener("keydown", onKeyDown)
document.addEventListener("keyup", onKeyUp)
document.addEventListener("wheel", onWheel)