// Baseline: the scaffold's own design, ported as-is so we can benchmark against it.
// Top half: tap to enter the shown letter. Bottom-left/right: previous/next letter.
// '_' = space, '`' = delete (same as the scaffold).
registerMethod({
  id: 'baseline', name: 'Scaffold baseline',
  blurb: 'The provided design: scroll a-z with two buttons, tap the top to enter. Benchmark only.',
  init() { this.cur = 'a'.charCodeAt(0); },
  draw(g, S) {
    g.fillStyle = '#f00'; g.fillRect(0, S / 2, S / 2, S / 2);
    g.fillStyle = '#0f0'; g.fillRect(S / 2, S / 2, S / 2, S / 2);
    g.fillStyle = '#c8c8c8'; g.font = '14px sans-serif'; g.textAlign = 'center';
    g.fillText(String.fromCharCode(this.cur), S / 2, S / 4);
  },
  down(p, api) {
    if (p.y >= S2(api) && p.x < S2(api)) { if (this.cur <= 95) this.cur = 122; else this.cur--; }
    else if (p.y >= S2(api)) { if (this.cur >= 122) this.cur = 95; else this.cur++; }
    else {
      const c = String.fromCharCode(this.cur);
      if (c === '_') api.type(' ');
      else if (c === '`') api.backspace();
      else api.type(c);
    }
  },
});
function S2(api) { return api.size / 2; }
