const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const read = (f) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');

function loadGame() {
  const dom = new JSDOM(read('index.html'), { runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  // jsdom não implementa canvas: usa um contexto que ignora todas as chamadas
  window.HTMLCanvasElement.prototype.getContext = () =>
    new Proxy({}, { get: () => () => {}, set: () => true });
  window.eval(read('logic.js'));
  window.eval(read('riverraid.js'));
  return window;
}

describe('jogo (smoke)', () => {
  let win;
  let game;
  beforeEach(() => {
    win = loadGame();
    game = win.RiverRaid;
    game.start();
  });
  afterEach(() => win.close());

  test('começa em "playing" com 3 vidas e combustível cheio', () => {
    expect(game.g.state).toBe('playing');
    expect(game.g.lives).toBe(3);
    expect(game.g.fuel).toBe(100);
  });

  test('roda 3000 quadros sem lançar erros e sem deixar o rio quebrar', () => {
    game.keys.fire = true;
    for (let i = 0; i < 3000 && game.g.state === 'playing'; i++) game.update();
    const { banks } = game.world;
    expect(banks.length).toBeGreaterThan(10);
    banks.forEach(b => expect(b.rightBankX).toBeGreaterThan(b.leftBankX));
  });

  test('bater na margem tira uma vida e dá invencibilidade', () => {
    game.player.x = 0;
    game.update();
    expect(game.g.lives).toBe(2);
    expect(game.g.invincible).toBeGreaterThan(0);
  });

  test('tiro destrói inimigos vizinhos sem pular nenhum', () => {
    const { enemies, bullets } = game.world;
    const cx = game.player.x; // o jogador renasce no centro do rio
    const mk = (x) => ({ type: 'ship', x, y: 100, width: 30, height: 20, color: '#f00', vx: 0 });
    enemies.push(mk(cx), mk(cx), mk(cx));
    const bullet = (x) => ({ x, y: 105, width: 5, height: 10, speed: 0 });
    bullets.push(bullet(cx + 5), bullet(cx + 10), bullet(cx + 15));
    game.g.invincible = 999;
    game.update();
    expect(game.world.enemies.filter(e => e.y < 200 && e.y > 50)).toHaveLength(0);
    expect(game.g.score).toBe(90);
  });

  test('pausar congela o estado e continuar retoma', () => {
    game.pause();
    expect(game.g.state).toBe('paused');
    game.resume();
    expect(game.g.state).toBe('playing');
  });

  test('sem combustível perde vida e reabastece ao renascer', () => {
    game.g.fuel = 1;
    game.g.time = 59;
    game.g.invincible = 0;
    game.update();
    expect(game.g.lives).toBe(2);
    expect(game.g.fuel).toBe(100);
  });
});
