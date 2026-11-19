"""Rank and graph Bakeoff 3 runs.

    python plot_results.py                          # reads results/runs.csv
    python plot_results.py extra.csv more.csv       # also merge CSVs from the launcher's "Download CSV"
    python plot_results.py --tester JW              # only one tester (repeatable)
    python plot_results.py --since 2026-11-20       # only runs on/after a date
    python plot_results.py --show                   # also open the chart window

Writes results/results.png and prints a ranked table. Versions are ranked by mean
"WPM w/ penalty" (the bakeoff score). The chart also shows seconds per character
(pure speed) and error rate, so you can see *why* a version wins or loses.
"""
import argparse
import sys
from pathlib import Path

import matplotlib
import pandas as pd

ROOT = Path(__file__).resolve().parent
DEFAULT_CSV = ROOT / "results" / "runs.csv"
OUT_PNG = ROOT / "results" / "results.png"

# Validated categorical palette (fixed order, never cycled) + marker shapes as a
# second cue so tester identity never relies on color alone.
TESTER_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"]
TESTER_MARKERS = ["o", "s", "D", "^", "v", "P"]
SURFACE, INK, INK_2, GRID = "#fcfcfb", "#0b0b0b", "#52514e", "#e6e5e1"
BAR, BAR_BEST = "#b7d3f6", "#5598e7"  # blue ramp 150 / 350: bars recede, best one stands out


def load(paths, testers, since):
    frames = []
    for p in paths:
        p = Path(p)
        if not p.exists():
            print(f"(skipping {p}: not found)")
            continue
        frames.append(pd.read_csv(p, dtype={"tester": str}, keep_default_na=False))
    if not frames:
        sys.exit("No results yet. Run some trials with `python serve.py` running, then try again.")
    df = pd.concat(frames, ignore_index=True)
    df = df.drop_duplicates(subset="run_id", keep="first")

    for c in ["time_ms", "letters_entered", "letters_expected", "errors", "raw_wpm", "penalty", "wpm_penalized", "trials"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=["wpm_penalized", "time_ms"])
    df["tester"] = df["tester"].str.strip().str.upper().replace("", "?")
    df["label"] = df.apply(lambda r: r["method_name"] or r["method"], axis=1)
    df["sec_per_char"] = (df["time_ms"] / 1000) / df["letters_entered"].where(df["letters_entered"] > 0)
    df["error_pct"] = 100 * df["errors"] / df["letters_expected"].where(df["letters_expected"] > 0)
    df["date"] = pd.to_datetime(df["date"], errors="coerce", utc=True)

    if testers:
        df = df[df["tester"].isin([t.upper() for t in testers])]
    if since:
        df = df[df["date"] >= pd.Timestamp(since, tz="UTC")]
    if df.empty:
        sys.exit("No runs match those filters.")
    return df


def summarize(df):
    s = (df.groupby("label")
           .agg(runs=("run_id", "count"),
                testers=("tester", lambda t: ",".join(sorted(set(t)))),
                score=("wpm_penalized", "mean"), score_sd=("wpm_penalized", "std"),
                raw_wpm=("raw_wpm", "mean"),
                sec_per_char=("sec_per_char", "mean"),
                error_pct=("error_pct", "mean"))
           .sort_values("score", ascending=False))
    return s


def print_table(s):
    print()
    print(f"{'rank':<5}{'version':<28}{'runs':>5}  {'WPM w/ pen':>10} {'(sd)':>6}  {'raw WPM':>8}  {'s/char':>7}  {'err %':>6}  testers")
    for i, (name, r) in enumerate(s.iterrows(), 1):
        sd = "" if pd.isna(r.score_sd) else f"{r.score_sd:.2f}"
        print(f"{i:<5}{name[:27]:<28}{int(r.runs):>5}  {r.score:>10.2f} {sd:>6}  {r.raw_wpm:>8.2f}  "
              f"{r.sec_per_char:>7.2f}  {r.error_pct:>6.1f}  {r.testers}")
    best = s.index[0]
    print(f"\nBest by score: {best}  ({s.iloc[0].score:.2f} WPM w/ penalty)")
    fastest = s["sec_per_char"].idxmin()
    if fastest != best:
        print(f"Fastest raw speed: {fastest}  ({s.loc[fastest, 'sec_per_char']:.2f} s/char), but it loses on errors")
    thin = s.index[s["runs"] < 3].tolist()
    if thin:
        print(f"Only 1-2 runs (treat as a rough guess): {', '.join(thin)}")


