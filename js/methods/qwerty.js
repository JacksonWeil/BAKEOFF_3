// Shared QWERTY geometry used by the zoom and drag prototypes.
// 4 rows: three letter rows plus a bottom row [delete | space]. Coordinates are in "key units":
// each row is 10 units wide; returns rects scaled to an S x S area.
const QWERTY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
function qwertyKeys(S) {
  const rows = 4, rh = S / rows, kw = S / 10;
  const keys = [];
  QWERTY_ROWS.forEach((row, r) => {
    const off = (10 - row.length) / 2 * kw; // center shorter rows
    for (let i = 0; i < row.length; i++)
      keys.push({ ch: row[i], label: row[i], x: off + i * kw, y: r * rh, w: kw, h: rh });
  });
  keys.push({ ch: '\b', label: '⌫', x: 0, y: 3 * rh, w: 3 * kw, h: rh });
  keys.push({ ch: ' ', label: 'space', x: 3 * kw, y: 3 * rh, w: 7 * kw, h: rh });
  return keys;
}
function keyAt(keys, x, y) {
  // nearest key center (so gaps between centered rows still resolve to something sensible)
  let best = null, bd = Infinity;
  for (const k of keys) {
    if (x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) return k;
    const cx = Math.max(k.x, Math.min(x, k.x + k.w)), cy = Math.max(k.y, Math.min(y, k.y + k.h));
    const d = Math.hypot(x - cx, y - cy);
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}
function emit(api, ch) { if (ch === '\b') api.backspace(); else api.type(ch); }
