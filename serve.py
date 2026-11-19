"""Local test server for Bakeoff 3.

    python serve.py            (port 8000)
    python serve.py 8080       (another port)

- Serves this folder with caching turned off, so phones always get the latest code.
- Saves every finished run that a phone POSTs to /api/results:
    results/runs.csv    one row per run (tester, method, time, WPM, penalty, ...)
    results/trials.csv  one row per phrase (phrase, what was typed, errors, time)
- Then graph them with:  python plot_results.py
"""
import csv
import http.server
import json
import os
import socket
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / "results"
RUNS_CSV = RESULTS / "runs.csv"
TRIALS_CSV = RESULTS / "trials.csv"

RUN_FIELDS = ["run_id", "date", "tester", "method", "method_name", "trials", "dpi",
              "time_ms", "letters_entered", "letters_expected", "errors",
              "raw_wpm", "penalty", "wpm_penalized", "device"]
TRIAL_FIELDS = ["run_id", "date", "tester", "method", "trial", "phrase", "typed",
                "chars_expected", "chars_typed", "errors", "ms"]

_lock = threading.Lock()


def append_rows(path, fields, rows):
    path.parent.mkdir(exist_ok=True)
    new = not path.exists() or path.stat().st_size == 0
    with open(path, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        if new:
            w.writeheader()
        w.writerows(rows)


def already_saved(run_id):
    if not run_id or not RUNS_CSV.exists():
        return False
    with open(RUNS_CSV, newline="", encoding="utf-8") as f:
        return any(r.get("run_id") == run_id for r in csv.DictReader(f))


def save_run(run):
    run_id = str(run.get("runId", ""))
    with _lock:
        if already_saved(run_id):  # phone retried; don't double count
            return "duplicate"
        append_rows(RUNS_CSV, RUN_FIELDS, [{
            "run_id": run_id, "date": run.get("date", ""), "tester": run.get("tester", ""),
            "method": run.get("method", ""), "method_name": run.get("methodName", ""),
            "trials": run.get("trials", ""), "dpi": run.get("dpi", ""),
            "time_ms": run.get("timeMs", ""), "letters_entered": run.get("entered", ""),
            "letters_expected": run.get("expected", ""), "errors": run.get("errors", ""),
            "raw_wpm": run.get("wpm", ""), "penalty": run.get("penalty", ""),
            "wpm_penalized": run.get("wpmPenalized", ""), "device": run.get("device", ""),
        }])
        append_rows(TRIALS_CSV, TRIAL_FIELDS, [{
            "run_id": run_id, "date": run.get("date", ""), "tester": run.get("tester", ""),
            "method": run.get("method", ""), "trial": i + 1,
            "phrase": t.get("phrase", ""), "typed": t.get("typed", ""),
            "chars_expected": len(t.get("phrase", "")), "chars_typed": len(t.get("typed", "")),
            "errors": t.get("errors", ""), "ms": t.get("ms", ""),
        } for i, t in enumerate(run.get("trialLog", []))])
    return "saved"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()

    def send_head(self):
        for h in ("If-Modified-Since", "If-None-Match"):  # never answer 304 with a stale copy
            if h in self.headers:
                del self.headers[h]
        return super().send_head()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/results":
            self.send_error(404)
            return
        try:
            n = int(self.headers.get("Content-Length", 0))
            if n <= 0 or n > 1_000_000:
                raise ValueError("bad length")
            run = json.loads(self.rfile.read(n).decode("utf-8"))
            status = save_run(run)
            print(f"  -> {status}: {run.get('tester') or '?'} / {run.get('method')} / "
                  f"{run.get('wpmPenalized')} WPM w/ penalty")
            body, code = json.dumps({"ok": True, "status": status}).encode(), 200
        except Exception as e:  # noqa: BLE001 - report any bad payload back to the phone
            body, code = json.dumps({"ok": False, "error": str(e)}).encode(), 400
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # no packet is sent; just picks the outgoing interface
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    os.chdir(ROOT)
    print(f"Serving {ROOT}")
    print(f"  laptop: http://localhost:{port}")
    print(f"  phone (same Wi-Fi): http://{lan_ip()}:{port}")
    print(f"  results -> {RUNS_CSV.relative_to(ROOT)}, {TRIALS_CSV.relative_to(ROOT)}")
    http.server.ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
