const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('index.html estrutura basica', () => {
  let document;
  beforeAll(() => {
    document = new JSDOM(html).window.document;
  });

  test('possui overlay, canvas e botão de ação', () => {
    ['messageOverlay', 'gameCanvas', 'actionButton'].forEach(id => {
      expect(document.getElementById(id)).not.toBeNull();
    });
  });

  test('inclui os scripts do jogo e não depende de p5 nem Tailwind', () => {
    const scripts = Array.from(document.querySelectorAll('script'))
      .map(s => s.getAttribute('src'))
      .filter(Boolean);
    expect(scripts).toContain('logic.js');
    expect(scripts).toContain('riverraid.js');
    expect(scripts.some(s => /p5|tailwind/i.test(s))).toBe(false);
  });
});
