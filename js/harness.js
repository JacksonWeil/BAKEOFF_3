// Bakeoff 3 harness: a plain-JavaScript port of the scaffold (bakeoff3scaffold.html).
// Trial flow, error counting (Levenshtein) and WPM/penalty math are copied from the scaffold
// so our numbers are directly comparable to the scaffold baseline. Only the 1"x1" input area
// is handed to the selected text-entry method (see js/methods/*.js).
//
// URL params:  ?m=<method id>  &trials=<n>  &dpi=<pixels per inch>
//   dpi falls back to the value saved on the launcher page (localStorage), then 110 (prof's Chrome).

const params = new URLSearchParams(location.search);
function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

const DPI = parseFloat(params.get('dpi')) || parseFloat(safeGet('bakeoff3_dpi')) || 110;
const SIZE = DPI * 1; // 1 inch square, in CSS pixels
const totalTrialNum = parseInt(params.get('trials')) || 3; // scaffold default is 2; ~10 at the real bakeoff

// ---- scaffold state (same names as the scaffold) ----
let currTrialNum = 0, startTime = 0, finishTime = 0, lastTime = 0;
let lettersEnteredTotal = 0, lettersExpectedTotal = 0, errorsTotal = 0;
let currentPhrase = '', currentTyped = '';
let phrases = PHRASES.slice();
const trialLog = [];

// Same (slightly biased) shuffle as the scaffold's setup()
for (let i = 0; i < phrases.length; i++) {
  const r = Math.floor(Math.random() * phrases.length);
  const t = phrases[i]; phrases[i] = phrases[r]; phrases[r] = t;
}

// ---- canvas + layout ----
const canvas = document.getElementById('c');
const g = canvas.getContext('2d');
let W = 0, H = 0;
const area = { x: 0, y: 0, s: SIZE };
const nextBtn = { x: 0, y: 0, w: 0, h: 0 };

function layout() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  area.x = Math.round(W / 2 - SIZE / 2);
  area.y = Math.round(Math.max(130, H / 2 - SIZE / 2));
  nextBtn.w = Math.min(160, W * 0.4); nextBtn.h = 70;
  nextBtn.x = W / 2 - nextBtn.w / 2;
  nextBtn.y = Math.min(H - nextBtn.h - 10, area.y + SIZE + 60);
}
window.addEventListener('resize', layout);
layout();

// ---- API handed to methods ----
const api = {
  type(ch) { if (startTime && !finishTime) currentTyped += ch; },
  backspace() { if (currentTyped.length > 0) currentTyped = currentTyped.substring(0, currentTyped.length - 1); },
  typed() { return currentTyped; },
  now() { return performance.now(); },
  size: SIZE,
};

const methodId = params.get('m') || 'baseline';
const method = METHODS[methodId];
if (!method) { document.body.innerHTML = '<p>Unknown method "' + methodId + '". <a href="index.html">Back</a></p>'; throw new Error('unknown method'); }
document.title = 'Bakeoff 3 – ' + method.name;
if (method.init) method.init(api);

function millis() { return performance.now(); }

