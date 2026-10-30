(function () {
    'use strict';

    const L = window.RRLogic;
    const W = 450;
    const H = 600;
    const STEP = 1000 / 60;      // passo fixo: o jogo roda igual em 60/120/144 Hz
    const SEG_H = 40;
    const HS_KEY = 'riverraid.highscore';
    const INVINCIBLE_FRAMES = 120;
    const BRIDGE_EVERY = 2400;   // distância rolada entre pontes
    const POINTS = { ship: 30, helicopter: 60, jet: 100, station: 80, bridge: 500 };

    const $ = (id) => document.getElementById(id);
    const canvas = $('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = W;
    canvas.height = H;

    const ui = {
        score: $('score'), high: $('highScore'), fuel: $('fuel'), fuelFill: $('fuelFill'),
        lives: $('lives'), overlay: $('messageOverlay'), text: $('messageText'), action: $('actionButton')
    };

    // --- Estado ---
    const g = { state: 'start', score: 0, fuel: 100, lives: 3, speed: 2, time: 0,
                scrolled: 0, nextBridgeAt: BRIDGE_EVERY, invincible: 0, nextLifeAt: 5000,
                sinceStation: 0, high: loadHigh() };
    const player = { x: 0, y: 0, width: 30, height: 30, speed: 4, cool: 0, maxBullets: 3 };
    const keys = { left: false, right: false, up: false, down: false, fire: false };
    let banks = [], enemies = [], stations = [], bridges = [], bullets = [];
    let river = { center: W / 2, width: W * 0.5 };

    function loadHigh() {
        try { return parseInt(localStorage.getItem(HS_KEY), 10) || 0; } catch (e) { return 0; }
    }
    function saveHigh() {
        try { localStorage.setItem(HS_KEY, String(g.high)); } catch (e) { /* storage indisponível */ }
    }

    // --- Áudio (Tone.js é opcional: o jogo funciona sem som) ---
    let audio = null;
    let audioStarting = false;
    function initAudio() {
        if (audio || audioStarting || typeof Tone === 'undefined') return;
        audioStarting = true;
        try {
            Tone.start().then(() => {
                const metal = new Tone.MetalSynth({
                    frequency: 100, envelope: { attack: 0.001, decay: 0.1, release: 0.1 },
                    harmonicity: 3.1, modulationIndex: 16, resonance: 2000, octaves: 0.5
                }).toDestination();
                metal.volume.value = -15;
                const noise = new Tone.NoiseSynth({
                    noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.05, sustain: 0 }
                }).toDestination();
                noise.volume.value = -10;
                audio = { synth: new Tone.Synth().toDestination(), metal, noise };
            }).catch(() => { audioStarting = false; });
        } catch (e) { audioStarting = false; }
    }

    function play(type) {
        if (!audio) return;
        try {
            const t = Tone.now();
            if (type === 'shoot') audio.noise.triggerAttackRelease('8n', t);
            else if (type === 'explosion' || type === 'crash') audio.metal.triggerAttackRelease('C2', 0.2, t);
            else if (type === 'fuel') audio.synth.triggerAttackRelease('C6', 0.05, t);
            else if (type === 'life') {
                audio.synth.triggerAttackRelease('C5', 0.1, t);
                audio.synth.triggerAttackRelease('G5', 0.1, t + 0.12);
            } else if (type === 'gameOver') {
                audio.synth.triggerAttackRelease('C3', 0.5, t);
                audio.synth.triggerAttackRelease('G2', 0.5, t + 0.5);
                audio.synth.triggerAttackRelease('E2', 0.7, t + 1.0);
            }
        } catch (e) { /* som é opcional */ }
    }

    // --- Mundo ---
    function addSegment(y) {
        river = L.nextRiver(river, W, Math.random);
        banks.push({ y, height: SEG_H, leftBankX: river.left, rightBankX: river.right });
    }

    function segmentAt(y) {
        return banks.find((s) => y >= s.y && y < s.y + s.height) || banks[banks.length - 1];
    }

    function resetGame() {
        Object.assign(g, { score: 0, fuel: 100, lives: 3, speed: 2, time: 0, scrolled: 0,
                           nextBridgeAt: BRIDGE_EVERY, invincible: 0, nextLifeAt: 5000, sinceStation: 0 });
        enemies = []; stations = []; bridges = []; bullets = []; banks = [];
        Object.keys(keys).forEach((k) => { keys[k] = false; });
        river = { center: W / 2, width: W * 0.5 };
        for (let y = H - SEG_H; y > -SEG_H; y -= SEG_H) addSegment(y);
        respawnPlayer();
        refreshHud();
    }

    function respawnPlayer() {
        player.y = H - 90;
        const seg = segmentAt(player.y + player.height / 2);
        player.x = (seg.leftBankX + seg.rightBankX) / 2 - player.width / 2;
        player.cool = 0;
        g.fuel = 100;
    }

    // --- Atualização ---
    function hitbox() {
        return { x: player.x + 3, y: player.y, width: player.width - 6, height: player.height };
    }

    function shoot() {
        if (player.cool > 0 || bullets.length >= player.maxBullets) return;
        bullets.push({ x: player.x + player.width / 2 - 2.5, y: player.y - 4, width: 5, height: 10, speed: 8 });
        player.cool = 14;
        play('shoot');
    }

    function spawnEnemy() {
        const top = banks[banks.length - 1];
        const rate = 0.012 + Math.min(0.012, g.time / 60000);
        if (enemies.length >= 6 || Math.random() >= rate) return;
        const roll = Math.random();
        const minX = top.leftBankX + 8;
        if (roll < 0.5) {
            const maxX = top.rightBankX - 38;
            if (minX >= maxX) return;
            enemies.push({ type: 'ship', x: minX + Math.random() * (maxX - minX), y: -30, width: 30, height: 20,
                           color: '#ff6666', vx: Math.random() < 0.5 ? -0.6 : 0.6 });
        } else if (roll < 0.8) {
            const maxX = top.rightBankX - 55;
            if (minX + 30 >= maxX) return;
            const x = minX + 30 + Math.random() * (maxX - minX - 30);
            enemies.push({ type: 'helicopter', x, baseX: x, y: -40, width: 25, height: 15, color: '#ffcc00',
                           sine: Math.random() < 0.5, angle: 0 });
        } else {
            enemies.push({ type: 'jet', x: Math.random() * (W - 20), y: -50, width: 20, height: 25, color: '#cc00cc' });
        }
    }

    function spawnStation() {
        g.sinceStation++;
        const top = banks[banks.length - 1];
        const chance = 0.004 + g.sinceStation / 60000;
        if (stations.length >= 2 || Math.random() >= chance) return;
        const minX = top.leftBankX + 10;
        const maxX = top.rightBankX - 50;
        if (minX >= maxX) return;
        stations.push({ x: minX + Math.random() * (maxX - minX), y: -30, width: 40, height: 30 });
        g.sinceStation = 0;
    }

    function updateWorld() {
        const s = g.speed;
        g.scrolled += s;
        banks.forEach((b) => { b.y += s; });
        stations.forEach((o) => { o.y += s; });
        bridges.forEach((o) => { o.y += s; });
        L.removeWhere(banks, (b) => b.y > H);
        while (banks[banks.length - 1].y > -SEG_H) addSegment(banks[banks.length - 1].y - SEG_H);
        L.removeWhere(stations, (o) => o.y > H);
        L.removeWhere(bridges, (o) => o.y > H);

        if (g.scrolled >= g.nextBridgeAt) {
            g.nextBridgeAt += BRIDGE_EVERY;
            bridges.push({ x: 0, y: -30, width: W, height: 24 });
        }

        enemies.forEach((e) => {
            if (e.type === 'ship') {
                e.y += s;
                e.x += e.vx;
                const seg = segmentAt(e.y + e.height / 2);
                if (e.x < seg.leftBankX + 2 || e.x + e.width > seg.rightBankX - 2) {
                    e.vx = -e.vx;
                    e.x = L.clamp(e.x, seg.leftBankX + 2, seg.rightBankX - 2 - e.width);
                }
            } else if (e.type === 'helicopter') {
                e.y += s + 0.4;
                if (e.sine) { e.angle += 0.05; e.x = e.baseX + Math.sin(e.angle) * 30; }
            } else {
                e.y += s * 1.8 + 0.5;
            }
        });
        L.removeWhere(enemies, (e) => e.y > H + 20);
        bullets.forEach((b) => { b.y -= b.speed; });
        L.removeWhere(bullets, (b) => b.y + b.height < 0);
    }

    function addScore(points) {
        g.score += points;
        if (g.score >= g.nextLifeAt) {
            g.nextLifeAt += 5000;
            if (g.lives < 5) { g.lives++; play('life'); }
        }
        if (g.score > g.high) g.high = g.score;
    }

    function crash(reason) {
        if (g.state !== 'playing') return;
        play('crash');
        g.lives--;
        if (g.lives <= 0) { gameOver(reason || 'Fim de Jogo!'); return; }
        g.invincible = INVINCIBLE_FRAMES;
        respawnPlayer();
    }

    function checkCollisions() {
        const box = hitbox();
        const dead = new Set();

        // Tiros
        bullets.forEach((b) => {
            const hit = [enemies, stations, bridges].some((list, i) => {
                const target = list.find((o) => !dead.has(o) && L.rectsOverlap(b, o));
                if (!target) return false;
                dead.add(target);
                addScore(POINTS[i === 0 ? target.type : (i === 1 ? 'station' : 'bridge')]);
                play('explosion');
                return true;
            });
            if (hit) dead.add(b);
        });
        L.removeWhere(bullets, (o) => dead.has(o));
        L.removeWhere(enemies, (o) => dead.has(o));
        L.removeWhere(stations, (o) => dead.has(o));
        L.removeWhere(bridges, (o) => dead.has(o));

        // Reabastecimento gradual enquanto sobrevoa o posto
        if (stations.some((o) => L.rectsOverlap(box, o))) {
            g.fuel = Math.min(100, g.fuel + 0.8);
            if (g.time % 8 === 0) play('fuel');
        }

        if (g.invincible > 0) return;

        const bankHit = banks.some((b) => box.y + box.height > b.y && box.y < b.y + b.height &&
                                           (box.x < b.leftBankX || box.x + box.width > b.rightBankX));
        if (bankHit) { crash(); return; }

        const enemy = enemies.find((o) => L.rectsOverlap(box, o));
        if (enemy) { L.removeWhere(enemies, (o) => o === enemy); crash(); return; }

        const bridge = bridges.find((o) => L.rectsOverlap(box, o));
        if (bridge) { L.removeWhere(bridges, (o) => o === bridge); crash(); }
    }

    function update() {
        g.time++;
        const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        const dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
        player.x = L.clamp(player.x + dx * player.speed, 0, W - player.width);
        player.y = L.clamp(player.y + dy * player.speed, 0, H - player.height);
        if (player.cool > 0) player.cool--;
        if (keys.fire) shoot();
        if (g.invincible > 0) g.invincible--;

        updateWorld();
        spawnEnemy();
        spawnStation();

        if (g.time % 60 === 0) {
            g.fuel -= 1;
            if (g.fuel <= 0) { g.fuel = 0; refreshHud(); crash('Sem combustível!'); }
        }
        if (g.time % 600 === 0) g.speed = Math.min(g.speed + 0.2, 5);

        if (g.state === 'playing') checkCollisions();
        refreshHud();
    }

    // --- Desenho ---
    function drawGame() {
        ctx.fillStyle = '#4a7c9b';
        ctx.fillRect(0, 0, W, H);

        // Listras na água dão sensação de movimento
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        const off = g.scrolled % 60;
        for (let y = -60 + off; y < H; y += 60) {
            for (let x = 40; x < W; x += 110) ctx.fillRect(x + ((y / 60) % 2) * 30, y, 24, 3);
        }

        banks.forEach((b) => {
            ctx.fillStyle = '#386641';
            ctx.fillRect(0, b.y, b.leftBankX, b.height + 1);
            ctx.fillRect(b.rightBankX, b.y, W - b.rightBankX, b.height + 1);
            ctx.fillStyle = '#2a4d31';
            ctx.fillRect(b.leftBankX - 3, b.y, 3, b.height + 1);
            ctx.fillRect(b.rightBankX, b.y, 3, b.height + 1);
        });

        bridges.forEach((o) => {
            ctx.fillStyle = '#7a7a7a';
            ctx.fillRect(o.x, o.y, o.width, o.height);
            ctx.fillStyle = '#4a4a4a';
            for (let x = 0; x < o.width; x += 30) ctx.fillRect(x, o.y + o.height - 5, 4, 5);
            ctx.fillRect(o.x, o.y + o.height / 2 - 1, o.width, 2);
        });

        stations.forEach((o) => {
            ctx.fillStyle = '#0077b6';
            ctx.fillRect(o.x, o.y, o.width, o.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = `${Math.floor(o.height * 0.6)}px Courier New`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('F', o.x + o.width / 2, o.y + o.height / 2);
        });

        ctx.fillStyle = '#ffff00';
        bullets.forEach((b) => ctx.fillRect(b.x, b.y, b.width, b.height));

        enemies.forEach(drawEnemy);

        // Pisca durante a invencibilidade
        if (g.invincible === 0 || Math.floor(g.invincible / 5) % 2 === 0) drawPlayer();
    }

    function drawPlayer() {
        const { x, y, width: w, height: h } = player;
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y - 6);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - w * 0.6, y + h * 0.5, w * 0.6, 4);
        ctx.fillRect(x + w, y + h * 0.5, w * 0.6, 4);
        ctx.fillRect(x + w / 2 - 2, y + h - 1, 4, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + w / 2 - 3, y + h * 0.2, 6, 4);
    }

    function drawEnemy(e) {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        if (e.type === 'ship') {
            ctx.moveTo(e.x, e.y + e.height);
            ctx.lineTo(e.x + e.width / 2, e.y);
            ctx.lineTo(e.x + e.width, e.y + e.height);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(e.x + e.width / 2 - 3, e.y - 6, 6, 6);
        } else if (e.type === 'helicopter') {
            ctx.ellipse(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, e.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(e.x + e.width / 2 - 12, e.y - 4, 24, 3);
            ctx.fillRect(e.x - 4, e.y + e.height / 2 - 1, 8, 2);
        } else {
            ctx.moveTo(e.x + e.width / 2, e.y + e.height);
            ctx.lineTo(e.x + e.width, e.y);
            ctx.lineTo(e.x, e.y);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(e.x - 6, e.y + e.height * 0.3, 6, 3);
            ctx.fillRect(e.x + e.width, e.y + e.height * 0.3, 6, 3);
        }
    }

    // --- Interface e estados ---
    function refreshHud() {
        ui.score.textContent = g.score;
        ui.high.textContent = g.high;
        ui.lives.textContent = g.lives;
        const fuel = Math.max(0, Math.ceil(g.fuel));
        ui.fuel.textContent = fuel;
        ui.fuelFill.style.width = fuel + '%';
        ui.fuelFill.classList.toggle('low', fuel <= 25);
    }

    let actionHandler = null;
    let readyAt = 0; // evita reiniciar sem querer logo após perder segurando o botão de tiro
    function showOverlay(text, label, handler, delayMs) {
        readyAt = performance.now() + (delayMs || 0);
        ui.text.textContent = text;
        ui.action.textContent = label;
        actionHandler = handler;
        ui.overlay.style.display = 'flex';
        ui.action.focus({ preventScroll: true });
    }
    function hideOverlay() {
        ui.overlay.style.display = 'none';
        ui.action.blur();
    }

    function startGame() {
        resetGame();
        g.state = 'playing';
        hideOverlay();
    }

    function pauseGame() {
        if (g.state !== 'playing') return;
        g.state = 'paused';
        Object.keys(keys).forEach((k) => { keys[k] = false; });
        showOverlay('Pausado', 'Continuar', resumeGame);
    }

    function resumeGame() {
        if (g.state !== 'paused') return;
        g.state = 'playing';
        hideOverlay();
    }

    function gameOver(reason) {
        g.state = 'gameOver';
        play('gameOver');
        const record = g.score > 0 && g.score >= g.high;
        if (g.score > 0) saveHigh();
        refreshHud();
        showOverlay(`${reason}\nPontuação final: ${g.score}${record ? '\nNovo recorde!' : ''}`, 'Jogar de novo', startGame, 700);
    }

    // --- Controles ---
    const KEYMAP = {
        ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
        ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'fire'
    };

    function setControl(name, on) {
        if (g.state === 'playing') keys[name] = on;
        else if (!on) keys[name] = false;
    }

    function primaryAction() {
        if (performance.now() < readyAt) return;
        if (g.state === 'paused') resumeGame();
        else if (g.state === 'start' || g.state === 'gameOver') startGame();
    }

    window.addEventListener('keydown', (e) => {
        initAudio();
        if (e.code === 'KeyP' || e.code === 'Escape') {
            if (g.state === 'playing') pauseGame(); else resumeGame();
            return;
        }
        if (e.code === 'Enter' || e.code === 'Space') {
            if (g.state !== 'playing') {
                // Deixa o botão focado tratar o Enter/Espaço para não disparar duas vezes
                if (document.activeElement === ui.action) return;
                e.preventDefault();
                primaryAction();
                return;
            }
        }
        const name = KEYMAP[e.code];
        if (name) { e.preventDefault(); setControl(name, true); }
    });

    window.addEventListener('keyup', (e) => {
        const name = KEYMAP[e.code];
        if (name) setControl(name, false);
    });

    window.addEventListener('blur', () => {
        Object.keys(keys).forEach((k) => { keys[k] = false; });
        pauseGame();
    });

    ui.action.addEventListener('click', () => {
        initAudio();
        if (actionHandler && performance.now() >= readyAt) actionHandler();
    });

    function bindButton(id, name) {
        const btn = $(id);
        if (!btn) return;
        const down = (e) => { e.preventDefault(); initAudio(); btn.classList.add('pressed'); setControl(name, true); };
        const up = () => { btn.classList.remove('pressed'); setControl(name, false); };
        btn.addEventListener('pointerdown', down);
        ['pointerup', 'pointercancel', 'pointerleave'].forEach((evt) => btn.addEventListener(evt, up));
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    bindButton('btnLeft', 'left');
    bindButton('btnRight', 'right');
    bindButton('btnUp', 'up');
    bindButton('btnDown', 'down');
    bindButton('btnShoot', 'fire');

    // --- Loop principal ---
    let last = 0;
    let acc = 0;
    function frame(t) {
        requestAnimationFrame(frame);
        if (!last) last = t;
        acc += Math.min(t - last, 100);
        last = t;
        while (acc >= STEP) {
            if (g.state === 'playing') update();
            acc -= STEP;
        }
        drawGame();
    }

    resetGame();
    showOverlay('RIVER RAID\nDestrua pontes, inimigos e abasteça nos postos (F).', 'Iniciar', startGame);
    requestAnimationFrame(frame);

    // Exposto para testes
    window.RiverRaid = { g, player, keys, start: startGame, update, pause: pauseGame, resume: resumeGame,
        get world() { return { banks, enemies, stations, bridges, bullets }; } };
})();
