// --- Configurações Iniciais ---
if (!window.gameCore) window.gameCore = {};
window.gameCore.currentGame = 'riverraid';
let canvas;
let ctx;

// Ajustar tamanho do canvas dinamicamente
function resizeCanvas() {
    const viewportHeight = window.innerHeight;
    const topBarHeight = document.querySelector('.game-info').offsetHeight + 20; // 20 para margem
    const controlsInfoHeight = document.querySelector('.controls-info').offsetHeight + 20;
    const availableHeight = viewportHeight - topBarHeight - controlsInfoHeight - 40; // 40 para padding/margens extras

    const aspectRatio = 3 / 4;
    let newWidth = Math.min(600, window.innerWidth * 0.9); // Max 600px ou 90% da largura
    let newHeight = newWidth / aspectRatio;

    if (newHeight > availableHeight) {
        newHeight = availableHeight;
        newWidth = newHeight * aspectRatio;
    }
    
    canvas.width = Math.floor(newWidth); // Usar Math.floor para evitar subpixels
    canvas.height = Math.floor(newHeight);

    // Redesenhar elementos se o jogo estiver rodando
    if (gameState === 'playing') {
         // Exemplo: player.x = canvas.width / 2 - player.width / 2; (se precisar recentralizar)
    }
}


// Elementos da UI
const scoreDisplay = document.getElementById('score');
const fuelDisplay = document.getElementById('fuel');
const livesDisplay = document.getElementById('lives');
const messageOverlay = document.getElementById('messageOverlay');
const messageText = document.getElementById('messageText');
const restartButton = document.getElementById('restartButton');

// --- Estado do Jogo ---
let score = 0;
let fuel = 100;
let lives = 3;
let gameSpeed = 2; // Velocidade base do jogo (scroll)
let gameState = 'start'; // 'start', 'playing', 'paused', 'gameOver'
let gameTime = 0; // Contador de tempo para eventos

// --- Jogador ---
const player = {
    x: 0, // Definido em resetGame após criação do canvas
    y: 0, // Definido em resetGame após criação do canvas
    width: 30,
    height: 30,
    color: '#00ff00', // Verde para o avião
    speed: 5,
    dx: 0, // Velocidade horizontal
    dy: 0, // Velocidade vertical (para cima/baixo)
    shootCooldown: 0,
    maxBullets: 3,
    bullets: []
};

// --- Elementos do Cenário ---
const riverBanks = [];
const bankWidth = 50; // Largura visual das margens (usada para cálculos de spawn)
const riverPathVariation = 10; // Quão sinuoso o rio pode ser
let currentRiverCenter = 0; // Definido em resetGame após criação do canvas

// --- Inimigos, Combustível, Pontes ---
const enemies = [];
const fuelStations = [];
const bridges = []; // Ainda não implementado

// --- Sons (Tone.js) ---
const synth = new Tone.Synth().toDestination();
const metalSynth = new Tone.MetalSynth({
    frequency: 100,
    envelope: { attack: 0.001, decay: 0.1, release: 0.1 },
    harmonicity: 3.1,
    modulationIndex: 16,
    resonance: 2000,
    octaves: 0.5
}).toDestination();
metalSynth.volume.value = -15;

const noiseSynth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.005, decay: 0.05, sustain: 0 }
}).toDestination();
noiseSynth.volume.value = -10;

let audioContextStarted = false; // Flag para controlar o início do Tone.js

// --- Funções de Desenho ---
function drawPlayer() {
    ctx.fillStyle = player.color;

    // Fuselagem em formato de triângulo
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y - 6); // ponta do nariz
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.closePath();
    ctx.fill();

    // Cabine
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x + player.width / 2 - 3, player.y + player.height * 0.2, 6, 4);

    ctx.fillStyle = player.color;
    // Asas
    ctx.fillRect(player.x - player.width * 0.6, player.y + player.height * 0.5, player.width * 0.6, 4);
    ctx.fillRect(player.x + player.width, player.y + player.height * 0.5, player.width * 0.6, 4);

    // Cauda
    ctx.fillRect(player.x + player.width / 2 - 2, player.y + player.height - 1, 4, 8);
}

