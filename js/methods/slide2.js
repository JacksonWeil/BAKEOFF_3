// Round 2, prototype D: Slide & lift v2 (refines B, Jackson's favorite in round 1).
// Same idea: touch, slide until the preview shows your key, lift to type. The screen never changes.
// Changes from B:
//  - Taller letter rows (82% of the face instead of 75%), so landing on the right key is easier.
//  - The preview shows the neighbors too ([w] E [r]), so you know which way to slide.
//  - Quick flicks: a fast swipe right = space and a fast swipe left = delete, with no hunting
//    for the bottom row. Slow slides still pick letters as before.
//  - The bottom row still has delete and space.
//  - Optional &gain=0.6 slows the cursor down for finer corrections (a red dot shows the cursor).
registerMethod({
  id: 'slide2', name: 'D: Slide & lift v2',
  blurb: 'B, refined: taller keys, preview shows neighbors, fast flick right = space / left = delete.',
  FLICK_MS: 220,
  init(api) {
    this.keys = qwertyKeys(api.size, 0.82); this.d = null;
    this.gain = parseFloat(new URLSearchParams(location.search).get('gain')) || 1;
  },
  reset() { this.d = null; },
  neighbors(k) {
    const row = this.keys.filter(o => Math.abs(o.y - k.y) < 1).sort((a, b) => a.x - b.x);
    const i = row.indexOf(k);
    return [row[i - 1], row[i + 1]];
  },
  draw(g, S) {
    for (const k of this.keys) {
      const hot = this.d && !this.d.out && this.d.key === k;
      drawKey(g, k.x, k.y, k.w, k.h, k.label, {
        fill: hot ? '#ffd54f' : (k.ch === ' ' || k.ch === '\b' ? '#cfd8dc' : '#eee'),
        font: k.label.length > 1 ? 9 : k.ch === '\b' ? k.h * 0.6 : k.w * 0.95,
      });
    }
    if (!this.d) return;
    const bh = S * 0.3, by = this.d.cur.y > S / 2 ? 2 : S - bh - 2;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(2, by + 2, S - 4, bh);
    if (this.d.out) { drawKey(g, 2, by, S - 4, bh, '✕ cancel', { fill: '#ef9a9a', font: bh * 0.4 }); return; }
    const k = this.d.key, [L, R] = this.neighbors(k), cw = S * 0.4, sw = (S - 4 - cw) / 2;
    const lab = o => !o ? '' : o.ch === ' ' ? '␣' : o.label;
    drawKey(g, 2, by, sw, bh, lab(L), { fill: '#f5f5f5', color: '#888', font: bh * 0.5 });
    drawKey(g, 2 + sw, by, cw, bh, lab(k), { fill: '#fff', font: bh * 0.85, bold: true });
    drawKey(g, 2 + sw + cw, by, sw, bh, lab(R), { fill: '#f5f5f5', color: '#888', font: bh * 0.5 });
    if (this.gain !== 1) { g.fillStyle = '#d32f2f'; g.beginPath(); g.arc(this.d.cur.x, this.d.cur.y, 2.5, 0, 7); g.fill(); }
  },
  update(p, S) {
    const d = this.d;
    const c = { x: d.p0.x + (p.x - d.p0.x) * this.gain, y: d.p0.y + (p.y - d.p0.y) * this.gain };
    d.cur = c;
    d.out = p.x < -2 || p.y < -2 || p.x > S + 2 || p.y > S + 2;
    d.key = keyAt(this.keys, Math.max(0, Math.min(S, c.x)), Math.max(0, Math.min(S, c.y)));
  },
  down(p, api) { this.d = { p0: p }; this.update(p, api.size); },
  move(p, api) { if (this.d) this.update(p, api.size); },
  up(p, api) {
    if (!this.d) return;
    const S = api.size, d = this.d; this.d = null;
    const fast = p.t - d.p0.t < this.FLICK_MS, gest = Gesture.classify(d.p0, p, S, 0.3);
    if (fast && gest === 'right') return api.type(' ');
    if (fast && gest === 'left') return api.backspace();
    this.d = d; this.update(p, S); this.d = null;
    if (d.out || p.cancelled) return;
    emit(api, d.key.ch);
  },
});
