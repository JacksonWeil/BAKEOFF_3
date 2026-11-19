# Bakeoff 3: smartwatch text entry

Type a–z and space inside a 1" × 1" touch area. Goal: max WPM with >95% accuracy. No biasing toward the target phrase, no voice, no T9, and it must handle arbitrary strings like `hfgwmcwx`. Due **Sunday Nov 22**.

## Handoff (Thu Nov 19 → partner)

**State:** The harness, launcher, round-1 prototypes A (ZoomQWERTY), B (Slide & lift) and C (Flick keys), and round-2 prototypes D (Slide & lift v2) and E (QWERTY flick) are built, plus the scaffold baseline. The baseline runs on Jackson's phone. Round 1 feel test is done (see sections 3–4): Jackson leaned toward B, liked C's one-gesture-per-letter feel, and found non-QWERTY layouts hard. No timed runs are logged yet.

**Run and test (no Android needed, it's just a web page):**
1. Laptop: `python3 -m http.server 8000` in the repo, then open `http://<laptop-ip>:8000` on any phone on the same Wi-Fi. Or turn on GitHub Pages for this branch and use `https://jacksonweil.github.io/BAKEOFF_3/`.
2. On the launcher, calibrate DPI with a ruler (it's saved per device), set Phrases to 3–5 and your initials, and run each method.
3. Paste the launcher's "Copy as Markdown" rows into the test log below and write one line of notes per run.

**Ask the professor:** see "Rules questions" under section 1. The most important is word completion from a general word list, since it could be a big WPM gain.

**Next steps:**
- Time baseline vs D vs E for section 6. Earlier A/B/C timings would be a bonus for section 3.
- Pick the best one or two and refine them for round 2. Ideas: frequency-ordered letters, swipe for space/delete everywhere, tuning `&gain=` on B, and word completion if it's allowed.
- Keep recording short phone clips of each prototype for the video.

## How to run

It's plain HTML/JS with no build step. All touches and drawing for a method happen inside the 1" area, and the harness clips drawing to it.

- **Laptop:** `python3 -m http.server 8000` in this folder, then open http://localhost:8000.
- **Phone or tablet (same Wi-Fi):** run the same server, then open `http://<your-laptop-ip>:8000` on the phone.
- **Phone, anywhere (easiest for testers):** turn on GitHub Pages (repo Settings → Pages → deploy from branch → pick this branch, `/ (root)`), then open `https://jacksonweil.github.io/BAKEOFF_3/`.

`index.html` is the launcher. Set **DPI** so the gray box measures 1 inch with a ruler (the prof's Chrome is 110), set the number of phrases and the tester's initials, and pick a method. When a run finishes, the result is saved to that device's run log on the launcher. **Copy as Markdown** gives table rows to paste into the test log below.

The original scaffold is in `scaffold/` for reference. `scaffold/html/bakeoff3scaffold.html` runs as-is.

### Code map
| File | What |
|---|---|
| `js/harness.js` | Port of the scaffold: trials, Next button, Levenshtein errors, WPM and penalty math (unchanged). URL params `?m=<method>&trials=<n>&dpi=<n>&who=<initials>` |
| `js/registry.js` | `registerMethod()` plus small shared helpers (gesture classifier, `drawKey`) |
| `js/methods/*.js` | One file per text-entry method. Add a new one, add a `<script>` tag to `app.html` and `index.html`, and it shows up in the launcher |
| `js/phrases.js` | Phrase list copied from the scaffold |

---

## Video outline (8 required sections, ≤5 min)

### 1) Initial Ideas
Brainstorm (✅ = prototyped in round 1):
- ✅ **ZoomQWERTY:** a tiny QWERTY. Tap 1 zooms into the area you tapped, tap 2 picks the key. Space and delete are big enough to tap directly, and swipe right/left also work as space/delete.
- ✅ **Slide & lift QWERTY:** touch, slide while a magnified preview shows the key under your finger, lift to type. Lift off the face to cancel. Option: `&gain=0.5` makes the cursor move at half finger speed for finer control.
- ✅ **Flick keys:** 6 big keys with 5 characters each. Tap gives the center letter, flicking up/right/down/left gives the others (like Japanese flick input). Every gesture is exactly one character, so this is not T9.
- **3×3 two-tap grid:** first tap picks a group of 9 letters, second tap picks the letter (27 = 26 + space).
- **Swipe-direction alphabet:** draw a short stroke from one of 9 zones in one of 8 directions.
- **Edge/bezel strips:** letters around the edge of the face, slide along the edge and lift.
- **Rotary or scroll wheel:** circular drag through the alphabet. Probably slow.
- **Unistroke letters (Graffiti-like):** draw simplified letter shapes. Slow to learn and hard to recognize reliably.
- **Frequency-ordered layout:** put the most common letters (e, t, a, o, i, n, s, h, r) in the easiest positions of any of the above.
- **Word completion from a general English word list** *(rules question, see below)*.

Rules questions to ask the professor:
1. **Word completion or suggestions** from a generic English frequency list (e.g. Norvig's), not the phrase list. The user would still be able to type any string letter by letter.
2. **Flick / multi-letter keys:** confirm that "one key, several letters chosen by flick direction" is OK, since it's unambiguous (not T9 or multi-tap prediction).
3. **Swipe gestures that start inside the area but end slightly outside it**, e.g. a fast flick overshooting the edge.
4. **Zoom:** is a two-step zoom keyboard fine?

### 2) 1st Prototype
Round 1 web prototypes, all switchable from the launcher: **A: ZoomQWERTY**, **B: Slide & lift QWERTY**, **C: Flick keys**, plus the **scaffold baseline** ported 1:1 for benchmarking. *(Record a short phone video of each.)*

### 3) 1st Testing
**Round 1 done (Thu Nov 19).** Jackson tried each prototype for a few letters on his phone. This was a quick feel test with no timed runs logged.

- **A, ZoomQWERTY (two-step zoom):** Pretty intuitive and a good starting point.
- **B, Slide & lift:** At first it felt a little less intuitive than A, with more timing pressure. After a few letters he preferred it to A, because the screen always looks the same (no zoom jump).
- **C, Flick keys (swipe direction):** Not bad. He liked that each letter is a single tap or swipe instead of a two-step input. The interface doesn't look as nice as the others.
- **All of them:** It's hard to get used to the letter placements because we're so used to a full QWERTY keyboard.

### 4) 1st Refinement
Takeaways for round 2:
- **Familiar layout matters.** Keep QWERTY, or something that feels like it, rather than inventing a new arrangement. This counts against C's alphabetical layout.
- **One action per letter beats two.** C's single gesture felt good, and B is also one touch per letter. A's two taps are the slowest.
- **A stable screen is nicer than zoom jumps.** This favors B.
- Possible round 2 direction: keep B's fixed QWERTY, one touch per letter and preview bubble, and make it more forgiving with a slower cursor (`&gain=`) or bigger keys. Or a QWERTY-arranged flick hybrid that takes C's single gesture onto a familiar layout.
- C needs a visual cleanup if we keep it.

### 5) 2nd Prototype
Built Thu Nov 19 from the round 1 takeaways (QWERTY familiarity, one action per letter, a screen that stays still):
- **D, Slide & lift v2** (refines B, Jackson's favorite):
  - Taller letter rows.
  - The preview bubble shows the neighbor keys (`g [H] j`), so you know which way to slide.
  - A fast flick right types space and a fast flick left deletes; slow slides still pick letters.
  - Optional `&gain=0.6` URL param gives a slower, finer cursor.
- **E, QWERTY flick** (C's single gesture on a QWERTY layout): 9 big keys, each with up to 3 letters in QWERTY order (`qwe rty uio / asd fgh jkl / zxc vbn m·p`).
  - Tap gives the middle letter; flick left or right gives the side letters.
  - Flick down anywhere for space, flick up anywhere to delete.
  - `p` is the only letter that moved (to the bottom-right key, after `m`).
  - Each key is about 3x wider than a tiny-QWERTY key.
- Bug fix: the oversized ⌫ label on B.

### 6) 2nd Testing (benchmark vs scaffold)
*TODO: time baseline vs D vs E (same tester, same number of phrases, e.g. 5). Paste the rows into the test log and add 1–2 lines on feel. Things to watch:*
- *D: do fast flicks for space/delete ever fire by accident during a slow slide?*
- *E: is the moved `p` annoying? Is tapping or flicking more accurate than sliding?*

### 7) Refinement & Final Prototype (tour)
*TODO*

### 8) Final Testing (benchmark vs scaffold)
*TODO, plus issues we'd fix with more time.*

---

## Test log

Paste rows from the launcher's **Copy as Markdown** button. "Err" is Levenshtein errors over expected characters. The penalty starts above 5%.

| When | Method | Tester | Phrases | Raw WPM | Err | WPM w/ penalty | Notes |
|---|---|---|---|---|---|---|---|
| | baseline | | | | | | scaffold benchmark |

## Work log
- **Thu Nov 19 (pm, later):** Built round 2 prototypes D and E (section 5). Not tested yet.
- **Thu Nov 19 (pm):** Round 1 feel test by Jackson (notes in sections 3–4). Handing off to partner.
- **Thu Nov 19:** Ported the scaffold to plain JS with a method plug-in system and a launcher (DPI calibration, run log). Built round-1 prototypes A/B/C and wrote the idea list and rules questions.
