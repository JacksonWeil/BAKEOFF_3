// Methods call registerMethod({...}) when their script loads. Load this file first.
// A method object looks like:
//   { id, name, blurb,
//     init(api), reset(api),               // optional; reset runs at the start of each phrase
//     draw(g, S, api),                     // g is a 2D canvas context already translated to the
//                                          // top-left of the 1" area and clipped to it; S = side in px
//     down(p, api), move(p, api), up(p, api) }  // p = {x, y, t, cancelled?} in area coordinates
// api: type(ch), backspace(), typed(), now(), size
const METHODS = {};
function registerMethod(m) { METHODS[m.id] = m; }

// Shared helpers for methods
const Gesture = {
  // classify a finished touch: 'tap' or 'left'/'right'/'up'/'down' swipe
  classify(down, up, S, minFrac = 0.3) {
    const dx = up.x - down.x, dy = up.y - down.y;
    const d = Math.hypot(dx, dy);
    if (d < S * minFrac) return 'tap';
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  },
};

function drawKey(g, x, y, w, h, label, opts = {}) {
  g.fillStyle = opts.fill || '#eee';
  g.fillRect(x + 0.5, y + 0.5, w - 1, h - 1);
  g.fillStyle = opts.color || '#111';
  g.font = (opts.bold ? 'bold ' : '') + (opts.font || Math.max(7, Math.min(w, h) * 0.6)) + 'px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, x + w / 2, y + h / 2 + 0.5);
  g.textBaseline = 'alphabetic';
}