function drawBullet(bullet) {
    ctx.fillStyle = '#ffff00'; // Amarelo para balas
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
}

function drawRiverBanks() {
    ctx.fillStyle = '#386641'; // Verde escuro para as margens
    riverBanks.forEach(segment => {
        // Margem esquerda
        ctx.fillRect(0, segment.y, segment.leftBankX, segment.height);
        // Margem direita
        ctx.fillRect(segment.rightBankX, segment.y, canvas.width - segment.rightBankX, segment.height);
    });
}

function drawEnemy(enemy) {
    ctx.fillStyle = enemy.color;
    if (enemy.type === 'ship') {
        // casco
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y + enemy.height);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y);
        ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
        ctx.closePath();
        ctx.fill();

        // torre
        ctx.fillRect(enemy.x + enemy.width / 2 - 3, enemy.y - 6, 6, 6);
    } else if (enemy.type === 'helicopter') {
        ctx.beginPath();
        ctx.ellipse(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, enemy.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // hélices
        ctx.fillRect(enemy.x + enemy.width / 2 - 12, enemy.y - 4, 24, 3);
        ctx.fillRect(enemy.x - 4, enemy.y + enemy.height / 2 - 1, 8, 2);
    } else if (enemy.type === 'jet') {
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.width / 2, enemy.y);
        ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
        ctx.lineTo(enemy.x, enemy.y + enemy.height);
        ctx.closePath();
        ctx.fill();

        // asas
        ctx.fillRect(enemy.x - 6, enemy.y + enemy.height * 0.5, 6, 3);
        ctx.fillRect(enemy.x + enemy.width, enemy.y + enemy.height * 0.5, 6, 3);
    }
}

function drawFuelStation(station) {
    ctx.fillStyle = '#0077b6'; // Azul para posto de combustível
    ctx.fillRect(station.x, station.y, station.width, station.height);
    ctx.fillStyle = '#ffffff'; // 'F' de Fuel
    ctx.font = `${Math.floor(station.height * 0.6)}px Courier New`; // Usar Math.floor para fonte
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', station.x + station.width / 2, station.y + station.height / 2);
}

// --- Funções de Atualização ---
function updatePlayer() {
    // Movimento horizontal
    player.x += player.dx;
    // Movimento vertical
    player.y += player.dy;

    // Limitar movimento do jogador às bordas do rio (aproximado)
    const currentSegment = riverBanks.find(s => player.y + player.height > s.y && player.y < s.y + s.height);
    let minX = bankWidth / 2; 
    let maxX = canvas.width - player.width - bankWidth / 2; 

    if (currentSegment) {
        minX = currentSegment.leftBankX + 5; 
        maxX = currentSegment.rightBankX - player.width - 5;
    } else { 
        minX = 10;
        maxX = canvas.width - player.width - 10;
    }

    if (player.x < minX) player.x = minX;
    if (player.x > maxX) player.x = maxX;

    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;


    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    }

    player.bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        if (bullet.y + bullet.height < 0) {
            player.bullets.splice(index, 1); 
        }
    });
}

function updateRiverBanks() {
    riverBanks.forEach(segment => {
        segment.y += gameSpeed;
    });

    while (riverBanks.length > 0 && riverBanks[0].y > canvas.height) {
        riverBanks.shift();
    }

    let lastSegmentY = riverBanks.length > 0 ? riverBanks[riverBanks.length - 1].y : canvas.height;
    // O valor de bankWidth aqui é usado para controlar a geração de segmentos fora da tela,
    // não a largura visual da margem em si. Poderia ser renomeado para segmentSpawnOffset ou similar.
    while (lastSegmentY + 40 > -40) { // Usar a altura do segmento (40) para o cálculo
        const segmentHeight = 40; 
        lastSegmentY -= segmentHeight;

        const change = (Math.random() - 0.5) * riverPathVariation;
        currentRiverCenter += change;

        const minCenter = canvas.width * 0.3;
        const maxCenter = canvas.width * 0.7;
        currentRiverCenter = Math.max(minCenter, Math.min(maxCenter, currentRiverCenter));

        const riverWidthAtSegment = canvas.width * (0.4 + Math.random() * 0.2); 

        const leftBankX = currentRiverCenter - riverWidthAtSegment / 2;
        const rightBankX = currentRiverCenter + riverWidthAtSegment / 2;

        riverBanks.push({
            y: lastSegmentY,
            height: segmentHeight,
            leftBankX: Math.max(0, leftBankX), 
            rightBankX: Math.min(canvas.width, rightBankX) 
        });
    }
}