// ---- drawing ----
function draw() {
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.textBaseline = 'alphabetic';

  if (finishTime !== 0) { drawResults(); requestAnimationFrame(draw); return; }

  // 1" watch area background
  g.fillStyle = '#646464';
  g.fillRect(area.x, area.y, SIZE, SIZE);

  if (startTime === 0) {
    g.fillStyle = '#808080'; g.font = '16px sans-serif'; g.textAlign = 'center';
    g.fillText('Tap anywhere to start time!', W / 2, 60);
    g.font = '12px sans-serif';
    g.fillText(method.name + '  ·  ' + totalTrialNum + ' phrases  ·  ' + DPI + ' DPI', W / 2, 84);
  } else {
    g.textAlign = 'left'; g.fillStyle = '#808080'; g.font = '14px sans-serif';
    const lx = 12;
    g.fillText('Phrase ' + (currTrialNum + 1) + ' of ' + totalTrialNum, lx, 24);
    // shrink the monospace font so the longest line fits narrow phone screens
    const longest = 9 + Math.max(currentPhrase.length, currentTyped.length + 1);
    const fs = Math.max(9, Math.min(16, (W - 2 * lx) / (longest * 0.6)));
    g.font = fs + 'px monospace';
    g.fillStyle = '#333';
    g.fillText('Target:  ' + currentPhrase, lx, 56);
    g.fillText('Entered: ' + currentTyped + '|', lx, 84);

    // next button (outside the 1" area, allowed)
    g.fillStyle = '#e53935'; g.fillRect(nextBtn.x, nextBtn.y, nextBtn.w, nextBtn.h);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 18px sans-serif';
    g.fillText('NEXT >', nextBtn.x + nextBtn.w / 2, nextBtn.y + nextBtn.h / 2 + 6);

    // the method draws ONLY inside the 1" area (clipped to enforce it)
    g.save();
    g.beginPath(); g.rect(area.x, area.y, SIZE, SIZE); g.clip();
    g.translate(area.x, area.y);
    method.draw(g, SIZE, api);
    g.restore();
  }
  requestAnimationFrame(draw);
}

function drawResults() {
  const wpm = (lettersEnteredTotal / 5.0) / ((finishTime - startTime) / 60000);
  const freebieErrors = lettersExpectedTotal * .05;
  const penalty = Math.max(errorsTotal - freebieErrors, 0) * .5;
  const lines = [
    'Trials complete! (' + method.name + ')',
    'Total time taken: ' + (finishTime - startTime).toFixed(0),
    'Total letters entered: ' + lettersEnteredTotal,
    'Total letters expected: ' + lettersExpectedTotal,
    'Total errors entered: ' + errorsTotal,
    'Raw WPM: ' + wpm.toFixed(3),
    'Freebie errors: ' + freebieErrors.toFixed(3),
    'Penalty: ' + penalty.toFixed(3),
    'WPM w/ penalty: ' + (wpm - penalty).toFixed(3),
    '',
    saveStatus,
    'Also kept in the launcher\'s run log.',
    'Tap here to go back.',
  ];
  g.fillStyle = '#000'; g.textAlign = 'center'; g.font = '16px sans-serif';
  lines.forEach((l, i) => g.fillText(l, W / 2, 80 + i * 24));
}

// ---- input ----
function inArea(p) { return p.x >= area.x && p.x <= area.x + SIZE && p.y >= area.y && p.y <= area.y + SIZE; }
function inNext(p) { return p.x >= nextBtn.x && p.x <= nextBtn.x + nextBtn.w && p.y >= nextBtn.y && p.y <= nextBtn.y + nextBtn.h; }
function local(e) { return { x: e.clientX - area.x, y: e.clientY - area.y, t: performance.now(), id: e.pointerId }; }

let activePointer = null; // one finger at a time inside the watch area
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  const p = { x: e.clientX, y: e.clientY };
  if (finishTime !== 0) { location.href = 'index.html'; return; }
  if (startTime === 0) { nextTrial(); return; } // first tap starts the timer (scaffold behavior)
  if (inNext(p)) { nextTrial(); return; }
  if (inArea(p) && activePointer === null) {
    activePointer = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    method.down && method.down(local(e), api);
  }
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== activePointer) return;
  e.preventDefault();
  method.move && method.move(local(e), api);
});
function endPointer(e, cancelled) {
  if (e.pointerId !== activePointer) return;
  activePointer = null;
  const p = local(e);
  p.cancelled = cancelled || !(p.x >= 0 && p.y >= 0 && p.x <= SIZE && p.y <= SIZE);
  method.up && method.up(p, api);
}
canvas.addEventListener('pointerup', e => endPointer(e, false));
canvas.addEventListener('pointercancel', e => endPointer(e, true));
// Enter = Next, handy when testing on a laptop
window.addEventListener('keydown', e => { if (e.key === 'Enter') nextTrial(); });

