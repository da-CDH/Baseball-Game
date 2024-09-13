// Variables
let ball = document.getElementById('ball');
let flipper = document.getElementById('flipper');
let strikeCounter = document.getElementById('strikeCounter');
let scoreCounter = document.getElementById('scoreCounter');

let gravity = 0.1; // Adjusted gravity for higher frame rate
let velocity = { x: 0, y: 0 };
let strikes = 0;
let runs = 0;
let ballIsInPlay = false;
let flipperAngle = -45; // Starting angle pointing downwards

// Base Tracker variables
let bases = {
    first: false,
    second: false,
    third: false
};

function spawnBall() {
    let delay = Math.floor(Math.random() * (6 - 3 + 1)) + 3;
    setTimeout(() => {
        resetBallPosition();
        ballIsInPlay = true;
    }, delay * 1000);
}

function resetBallPosition() {
    let boardRect = document.querySelector('.game-board').getBoundingClientRect();
    let ballWidth = ball.offsetWidth;
    let ballHeight = ball.offsetHeight;
    ball.style.left = `${(boardRect.width / 2.06) - (ballWidth / 2.06)}px`;
    ball.style.top = `${(boardRect.height / 3) - (ballHeight / 3)}px`; // Adjusted initial position
    velocity = { x: 0, y: 0 };
}

function gameLoop() {
    if (ballIsInPlay) {
        moveBall();
        checkCollisions();
        checkFlipperCollision();
        checkIfOutOfBounds();
    }
    updateFlipper(); // Update flipper rotation
}

function moveBall() {
    velocity.y += gravity;
    let newTop = parseFloat(ball.style.top) + velocity.y;
    let newLeft = parseFloat(ball.style.left) + velocity.x;
    let boardRect = document.querySelector('.game-board').getBoundingClientRect();
    let ballWidth = ball.offsetWidth;
    let ballHeight = ball.offsetHeight;

    if (newLeft <= 0 || newLeft + ballWidth >= boardRect.width) {
        velocity.x *= -1;
        newLeft = newLeft <= 0 ? 0 : boardRect.width - ballWidth;
    }

    if (newTop <= 0) {
        velocity.y *= -1;
        newTop = 0;
    }

    ball.style.top = `${newTop}px`;
    ball.style.left = `${newLeft}px`;
}

function checkCollisions() {
    let ballRect = ball.getBoundingClientRect();

    document.querySelectorAll('.hole').forEach(hole => {
        let holeRect = hole.getBoundingClientRect();
        if (checkHoleCollision(ballRect, holeRect)) {
            ballIsInPlay = false;
            let baseValue;
            if (hole.classList.contains('home-run')) {
                baseValue = 4;
            } else if (hole.classList.contains('third-base-left') || hole.classList.contains('third-base-right')) {
                baseValue = 3;
            } else if (hole.classList.contains('second-base-left') || hole.classList.contains('second-base-right')) {
                baseValue = 2;
            } else if (hole.classList.contains('first-base-left') || hole.classList.contains('first-base-right')) {
                baseValue = 1;
            } else {
                baseValue = 0;
            }
            advanceRunners(baseValue);
            setTimeout(() => {
                resetBallPosition();
                spawnBall();
            }, 1000);
        }
    });
}

function checkHoleCollision(ballRect, holeRect) {
    let dx = (ballRect.left + ballRect.width / 2) - (holeRect.left + holeRect.width / 2);
    let dy = (ballRect.top + ballRect.height / 2) - (holeRect.top + holeRect.height / 2);
    let distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (ballRect.width / 2 + holeRect.width / 2);
}

function checkIfOutOfBounds() {
    let ballRect = ball.getBoundingClientRect();
    let boardRect = document.querySelector('.game-board').getBoundingClientRect();

    if (ballRect.bottom > boardRect.bottom) {
        countStrike();
        ballIsInPlay = false;
        setTimeout(() => {
            resetBallPosition();
            spawnBall();
        }, 1000);
    }
}

function countStrike() {
    strikes++;
    if (strikes >= 3) {
        strikes = 0;
        runs = 0;
        bases.first = false;
        bases.second = false;
        bases.third = false;
        updateAllBasesVisual();
        scoreCounter.textContent = `Runs: ${runs}`;
        alert('3 Strikes! The game has been reset.');
    }
    strikeCounter.textContent = `Strikes: ${strikes}`;
}

function checkFlipperCollision() {
    let ballRect = ball.getBoundingClientRect();

    // Get previous and current flipper angles
    let prevFlipperAngle = flipperAngle - (isFlipperActive ? flipperSpeed : -flipperReturnSpeed); // Previous angle before update
    let steps = Math.ceil(Math.abs(flipperSpeed) / 2); // Adjust as needed

    for (let i = 0; i <= steps; i++) {
        let interpolatedAngle = prevFlipperAngle + (flipperAngle - prevFlipperAngle) * (i / steps);

        let flipperRect = flipper.getBoundingClientRect();

        let flipperX1 = flipperRect.left;
        let flipperY1 = flipperRect.top + flipperRect.height / 2;
        let flipperX2 = flipperRect.right;
        let flipperY2 = flipperRect.top + flipperRect.height / 2;

        let angle = interpolatedAngle * (Math.PI / 180);
        let centerX = (flipperX1 + flipperX2) / 2;
        let centerY = (flipperY1 + flipperY2) / 2;

        let rotatedX1 = centerX + (flipperX1 - centerX) * Math.cos(angle) - (flipperY1 - centerY) * Math.sin(angle);
        let rotatedY1 = centerY + (flipperX1 - centerX) * Math.sin(angle) + (flipperY1 - centerY) * Math.cos(angle);
        let rotatedX2 = centerX + (flipperX2 - centerX) * Math.cos(angle) - (flipperY2 - centerY) * Math.sin(angle);
        let rotatedY2 = centerY + (flipperX2 - centerX) * Math.sin(angle) + (flipperY2 - centerY) * Math.cos(angle);

        // Check collision
        if (lineCircleCollide(rotatedX1, rotatedY1, rotatedX2, rotatedY2,
            ballRect.left + ballRect.width / 2, ballRect.top + ballRect.height / 2, ballRect.width / 2)) {
            hitBall();
            break; // Exit loop if collision is detected
        }
    }
}