function spawnEnemy() {
    if (Math.random() < 0.015 && enemies.length < 5) { 
        const typeRoll = Math.random();
        let enemy;
        const riverSegment = riverBanks.find(s => s.y < 0 && s.y + s.height > -50); 
        if (!riverSegment) return; 

        const spawnXMin = riverSegment.leftBankX + 10;
        const spawnXMax = riverSegment.rightBankX - 40; 
        if (spawnXMin >= spawnXMax) return; 

        const x = Math.random() * (spawnXMax - spawnXMin) + spawnXMin;

        if (typeRoll < 0.5) { 
            enemy = {
                x: x, y: -30, width: 30, height: 20, color: '#ff6666', 
                speed: gameSpeed * 0.5 + Math.random() * 0.5, type: 'ship'
            };
        } else if (typeRoll < 0.8) { 
            enemy = {
                x: x, y: -40, width: 25, height: 15, color: '#ffcc00', 
                speed: gameSpeed * 0.8 + Math.random() * 0.7, type: 'helicopter',
                movePattern: Math.random() > 0.5 ? 'straight' : 'sine', 
                sineWaveX: x, 
                sineAngle: 0
            };
        } else { 
             enemy = {
                x: Math.random() * (canvas.width - 20), 
                y: -50, width: 20, height: 25, color: '#cc00cc', 
                speed: gameSpeed * 1.5 + Math.random(), type: 'jet'
            };
        }
        enemies.push(enemy);
    }
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        if (enemy.type === 'helicopter' && enemy.movePattern === 'sine') {
            enemy.sineAngle += 0.05;
            enemy.x = enemy.sineWaveX + Math.sin(enemy.sineAngle) * 30; 
        }
        enemy.y += enemy.speed;

        if (enemy.y > canvas.height) {
            enemies.splice(index, 1); 
        }
    });
}

function spawnFuelStation() {
    if (Math.random() < 0.005 && fuelStations.length < 2) {
         const riverSegment = riverBanks.find(s => s.y < 0 && s.y + s.height > -50);
        if (!riverSegment) return;

        const stationWidth = 40;
        const stationHeight = 30;
        const spawnXMin = riverSegment.leftBankX + 10;
        const spawnXMax = riverSegment.rightBankX - stationWidth - 10;
        if (spawnXMin >= spawnXMax) return;

        const x = Math.random() * (spawnXMax - spawnXMin) + spawnXMin;

        fuelStations.push({
            x: x, y: -stationHeight, width: stationWidth, height: stationHeight,
            speed: gameSpeed
        });
    }
}

function updateFuelStations() {
    fuelStations.forEach((station, index) => {
        station.y += station.speed;
        if (station.y > canvas.height) {
            fuelStations.splice(index, 1);
        }
    });
}


// --- Colisões ---
function checkCollisions() {
    const playerFeetY = player.y + player.height;

    for (const segment of riverBanks) {
        if (playerFeetY > segment.y && player.y < segment.y + segment.height) {
            if (player.x < segment.leftBankX + 5) { 
                handlePlayerCrash();
                return; 
            }
            if (player.x + player.width > segment.rightBankX - 5) {
                handlePlayerCrash();
                return;
            }
        }
    }

    player.bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                player.bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);
                score += 100; 
                updateScore();
                playSound('explosion');
            }
        });
    });

    enemies.forEach((enemy) => {
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            handlePlayerCrash();
        }
    });

    fuelStations.forEach((station, index) => {
        if (player.x < station.x + station.width &&
            player.x + player.width > station.x &&
            player.y < station.y + station.height &&
            player.y + player.height > station.y) {
            fuelStations.splice(index, 1);
            fuel = Math.min(100, fuel + 50); 
            updateFuel();
            playSound('fuel');
        }
    });
}

