if (!window.gameCore) window.gameCore = {};
window.gameCore.currentGame = 'grandprix';

let gpCanvas;
let gpCtx;

const lanesY = [50, 100, 150];
const laneHeight = 30;

const playerGP = {
    x: 50,
    lane: 1,
    width: 20,
    height: 30,
    speed: 5, // acceleration rate
    velocity: 2 // 1-10
};

let gpObstacles = [];
let gpGameState = 'start';
let distance = 0;

function gpResizeCanvas() {
    // fixed size for simplicity
    gpCanvas.width = 600;
    gpCanvas.height = 200;
}

function spawnGpObstacle() {
    if (Math.random() < 0.05) {
        const lane = Math.floor(Math.random() * 3);
        gpObstacles.push({ type: 'car', x: gpCanvas.width + 20, lane, width: 20, height: 30 });
    } else if (Math.random() < 0.02) {
        const lane = Math.floor(Math.random() * 3);
        gpObstacles.push({ type: 'grease', x: gpCanvas.width + 20, lane, width: 15, height: 15 });
    } else if (!currentTunnel && Math.random() < 0.01) {
        // start tunnel
        currentTunnel = true;
        tunnelLength = 200;
    }
}

let currentTunnel = false;
let tunnelLength = 0;

function updateGpObstacles() {
    gpObstacles.forEach((o) => {
        o.x -= playerGP.velocity + 2;
    });
    gpObstacles = gpObstacles.filter(o => o.x + o.width > 0);
    if (currentTunnel) {
        tunnelLength -= playerGP.velocity + 2;
        if (tunnelLength <= 0) currentTunnel = false;
    }
}

function checkGpCollisions() {
    gpObstacles.forEach((o) => {
        if (o.lane === playerGP.lane && o.x < playerGP.x + playerGP.width && o.x + o.width > playerGP.x) {
            if (o.type === 'car') {
                playerGP.velocity = 2;
            } else if (o.type === 'grease') {
                if (playerGP.lane === 0) playerGP.lane = 1; else if (playerGP.lane === 2) playerGP.lane = 1; else playerGP.lane += Math.random() < 0.5 ? -1 : 1;
            }
        }
    });

    if (playerGP.lane < 0) { playerGP.lane = 0; playerGP.velocity = Math.max(2, playerGP.velocity - 2); }
    if (playerGP.lane > 2) { playerGP.lane = 2; playerGP.velocity = Math.max(2, playerGP.velocity - 2); }

    if (currentTunnel && playerGP.lane !== 1) {
        playerGP.velocity = Math.max(2, playerGP.velocity - 2);
    }
}

function gpDraw() {
    gpCtx.fillStyle = '#333';
    gpCtx.fillRect(0,0,gpCanvas.width,gpCanvas.height);

    // lanes
    gpCtx.strokeStyle = '#777';
    gpCtx.setLineDash([5,5]);
    for (let i=0;i<lanesY.length;i++) {
        gpCtx.beginPath();
        gpCtx.moveTo(0, lanesY[i]);
        gpCtx.lineTo(gpCanvas.width, lanesY[i]);
        gpCtx.stroke();
    }
    gpCtx.setLineDash([]);

    if (currentTunnel) {
        gpCtx.fillStyle = '#555';
        gpCtx.fillRect(0, lanesY[1]-laneHeight/2, gpCanvas.width, laneHeight);
    }

    // obstacles
    gpObstacles.forEach(o => {
        if (o.type === 'car') gpCtx.fillStyle = '#f00';
        else if (o.type === 'grease') gpCtx.fillStyle = '#222';
        gpCtx.fillRect(o.x, lanesY[o.lane]-o.height/2, o.width, o.height);
    });

    // player
    gpCtx.fillStyle = '#0f0';
    gpCtx.fillRect(playerGP.x, lanesY[playerGP.lane]-playerGP.height/2, playerGP.width, playerGP.height);
}

function gpUpdate() {
    if (gpGameState !== 'playing') return;
    distance += playerGP.velocity;
    if (playerGP.velocity < 10) playerGP.velocity += 0.02; // slow acceleration
    spawnGpObstacle();
    updateGpObstacles();
    checkGpCollisions();
}

const gpSketch = (p) => {
    p.setup = () => {
        const p5Canvas = p.createCanvas(600, 200);
        p5Canvas.parent('gameContainer');
        p5Canvas.id('gameCanvas');
        gpCanvas = p5Canvas.elt;
        gpCtx = gpCanvas.getContext('2d');
        gpResizeCanvas();
        gpGameState = 'playing';
    };
    p.draw = () => {
        gpUpdate();
        gpDraw();
    };
};

window.initGrandPrix = function() {
    new p5(gpSketch);
};