function lineCircleCollide(x1, y1, x2, y2, cx, cy, radius) {
    // Line segment length squared
    let dx = x2 - x1;
    let dy = y2 - y1;
    let lenSq = dx * dx + dy * dy;

    // Projection factor
    let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;

    t = Math.max(0, Math.min(1, t));

    // Closest point on the line segment
    let closestX = x1 + t * dx;
    let closestY = y1 + t * dy;

    // Distance from circle center to closest point
    dx = closestX - cx;
    dy = closestY - cy;
    let distanceSq = dx * dx + dy * dy;

    return distanceSq <= radius * radius;
}

function hitBall() {
    // Get flipper angle in radians
    let angle = flipperAngle * (Math.PI / 180);

    // Calculate normal vector of the flipper
    let normal = {
        x: Math.sin(angle),
        y: -Math.cos(angle)
    };

    // Normalize the normal vector
    let magnitude = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
    normal.x /= magnitude;
    normal.y /= magnitude;

    // Calculate dot product of ball velocity and normal
    let dotProduct = velocity.x * normal.x + velocity.y * normal.y;

    // Reflect the ball's velocity
    velocity.x = velocity.x - 2 * dotProduct * normal.x;
    velocity.y = velocity.y - 2 * dotProduct * normal.y;

    // Increase the ball's speed to simulate the flipper's impact
    let speedIncrease = 5; // Adjust this value as needed
    velocity.x += normal.x * speedIncrease;
    velocity.y += normal.y * speedIncrease;
}

// Flipper control variables
let isFlipperActive = false;
let flipperSpeed = 5; // Positive rotation speed when swinging upwards
let flipperReturnSpeed = 5; // Positive rotation speed when returning to starting position
let flipperMaxAngle = 45; // Swing upwards to 45 degrees

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isFlipperActive) {
        e.preventDefault();
        isFlipperActive = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        isFlipperActive = false;
    }
});

function updateFlipper() {
    if (isFlipperActive) {
        if (flipperAngle < flipperMaxAngle) {
            flipperAngle += flipperSpeed;
            if (flipperAngle > flipperMaxAngle) flipperAngle = flipperMaxAngle;
        }
    } else {
        if (flipperAngle > -45) {
            flipperAngle -= flipperReturnSpeed; // Return to starting position
            if (flipperAngle < -45) flipperAngle = -45; // Prevent over-rotation
        }
    }
    flipper.style.transform = `translateX(-50%) rotate(${flipperAngle}deg)`;
}

function advanceRunners(baseValue) {
    // Array representing the bases: [first, second, third]
    let newBases = [false, false, false];
    let runsScored = 0;

    // Advance runners already on base
    if (bases.third) {
        if (baseValue >= 1) {
            runsScored++;
            bases.third = false;
        } else {
            newBases[2] = true;
        }
    }
    if (bases.second) {
        let advancement = baseValue;
        if (advancement >= 2) {
            runsScored++;
            bases.second = false;
        } else {
            let newBaseIndex = advancement + 1;
            if (newBaseIndex < 3) {
                newBases[newBaseIndex] = true;
            } else {
                runsScored++;
            }
            bases.second = false;
        }
    }
    if (bases.first) {
        let advancement = baseValue;
        if (advancement >= 3) {
            runsScored++;
            bases.first = false;
        } else {
            let newBaseIndex = advancement;
            if (newBaseIndex < 3) {
                newBases[newBaseIndex] = true;
            } else {
                runsScored++;
            }
            bases.first = false;
        }
    }

    // Batter becomes a runner
    if (baseValue === 4) {
        // Home run
        runsScored++;
        // Score runs for all runners on base
        if (bases.first) runsScored++;
        if (bases.second) runsScored++;
        if (bases.third) runsScored++;
        bases.first = bases.second = bases.third = false;
    } else if (baseValue >= 1) {
        newBases[baseValue - 1] = true;
    }

    // Update bases
    bases.first = newBases[0];
    bases.second = newBases[1];
    bases.third = newBases[2];

    runs += runsScored;
    updateAllBasesVisual();
    scoreCounter.textContent = `Runs: ${runs}`;
}

function updateBaseVisual(baseId) {
    let baseElement = document.getElementById(baseId);
    baseElement.style.backgroundColor = bases[baseId] ? 'black' : 'white';
}

function updateAllBasesVisual() { 
    updateBaseVisual('first');
    updateBaseVisual('second');
    updateBaseVisual('third');
}

// Initialize the game loop once
setInterval(gameLoop, 10); // Start the game loop

// Start the game by spawning the first ball
spawnBall();