function handlePlayerCrash() {
    if (gameState !== 'playing') return; 

    playSound('crash');
    lives--;
    updateLives();
    if (lives <= 0) {
        gameOver();
    } else {
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - 70;
        // TODO: Adicionar breve período de invencibilidade
    }
}


// --- Lógica do Jogo ---
function updateGame() {
    if (gameState !== 'playing') return;

    gameTime++;
    updatePlayer();
    updateRiverBanks();
    spawnEnemy();
    updateEnemies();
    spawnFuelStation();
    updateFuelStations();
    checkCollisions();

    if (gameTime % 60 === 0) { 
        fuel--;
        updateFuel();
        if (fuel <= 0) {
            gameOver("Sem combustível!");
        }
    }

    if (gameTime > 0 && gameTime % 600 === 0) { 
        gameSpeed = Math.min(gameSpeed + 0.2, 5); 
        console.log("Velocidade aumentada para:", gameSpeed.toFixed(1));
    }
}

function drawGame() {
    ctx.fillStyle = '#4a7c9b'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawRiverBanks();
    player.bullets.forEach(drawBullet);
    drawPlayer();
    enemies.forEach(drawEnemy);
    fuelStations.forEach(drawFuelStation);
}

// Loop principal será controlado pelo p5.js

// --- UI e Controle de Estado ---
function updateScore() {
    scoreDisplay.textContent = score;
}
function updateFuel() {
    fuelDisplay.textContent = Math.max(0, fuel); 
}
function updateLives() {
    livesDisplay.textContent = lives;
}

function showMessage(text, showRestart = false) {
    messageText.textContent = text;
    restartButton.style.display = showRestart ? 'block' : 'none';
    messageOverlay.style.display = 'flex';
}

function hideMessage() {
    messageOverlay.style.display = 'none';
}

       function startGame() {
   // A inicialização do Tone.js é feita no manipulador de eventos de tecla/botão
   if (gameState === 'gameOver' || gameState === 'start') {
        resetGame();
        gameState = 'playing';
        hideMessage();
    }
}

function resetGame() {
    score = 0;
    fuel = 100;
    lives = 3;
    gameSpeed = 2;
    gameTime = 0;

    // Zerar velocidades e estados das teclas para evitar aceleração inesperada
    player.dx = 0;
    player.dy = 0;
    for (const key in keys) {
        keys[key] = false;
    }

    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 70;
    player.bullets = [];
    player.shootCooldown = 0;

    enemies.length = 0;
    fuelStations.length = 0;
    riverBanks.length = 0;
    currentRiverCenter = canvas.width / 2;
    
    for (let y = canvas.height; y > -50; y -= 40) {
         const segmentHeight = 40;
         const riverWidthAtSegment = canvas.width * (0.4 + Math.random() * 0.2);
         const leftBankX = currentRiverCenter - riverWidthAtSegment / 2;
         const rightBankX = currentRiverCenter + riverWidthAtSegment / 2;
         riverBanks.unshift({ 
            y: y - segmentHeight, height: segmentHeight,
            leftBankX: Math.max(0, leftBankX),
            rightBankX: Math.min(canvas.width, rightBankX)
        });
    }

    updateScore();
    updateFuel();
    updateLives();
}

       function gameOver(reason = "Fim de Jogo!") {
    if (gameState === 'gameOver') return;
    gameState = 'gameOver';
    // Loop será reiniciado automaticamente pelo p5.js
    playSound('gameOver');
    showMessage(`${reason}\nPontuação Final: ${score}`, true);
}

// --- Controles ---
const keys = {
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false, Space: false
};

