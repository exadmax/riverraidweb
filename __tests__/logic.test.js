const { clamp, rectsOverlap, removeWhere, nextRiver } = require('../logic');

describe('logic', () => {
  test('clamp limita valores', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  test('rectsOverlap detecta sobreposição e encostar não conta', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(rectsOverlap(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(rectsOverlap(a, { x: 10, y: 0, width: 10, height: 10 })).toBe(false);
  });

  test('removeWhere remove todos os itens consecutivos (bug do splice em forEach)', () => {
    const arr = [1, 2, 3, 4, 5, 6];
    removeWhere(arr, n => n % 2 === 0 || n === 5);
    expect(arr).toEqual([1, 3]);
    const consecutive = [1, 1, 1, 2];
    removeWhere(consecutive, n => n === 1);
    expect(consecutive).toEqual([2]);
  });

  test('nextRiver mantém o rio dentro da tela e com largura limitada', () => {
    let river = { center: 225, width: 225 };
    for (let i = 0; i < 2000; i++) {
      river = nextRiver(river, 450, Math.random);
      expect(river.left).toBeGreaterThanOrEqual(0);
      expect(river.right).toBeLessThanOrEqual(450);
      expect(river.right - river.left).toBeGreaterThanOrEqual(450 * 0.38 - 1e-6);
      expect(river.width).toBeLessThanOrEqual(450 * 0.6 + 1e-6);
    }
  });

  test('nextRiver muda pouco entre segmentos consecutivos (rio navegável)', () => {
    let river = nextRiver({ center: 225, width: 225 }, 450, Math.random);
    for (let i = 0; i < 500; i++) {
      const next = nextRiver(river, 450, Math.random);
      expect(Math.abs(next.left - river.left)).toBeLessThan(25);
      expect(Math.abs(next.right - river.right)).toBeLessThan(25);
      river = next;
    }
  });
});
