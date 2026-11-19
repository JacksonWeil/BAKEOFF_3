// Prototype A: ZoomQWERTY (two-tap zoom keyboard).
// Tap 1 anywhere on the tiny QWERTY zooms in around that spot (3x wide, 2x tall) so keys become
// big enough to hit; tap 2 picks the key and zooms back out.
// Space and delete are big enough to hit directly without zooming.
// Shortcuts at the zoomed-out level: swipe right = space, swipe left = delete.
// While zoomed in, any swipe cancels back out.
registerMethod({
  id: 'zoom', name: 'A: ZoomQWERTY',
  blurb: 'Tap to zoom into a tiny QWERTY, tap again to pick the key. Swipe right = space, left = delete.',
  ZX: 3, ZY: 2,
  init(api) { this.keys = qwertyKeys(api.size); this.zoom = null; this.d = null; },
  reset() { this.zoom = null; },
  view(S) { // returns the transform from keyboard coords to screen coords
    if (!this.zoom) return { sx: 1, sy: 1, ox: 0, oy: 0 };
    const vw = S / this.ZX, vh = S / this.ZY;
    const ox = Math.max(0, Math.min(S - vw, this.zoom.x - vw / 2));
    const rh = S / 4, rowCenter = (Math.floor(this.zoom.y / rh) + 0.5) * rh; // center on the tapped row
    const oy = Math.max(0, Math.min(S - vh, rowCenter - vh / 2));
    return { sx: this.ZX, sy: this.ZY, ox, oy };
  },
  draw(g, S) {
    const v = this.view(S);
    for (const k of this.keys) {
      const x = (k.x - v.ox) * v.sx, y = (k.y - v.oy) * v.sy, w = k.w * v.sx, h = k.h * v.sy;
      if (x > S || y > S || x + w < 0 || y + h < 0) continue;
      const hot = this.d && this.d.key === k;
      drawKey(g, x, y, w, h, k.label, {
        fill: hot ? '#ffd54f' : (k.ch === ' ' || k.ch === '\b' ? '#cfd8dc' : '#eee'),
        font: k.label.length > 1 ? Math.min(h * 0.45, 12) : Math.min(w, h) * 0.75,
      });
    }
    if (this.zoom) { g.strokeStyle = '#1e88e5'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, S - 3, S - 3); }
  },
  toKb(p, S) { const v = this.view(S); return { x: p.x / v.sx + v.ox, y: p.y / v.sy + v.oy }; },
  down(p, api) {
    const kp = this.toKb(p, api.size);
    this.d = { p, key: this.zoom ? keyAt(this.keys, kp.x, kp.y) : null };
  },
  move(p, api) {
    if (this.d && this.zoom) { const kp = this.toKb(p, api.size); this.d.key = keyAt(this.keys, kp.x, kp.y); }
  },
  up(p, api) {
    const S = api.size, d = this.d; this.d = null;
    if (!d) return;
    const gest = Gesture.classify(d.p, p, S, 0.3);
    if (this.zoom) {
      if (gest !== 'tap' || p.cancelled) { this.zoom = null; return; }
      const kp = this.toKb(p, S);
      emit(api, keyAt(this.keys, kp.x, kp.y).ch);
      this.zoom = null;
      return;
    }
    if (p.cancelled) return;
    if (gest === 'right') return api.type(' ');
    if (gest === 'left') return api.backspace();
    if (gest !== 'tap') return;
    const k = keyAt(this.keys, p.x, p.y);
    if (k.ch === ' ' || k.ch === '\b') return emit(api, k.ch); // big keys: no zoom needed
    this.zoom = { x: p.x, y: p.y };
  },
});