window.addEventListener('keydown', async (e) => { // Tornar async para await Tone.start()
    if (!audioContextStarted) {
        try {
            await Tone.start();
            audioContextStarted = true;
            console.log("Contexto de áudio iniciado pelo gesto do usuário (tecla).");
        } catch (startError) {
            console.error("Falha ao iniciar Tone.start() via tecla: ", startError);
        }
    }

    if (gameState === 'start' && (e.key === 'Enter' || e.key === ' ' || e.code === 'Space')) {
        startGame();
        return;
    }
    if (gameState !== 'playing') return;

    if (e.key in keys) keys[e.key] = true;
    if (e.code === 'Space') keys.Space = true; // Para garantir que 'Space' (código) também funcione

    player.dx = 0;
    player.dy = 0;
    if (keys.ArrowLeft) player.dx = -player.speed;
    if (keys.ArrowRight) player.dx = player.speed;
    if (keys.ArrowUp) player.dy = -player.speed;
    if (keys.ArrowDown) player.dy = player.speed;

    if (keys.Space && player.shootCooldown === 0 && player.bullets.length < player.maxBullets) {
        player.bullets.push({
            x: player.x + player.width / 2 - 2.5, 
            y: player.y, width: 5, height: 10, speed: 7
        });
        player.shootCooldown = 15; 
        playSound('shoot');
    }
});

window.addEventListener('keyup', (e) => {
    if (gameState !== 'playing') return;
    if (e.key in keys) keys[e.key] = false;
    if (e.code === 'Space') keys.Space = false;


    if (e.key === 'ArrowLeft' && player.dx < 0) player.dx = 0;
    if (e.key === 'ArrowRight' && player.dx > 0) player.dx = 0;
    if (e.key === 'ArrowUp' && player.dy < 0) player.dy = 0;
    if (e.key === 'ArrowDown' && player.dy > 0) player.dy = 0;
});

restartButton.addEventListener('click', async () => { // Tornar async para await Tone.start()
     if (!audioContextStarted) {
        try {
            await Tone.start();
            audioContextStarted = true;
            console.log("Contexto de áudio iniciado pelo clique no botão de reiniciar.");
        } catch (startError) {
            console.error("Falha ao iniciar Tone.start() no reinício: ", startError);
        }
    }
    startGame();
});


// --- Funções de Som ---
function playSound(type) {
    if (!audioContextStarted) {
        console.warn("Contexto de áudio do Tone.js não iniciado. O som pode não tocar. Interaja com a página.");
        // Tentar iniciar pode ser arriscado aqui se não for uma interação direta do usuário.
        // É melhor garantir que foi iniciado antes.
    }

    try {
        const currentTime = Tone.now(); // Captura o tempo atual do contexto de áudio do Tone

        if (type === 'shoot') {
            noiseSynth.triggerAttackRelease("8n", currentTime);
        } else if (type === 'explosion' || type === 'crash') {
            metalSynth.triggerAttackRelease("C2", "0.2", currentTime);
        } else if (type === 'fuel') {
            synth.triggerAttackRelease("C5", "0.1", currentTime);
            synth.triggerAttackRelease("E5", "0.1", currentTime + 0.1); // Agendado 0.1s após currentTime
            synth.triggerAttackRelease("G5", "0.1", currentTime + 0.2); // Agendado 0.2s após currentTime
        } else if (type === 'gameOver') {
             synth.triggerAttackRelease("C3", "0.5", currentTime);
             synth.triggerAttackRelease("G2", "0.5", currentTime + 0.5);
             synth.triggerAttackRelease("E2", "0.7", currentTime + 1.0);
        }
    } catch (error) {
        console.warn(`Erro ao tocar som (${type}) com Tone.js:`, error);
        if (Tone && Tone.context) { // Verifica se Tone e Tone.context existem
             console.warn(`Estado do Contexto Tone.js: ${Tone.context.state}`);
        }
    }
}

// --- Inicialização ---
// Inicialização controlada pelo sketch do p5.js

const sketch = (p) => {
    p.setup = () => {
        const p5Canvas = p.createCanvas(600, 800);
        p5Canvas.parent('gameContainer');
        p5Canvas.id('gameCanvas');
        canvas = p5Canvas.elt;
        ctx = canvas.getContext('2d');
        resizeCanvas();
        showMessage("Pressione ESPAÇO ou ENTER para Iniciar", false);
    };

    p.draw = () => {
        if (gameState === 'paused') return;
        if (gameState === 'playing') {
            updateGame();
            drawGame();
        }
    };

    p.windowResized = () => {
        resizeCanvas();
    };
};

window.initRiverRaid = function() {
    new p5(sketch);
};
