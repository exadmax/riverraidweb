# River Raid Pixel 🚀

Jogo de arcade estilo River Raid em HTML, CSS e JavaScript puro (sem frameworks), com estética pixel art e efeitos sonoros via Tone.js. Voe pelo rio, destrua inimigos e pontes, e gerencie o combustível para chegar ao maior recorde.

## 🎮 Como jogar

| Ação | Teclado | Toque |
|------|---------|-------|
| Mover | Setas ou WASD | D-pad na tela |
| Atirar | Espaço (segure para atirar sem parar) | Botão FIRE |
| Iniciar / continuar | Enter ou Espaço | Botão na tela |
| Pausar | P ou Esc (também pausa ao sair da aba) | — |

Os controles de toque aparecem automaticamente em celulares e tablets.

### Regras
* **As margens do rio são mortais**: encostar nelas custa uma vida.
* **Inimigos:** navios (30 pts, patrulham o rio), helicópteros (60 pts) e jatos (100 pts, cruzam a tela).
* **Pontes (500 pts):** bloqueiam o rio periodicamente — destrua-as com um tiro antes de passar.
* **Postos de combustível (F):** sobrevoe para reabastecer aos poucos. Atirar neles dá 80 pts, mas você perde o abastecimento.
* **Vidas:** começa com 3, ganha uma a cada 5000 pontos (máximo 5). Após perder uma vida, a nave renasce no meio do rio, com combustível cheio e alguns instantes de invencibilidade.
* **Recorde:** salvo no navegador (`localStorage`).
* A velocidade aumenta gradualmente.

## 🚀 Executar

Abra o `index.html` no navegador. Não há etapa de build. O som usa o Tone.js via CDN; sem internet o jogo funciona normalmente, só que mudo.

## 🧪 Desenvolvimento

```bash
npm install
npm test
```

Estrutura:
* `index.html` — página, HUD, overlay e controles de toque.
* `riverraid.js` — loop do jogo (passo fixo de 60 Hz), entidades, desenho e entrada.
* `logic.js` — funções puras (colisão, geração do rio, remoção segura de itens), com testes unitários.
* `__tests__/` — testes Jest: lógica pura, estrutura do HTML e um smoke test que executa o jogo em jsdom.

## 🔮 Ideias futuras

* Sprites pixel art reais e animação de explosão.
* Novos inimigos com padrões de ataque.
* Power-ups (tiro mais rápido, escudo).
* Música de fundo e fases com visuais diferentes.
* Empacotar como PWA ou app Android.
