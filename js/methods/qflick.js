// Round 2, prototype E: QWERTY flick keys (C's one-gesture-per-letter on a familiar layout).
// The QWERTY rows are cut into big keys of up to 3 letters, drawn in their usual QWERTY order:
//   [q w e][r t y][u i o]
//   [a s d][f g h][j k l]
//   [z x c][v b n][ m  p ]   <- p moves down here; it's the only letter out of its usual spot
// Tap = middle letter, flick left = left letter, flick right = right letter.
// Flick down anywhere = space, flick up anywhere = delete (the bottom row has them too).
// Each key is about 3x as wide as a normal tiny-QWERTY key. The screen stays still and a small strip shows
// which letter you'll get before you lift.
const QF_ROWS = [
  [['q', 'w', 'e'], ['r', 't', 'y'], ['u', 'i', 'o']],
  [['a', 's', 'd'], ['f', 'g', 'h'], ['j', 'k', 'l']],
  [['z', 'x', 'c'], ['v', 'b', 'n'], ['m', 'm', 'p']], // left flick or tap = m, right = p
];
registerMethod({
  id: 'qflick', name: 'E: QWERTY flick',
  blurb: 'Big QWERTY keys with 3 letters each. Tap = middle, flick left/right = sides. Flick down = space, up = delete.',
  LETTER_FRAC: 0.8,
  init() { this.d = null; },
  reset() { this.d = null; },
  hit(p, S) {
    const rh = S * this.LETTER_FRAC / 3;
    if (p.y >= 3 * rh) return p.x < S * 0.3 ? { special: '\b' } : { special: ' ' };
    return { r: Math.max(0, Math.min(2, Math.floor(p.y / rh))), c: Math.max(0, Math.min(2, Math.floor(p.x / (S / 3)))) };
  },
  choice(p, S) {
    const d = this.d, dx = p.x - d.p0.x, dy = p.y - d.p0.y;
    if (Math.hypot(dx, dy) < S * 0.09) return d.k.special ? { ch: d.k.special } : { ch: QF_ROWS[d.k.r][d.k.c][1], i: 1 };
    if (Math.abs(dy) > Math.abs(dx)) return { ch: dy > 0 ? ' ' : '\b', i: -1 };
    if (d.k.special) return { ch: d.k.special };
    const i = dx > 0 ? 2 : 0;
    return { ch: QF_ROWS[d.k.r][d.k.c][i], i };
  },
  draw(g, S) {
    const rh = S * this.LETTER_FRAC / 3, kw = S / 3;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const set = QF_ROWS[r][c], x = c * kw, y = r * rh;
      const active = this.d && this.d.k.r === r && this.d.k.c === c;
      g.fillStyle = active ? '#fff3c4' : '#eceff1'; g.fillRect(x + 1, y + 1, kw - 2, rh - 2);
      const letters = set[0] === set[1] ? [null, set[1], set[2]] : set;
      letters.forEach((ch, i) => {
        if (!ch) return;
        g.fillStyle = i === 1 ? '#000' : '#455a64';
        g.font = (i === 1 ? 'bold ' : '') + rh * (i === 1 ? 0.56 : 0.42) + 'px sans-serif';
        g.fillText(ch, x + kw * (0.18 + 0.32 * i), y + rh / 2 + 1);
      });
    }
    const by = 3 * rh, bh = S - by;
    drawKey(g, 0, by, S * 0.3, bh, '⌫', { fill: '#cfd8dc', font: bh * 0.6 });
    drawKey(g, S * 0.3, by, S * 0.7, bh, 'space', { fill: '#cfd8dc', font: bh * 0.45 });
    g.textBaseline = 'alphabetic';
    if (this.d && this.d.cur) { // preview strip, on the half away from the finger
      const ph = S * 0.26, py = this.d.p0.y > S / 2 ? 2 : S - ph - 2;
      const ch = this.d.cur.ch, lab = ch === ' ' ? '␣ space' : ch === '\b' ? '⌫ delete' : ch;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(4, py + 2, S - 6, ph);
      drawKey(g, 2, py, S - 4, ph, lab, { fill: '#fff', font: ph * (ch.length && ch >= 'a' ? 0.85 : 0.45), bold: true });
    }
  },
  down(p, api) { this.d = { p0: p, k: this.hit(p, api.size) }; this.d.cur = this.choice(p, api.size); },
  move(p, api) { if (this.d) this.d.cur = this.choice(p, api.size); },
  up(p, api) {
    if (!this.d) return;
    const c = this.choice(p, api.size); this.d = null;
    emit(api, c.ch);
  },
});
