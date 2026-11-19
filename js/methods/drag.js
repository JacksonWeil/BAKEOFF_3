// Prototype B: Slide-and-lift QWERTY.
// Touch anywhere, a magnified preview shows which key is under your finger; slide to fix it
// and lift to type it. Slide off the watch face and lift to cancel.
// Optional ?gain=0.5 makes the cursor move at half your finger speed (finer control).
registerMethod({
  id: 'drag', name: 'B: Slide & lift QWERTY',
  blurb: 'Touch, slide until the preview shows the right key, lift to type. Lift off-screen to cancel.',
  init(api) {
    this.keys = qwertyKeys(api.size); this.d = null;
    this.gain = parseFloat(new URLSearchParams(location.search).get('gain')) || 1;
  },
  reset() { this.d = null; },
  cursor(p) { const d = this.d; return { x: d.p0.x + (p.x - d.p0.x) * this.gain, y: d.p0.y + (p.y - d.p0.y) * this.gain }; },
  draw(g, S) {
    for (const k of this.keys) {
      const hot = this.d && !this.d.out && this.d.key === k;
      drawKey(g, k.x, k.y, k.w, k.h, k.label, {
        fill: hot ? '#ffd54f' : (k.ch === ' ' || k.ch === '\b' ? '#cfd8dc' : '#eee'),
        font: k.label.length > 1 ? 9 : k.ch === '\b' ? k.h * 0.6 : k.w * 0.9,
      });
    }
    if (this.d) {
      // preview bubble in the half of the screen away from the finger
      const bw = S * 0.42, bh = S * 0.36;
      const by = this.d.cur.y > S / 2 ? 2 : S - bh - 2;
      const bx = Math.max(2, Math.min(S - bw - 2, this.d.cur.x - bw / 2));
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(bx + 2, by + 2, bw, bh);
      const label = this.d.out ? '✕' : (this.d.key.ch === ' ' ? '␣' : this.d.key.label);
      drawKey(g, bx, by, bw, bh, label, { fill: this.d.out ? '#ef9a9a' : '#fff', font: bh * 0.8, bold: true });
      if (this.gain !== 1) { g.fillStyle = '#d32f2f'; g.beginPath(); g.arc(this.d.cur.x, this.d.cur.y, 2.5, 0, 7); g.fill(); }
    }
  },
  update(p, S) {
    const c = this.cursor(p); this.d.cur = c;
    this.d.out = p.x < -2 || p.y < -2 || p.x > S + 2 || p.y > S + 2;
    this.d.key = keyAt(this.keys, Math.max(0, Math.min(S, c.x)), Math.max(0, Math.min(S, c.y)));
  },
  down(p, api) { this.d = { p0: p }; this.update(p, api.size); },
  move(p, api) { if (this.d) this.update(p, api.size); },
  up(p, api) {
    if (!this.d) return;
    this.update(p, api.size);
    const d = this.d; this.d = null;
    if (d.out || p.cancelled) return;
    emit(api, d.key.ch);
  },
});
