const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('index.html estrutura basica', () => {
  let document;
  beforeAll(() => {
    document = new JSDOM(html).window.document;
  });

  test('possui elemento messageOverlay', () => {
    expect(document.getElementById('messageOverlay')).not.toBeNull();
  });

  test('inclui script do jogo', () => {
    const scripts = Array.from(document.querySelectorAll('script'))
      .map(s => s.getAttribute('src'))
      .filter(Boolean);
    expect(scripts).toContain('riverraid.js');
  });
});
