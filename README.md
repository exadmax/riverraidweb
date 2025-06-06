# River Raid Pixel 🚀

Um jogo de arcade estilo River Raid desenvolvido em HTML, CSS e JavaScript puro, com uma estética pixel art e efeitos sonoros básicos. Voe por um rio perigoso, destrua inimigos, desvie de obstáculos e gerencie seu combustível para alcançar a maior pontuação possível!

## 🎮 Como Jogar

O objetivo do jogo é voar o mais longe possível ao longo do rio, destruindo inimigos e postos de combustível para reabastecer, enquanto desvia das margens do rio.

### Controles:
* **Setas Direcionais (← → ↑ ↓):** Mover a nave.
* **Barra de Espaço:** Atirar.
* **Enter / Espaço (na tela inicial):** Iniciar o jogo.

### Elementos do Jogo:
* **Nave do Jogador:** Controlada por você.
* **Inimigos:** Navios, helicópteros e jatos que aparecem no rio. Destrua-os para ganhar pontos.
* **Postos de Combustível (F):** Sobrevoe para reabastecer. Seu combustível diminui com o tempo.
* **Margens do Rio:** Evite colidir com as margens.
* **Pontuação:** Aumenta ao destruir inimigos.
* **Vidas:** Você começa com 3 vidas. Perde uma vida ao colidir ou ficar sem combustível.
* **Game Over:** O jogo termina quando você perde todas as vidas ou fica sem combustível.

## ✨ Funcionalidades

* Movimentação da nave em 4 direções.
* Mecânica de tiro com cooldown.
* Geração procedural e rolagem do cenário do rio.
* Diferentes tipos de inimigos com comportamentos básicos (navios, helicópteros, jatos).
* Sistema de combustível com postos de reabastecimento.
* Detecção de colisão (nave vs. margens, nave vs. inimigos, tiros vs. inimigos, nave vs. combustível).
* Sistema de pontuação e vidas.
* Efeitos sonoros básicos para ações no jogo (tiro, explosão, combustível, game over) usando Tone.js.
* Interface de usuário para pontuação, combustível e vidas.
* Tela de início e fim de jogo com opção de reiniciar.
* Design responsivo básico para o canvas do jogo.

## 🛠️ Tecnologias Utilizadas

* **HTML5:** Estrutura do jogo (arquivo principal: `index.html`).
* **CSS3:** Estilização da página e elementos do jogo (com Tailwind CSS para utilitários básicos de layout da página, embutido no `index.html`).
* **JavaScript (ES6+):** Lógica principal do jogo, manipulação do DOM e renderização no Canvas.
* **p5.js:** Biblioteca utilizada para gerenciamento do canvas e loop do jogo.
* **HTML5 Canvas API:** Para desenhar e animar os elementos do jogo.
* **Tone.js:** Para a geração de efeitos sonoros.

## 🚀 Como Executar Localmente

1.  **Salve o arquivo:**
    * Certifique-se de que você tem o arquivo `index.html` contendo todo o código do jogo salvo em seu computador.
2.  **Abra o arquivo no navegador:**
    * Navegue até a pasta onde você salvou o arquivo `index.html`.
    * Abra o arquivo `index.html` diretamente no seu navegador de preferência (Google Chrome, Firefox, Edge, etc.).

O jogo deverá carregar e você poderá começar a jogar!

## 🔮 Melhorias Futuras (Sugestões)

* Implementar sprites pixel art reais para o jogador, inimigos e cenário.
* Adicionar mais tipos de inimigos com padrões de ataque e movimento mais complexos.
* Incluir pontes destrutíveis.
* Sistema de power-ups (tiro mais rápido, escudo, etc.).
* Aumento progressivo da dificuldade com níveis ou fases.
* Música de fundo e efeitos sonoros mais elaborados.
* Tabela de recordes (High Scores) usando LocalStorage.
* Suporte a controles mobile (touch).

---

Divirta-se jogando e modificando!