def plot(df, s, show):
    if not show:
        matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    order = list(s.index)                       # best at the top
    ypos = {name: i for i, name in enumerate(order)}
    testers = sorted(df["tester"].unique())
    style = {t: (TESTER_COLORS[i % len(TESTER_COLORS)], TESTER_MARKERS[i % len(TESTER_MARKERS)])
             for i, t in enumerate(testers)}

    panels = [
        ("score", "wpm_penalized", "WPM w/ penalty  (higher = better)", "{:.1f}"),
        ("sec_per_char", "sec_per_char", "Seconds per character  (lower = faster)", "{:.2f}"),
        ("error_pct", "error_pct", "Error rate %  (5% is free)", "{:.1f}%"),
    ]
    h = max(2.6, 0.55 * len(order) + 1.6)
    fig, axes = plt.subplots(1, 3, figsize=(14, h), sharey=True, facecolor=SURFACE,
                             gridspec_kw={"width_ratios": [1.3, 1, 1]})

    for ax, (col, runcol, title, fmt) in zip(axes, panels):
        ax.set_facecolor(SURFACE)
        vals = s[col]
        colors = [BAR_BEST if i == 0 else BAR for i in range(len(order))]
        ax.barh(range(len(order)), vals.values, height=0.62, color=colors, edgecolor=SURFACE, linewidth=2, zorder=2)
        # each run as a dot, jittered vertically so overlapping runs stay visible
        for t, grp in df.groupby("tester"):
            c, m = style[t]
            y = grp["label"].map(ypos) + (grp.groupby("label").cumcount() - 0.5 * (grp.groupby("label")["label"].transform("count") - 1)) * 0.08
            ax.scatter(grp[runcol], y, s=46, color=c, marker=m, edgecolor=SURFACE, linewidth=1.5, zorder=3,
                       label=t if ax is axes[0] else None)
        xmax = max(vals.max(), df[runcol].max())
        for i, v in enumerate(vals.values):  # mean value at the end of each bar
            ax.text(xmax * 1.09, i, fmt.format(v), va="center", ha="left", fontsize=10,
                    color=INK if i == 0 else INK_2, fontweight="bold" if i == 0 else "normal")
        if col == "error_pct":
            ax.axvline(5, color=INK_2, linewidth=1, linestyle=(0, (4, 3)), zorder=2.5)
        ax.set_xlim(0, xmax * 1.3 if xmax > 0 else 1)
        ax.set_title(title, loc="left", fontsize=11, color=INK, pad=8)
        ax.grid(axis="x", color=GRID, linewidth=1, zorder=0)
        ax.tick_params(colors=INK_2, length=0, labelsize=9)
        for side in ["top", "right", "left"]:
            ax.spines[side].set_visible(False)
        ax.spines["bottom"].set_color(GRID)

    axes[0].set_yticks(range(len(order)))
    axes[0].set_yticklabels([f"{n}  (n={int(s.loc[n, 'runs'])})" for n in order], fontsize=10, color=INK)
    axes[0].invert_yaxis()

    fig.suptitle(f"Bakeoff 3 versions ranked by score  ·  best: {order[0]}  ·  "
                 f"bars = mean, markers = individual runs", x=0.01, ha="left", fontsize=12, color=INK)
    if len(testers) > 1:
        fig.legend(title="Tester", loc="upper right", frameon=False, ncol=len(testers), fontsize=9, title_fontsize=9)
    elif testers:
        fig.text(0.99, 0.97, f"Tester: {testers[0]}", ha="right", va="top", fontsize=9, color=INK_2)
    fig.tight_layout(rect=(0, 0, 1, 0.92))

    OUT_PNG.parent.mkdir(exist_ok=True)
    fig.savefig(OUT_PNG, dpi=160, facecolor=SURFACE)
    print(f"\nChart saved to {OUT_PNG.relative_to(ROOT)}")
    if show:
        plt.show()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv", nargs="*", help="extra CSV files to merge (from the launcher's Download CSV)")
    ap.add_argument("--tester", action="append", help="only include this tester's initials (repeatable)")
    ap.add_argument("--since", help="only runs on/after this date, e.g. 2026-11-20")
    ap.add_argument("--show", action="store_true", help="open the chart in a window too")
    a = ap.parse_args()

    paths = [DEFAULT_CSV] + a.csv
    df = load(paths, a.tester, a.since)
    s = summarize(df)
    print_table(s)
    plot(df, s, a.show)


if __name__ == "__main__":
    main()
