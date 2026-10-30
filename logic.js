// Lógica pura do jogo (sem DOM, sem canvas) para ser testável.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.RRLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function rectsOverlap(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x &&
               a.y < b.y + b.height && a.y + a.height > b.y;
    }

    // Remove in-place os itens que satisfazem pred (seguro, ao contrário de splice dentro de forEach).
    function removeWhere(arr, pred) {
        let w = 0;
        for (let i = 0; i < arr.length; i++) {
            if (!pred(arr[i], i)) arr[w++] = arr[i];
        }
        arr.length = w;
        return arr;
    }

    // Gera o próximo segmento do rio a partir do anterior, com variações suaves.
    function nextRiver(prev, width, rand) {
        const center = clamp(prev.center + (rand() - 0.5) * 14, width * 0.3, width * 0.7);
        const riverWidth = clamp(prev.width + (rand() - 0.5) * 0.06 * width, width * 0.38, width * 0.6);
        return {
            center,
            width: riverWidth,
            left: Math.max(0, center - riverWidth / 2),
            right: Math.min(width, center + riverWidth / 2)
        };
    }

    return { clamp, rectsOverlap, removeWhere, nextRiver };
});
