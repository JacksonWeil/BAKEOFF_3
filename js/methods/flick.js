// Prototype C: Flick keys (inspired by Japanese phone flick input; NOT T9 - every gesture maps
// to exactly one character, no dictionary or prediction).
// 3x2 big keys, 5 characters each: tap = center letter, flick up/right/down/left = the others.
// 6 keys x 5 = 30 slots = 26 letters + space + delete (+2 spare).
// While your finger is down, the whole face shows that key's 5 choices with the current one lit.
const FLICK_KEYS = [
  // [center, up, right, down, left]
  ['a', 'b', 'c', 'd', 'e'],
  ['f', 'g', 'h', 'i', 'j'],
  ['k', 'l', 'm', 'n', 'o'],
  ['p', 'q', 'r', 's', 't'],
  ['u', 'v', 'w', 'x', 'y'],
  [' ', 'z', '', '\b', ''],
];
const FLICK_DIRS = ['tap', 'up', 'right', 'down', 'left'];
function flickLabel(c) { return c === ' ' ? '␣' : c === '\b' ? '⌫' : c; }
registerMethod({
  id: 'flick', name: 'C: Flick keys',
  blurb: '6 big keys. Tap for the middle letter, flick up/right/down/left for the corner letters.',
  init() { this.d = null; },
  reset() { this.d = null; },
  rect(i, S) { const w = S / 3, h = S / 2; return { x: (i % 3) * w, y: Math.floor(i / 3) * h, w, h }; },
  dir(p, S) {
    const dx = p.x - this.d.p0.x, dy = p.y - this.d.p0.y;
    if (Math.hypot(dx, dy) < S * 0.1) return 0;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 2 : 4;
    return dy > 0 ? 3 : 1;
  },
  draw(g, S) {
    if (this.d) { // expanded view of the touched key
      const set = FLICK_KEYS[this.d.key], c = S / 2, r = S * 0.34, bw = S * 0.3;
      const pos = [[c, c], [c, c - r], [c + r, c], [c, c + r], [c - r, c]];
      g.fillStyle = '#263238'; g.fillRect(0, 0, S, S);
      pos.forEach(([x, y], i) => {
        if (set[i] === '') return;
        drawKey(g, x - bw / 2, y - bw / 2, bw, bw, flickLabel(set[i]),
          { fill: i === this.d.dir ? '#ffd54f' : '#eceff1', font: bw * 0.7, bold: i === this.d.dir });
      });
      return;
    }
    for (let i = 0; i < 6; i++) {
      const R = this.rect(i, S), set = FLICK_KEYS[i];
      g.fillStyle = '#eceff1'; g.fillRect(R.x + 1, R.y + 1, R.w - 2, R.h - 2);
      const cx = R.x + R.w / 2, cy = R.y + R.h / 2;
      const pos = [[cx, cy], [cx, R.y + R.h * 0.18], [R.x + R.w * 0.82, cy], [cx, R.y + R.h * 0.82], [R.x + R.w * 0.18, cy]];
      g.textAlign = 'center'; g.textBaseline = 'middle';
      pos.forEach(([x, y], k) => {
        if (set[k] === '') return;
        g.fillStyle = k === 0 ? '#000' : '#555';
        g.font = (k === 0 ? 'bold ' + R.w * 0.42 : R.w * 0.26) + 'px sans-serif';
        g.fillText(flickLabel(set[k]), x, y);
      });
      g.textBaseline = 'alphabetic';
    }
  },
  down(p, api) {
    const S = api.size;
    const i = Math.min(2, Math.floor(p.x / (S / 3))) + 3 * Math.min(1, Math.floor(p.y / (S / 2)));
    this.d = { p0: p, key: i, dir: 0 };
  },
  move(p, api) { if (this.d) this.d.dir = this.dir(p, api.size); },
  up(p, api) {
    if (!this.d) return;
    const dir = this.dir(p, api.size), ch = FLICK_KEYS[this.d.key][dir];
    this.d = null;
    if (ch === '') return;
    if (ch === '\b') api.backspace(); else api.type(ch);
  },
});