// ---- trial logic (ported from the scaffold) ----
function nextTrial() {
  if (currTrialNum >= totalTrialNum) return;

  if (startTime !== 0 && finishTime === 0) {
    const errs = computeLevenshteinDistance(currentTyped.trim(), currentPhrase.trim());
    const rec = {
      phrase: currentPhrase, typed: currentTyped, errors: errs,
      ms: Math.round(millis() - lastTime),
    };
    trialLog.push(rec);
    console.log('==================\nPhrase ' + (currTrialNum + 1) + ' of ' + totalTrialNum +
      '\nTarget phrase: ' + currentPhrase + '\nUser typed: ' + currentTyped +
      '\nNumber of errors: ' + errs + '\nTime taken on this trial: ' + rec.ms);
    lettersExpectedTotal += currentPhrase.length;
    lettersEnteredTotal += currentTyped.length;
    errorsTotal += errs;
  }

  // (startTime guard added so trials=1 works; the scaffold ends instantly with 1 trial)
  if (startTime !== 0 && currTrialNum === totalTrialNum - 1) {
    finishTime = millis();
    const wpm = (lettersEnteredTotal / 5.0) / ((finishTime - startTime) / 60000);
    const freebieErrors = lettersExpectedTotal * .05;
    const penalty = Math.max(errorsTotal - freebieErrors, 0) * .5;
    saveRun({
      runId: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      method: methodId, methodName: method.name, date: new Date().toISOString(), tester: params.get('who') || '',
      device: W + 'x' + H + ' ' + (navigator.userAgent.match(/\(([^)]*)\)/) || ['', ''])[1],
      dpi: DPI, trials: totalTrialNum, timeMs: Math.round(finishTime - startTime),
      entered: lettersEnteredTotal, expected: lettersExpectedTotal, errors: errorsTotal,
      wpm: +wpm.toFixed(3), penalty: +penalty.toFixed(3), wpmPenalized: +(wpm - penalty).toFixed(3),
      trialLog,
    });
    currTrialNum++;
    return;
  }

  if (startTime === 0) startTime = millis();
  else currTrialNum++;

  lastTime = millis();
  currentTyped = '';
  currentPhrase = phrases[currTrialNum];
  if (method.reset) method.reset(api);
}

let saveStatus = 'Saving to results CSV...';

function saveRun(run) {
  console.log('RUN RESULT', JSON.stringify(run));
  // 1) device-local run log (launcher table, Download CSV)
  let runs = [];
  try { runs = JSON.parse(safeGet('bakeoff3_runs') || '[]'); } catch (e) {}
  runs.push(run);
  safeSet('bakeoff3_runs', JSON.stringify(runs));
  // 2) results/runs.csv + results/trials.csv on the laptop (only when served by serve.py)
  fetch('api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(run) })
    .then(r => r.json().catch(() => ({ ok: false })))
    .then(j => { saveStatus = j.ok ? 'Saved to results/runs.csv on the laptop.' : 'NOT saved to CSV (server said no). Use Download CSV.'; })
    .catch(() => { saveStatus = 'NOT saved to CSV (no serve.py). Use Download CSV.'; });
}

// unchanged from the scaffold
function computeLevenshteinDistance(phrase1, phrase2) {
  const distance = [];
  for (let i = 0; i <= phrase1.length; i++) { distance[i] = []; distance[i][0] = i; }
  for (let j = 1; j <= phrase2.length; j++) distance[0][j] = j;
  for (let i = 1; i <= phrase1.length; i++)
    for (let j = 1; j <= phrase2.length; j++)
      distance[i][j] = Math.min(Math.min(distance[i - 1][j] + 1, distance[i][j - 1] + 1),
        distance[i - 1][j - 1] + ((phrase1.charAt(i - 1) === phrase2.charAt(j - 1)) ? 0 : 1));
  return distance[phrase1.length][phrase2.length];
}

requestAnimationFrame(draw);
