#!/usr/bin/env python3
"""Validate a categorical palette the way Chart Forge requires — don't eyeball colorblind safety, compute it.

Usage:
  python3 validate_palette.py "#2f6fe4,#ee7146,#1aa37f" --mode light
  python3 validate_palette.py "#4d8cf0,#e2673c,#1f9f7c" --mode dark --surface "#17181c"
  python3 validate_palette.py --from-json ../assets/palette.json            # checks both modes of the shipped palette
  python3 validate_palette.py "#93b4f2,#6a98ec,#3f7ae6" --ordinal            # a light→dark single-hue ramp

Checks (adjacent pairs, because bars / stacks / lines put neighbours side by side):
  1. lightness band        OKLCH L inside 0.43–0.77 (light) / 0.48–0.67 (dark)
  2. chroma floor          OKLCH C >= 0.10 (grays cannot carry identity)
  3. CVD separation        OKLab ΔE×100 >= 8 under protan / deutan simulation (6–8 = WARN, needs labels); tritan reported
  4. normal-vision floor   OKLab ΔE×100 >= 15
  5. contrast vs surface   >= 3:1, otherwise WARN: ship direct labels or the table view
Exit code 1 on any FAIL.
"""
import argparse, json, math, sys

def hex2rgb(h):
    h = h.strip().lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

def lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def unlin(c): c = max(0.0, min(1.0, c)); return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055

def oklab(rgb):
    r, g, b = (lin(x) for x in rgb)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (x ** (1 / 3) if x > 0 else -((-x) ** (1 / 3)) for x in (l, m, s))
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)

def de(a, b): return 100 * math.sqrt(sum((x - y) ** 2 for x, y in zip(oklab(a), oklab(b))))
def lum(rgb): r, g, b = (lin(x) for x in rgb); return 0.2126 * r + 0.7152 * g + 0.0722 * b
def contrast(a, b): la, lb = lum(a), lum(b); hi, lo = max(la, lb), min(la, lb); return (hi + 0.05) / (lo + 0.05)

# Machado, Oliveira & Fernandes 2009 — severity 1.0 matrices, applied in linear RGB
CVD = {
    'protan': [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    'deutan': [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    'tritan': [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}
def simulate(rgb, kind):
    r, g, b = (lin(x) for x in rgb); M = CVD[kind]
    return tuple(unlin(M[i][0] * r + M[i][1] * g + M[i][2] * b) for i in range(3))

def lc(rgb):
    L, a, b = oklab(rgb); return L, math.sqrt(a * a + b * b)

def check(colors, mode, surface, ordinal=False, pairs='adjacent'):
    rgbs = [hex2rgb(c) for c in colors]; surf = hex2rgb(surface); fails = 0
    def line(status, name, msg):
        nonlocal fails
        if status == 'FAIL': fails += 1
        print(f"  [{status}] {name:<22} {msg}")
    print(f"Palette ({mode}, surface {surface}, {'ordinal ramp' if ordinal else 'categorical'}): {len(colors)} slots")
    if ordinal:
        Ls = [lc(c)[0] for c in rgbs]
        mono = all(Ls[i] > Ls[i + 1] for i in range(len(Ls) - 1)) or all(Ls[i] < Ls[i + 1] for i in range(len(Ls) - 1))
        line('PASS' if mono else 'FAIL', 'Lightness monotone', 'steps read light→dark' if mono else 'steps are not monotone')
        gaps = [abs(Ls[i] - Ls[i + 1]) for i in range(len(Ls) - 1)]
        line('PASS' if min(gaps) >= 0.06 else 'FAIL', 'Adjacent ΔL', f'min gap {min(gaps):.3f} (>= 0.06)')
        light_end = min(rgbs, key=lambda c: abs(lum(c) - lum(surf)))
        cr = contrast(light_end, surf)
        line('PASS' if cr >= 2 else 'FAIL', 'Light-end contrast', f'{cr:.2f}:1 vs surface (>= 2:1)')
        return fails
    lo, hi = (0.43, 0.77) if mode == 'light' else (0.48, 0.67)
    bad = [(c, round(lc(r)[0], 3)) for c, r in zip(colors, rgbs) if not (lo <= lc(r)[0] <= hi)]
    line('PASS' if not bad else 'FAIL', 'Lightness band', f'all inside L {lo}–{hi}' if not bad else f'outside band: {bad}')
    badc = [(c, round(lc(r)[1], 3)) for c, r in zip(colors, rgbs) if lc(r)[1] < 0.10]
    line('PASS' if not badc else 'FAIL', 'Chroma floor', 'all >= 0.10' if not badc else f'too gray: {badc}')
    idx = [(i, i + 1) for i in range(len(rgbs) - 1)] if pairs == 'adjacent' else [(i, j) for i in range(len(rgbs)) for j in range(i + 1, len(rgbs))]
    worst = None; tri = None
    for i, j in idx:
        for kind in ('protan', 'deutan'):
            d = de(simulate(rgbs[i], kind), simulate(rgbs[j], kind))
            if worst is None or d < worst[0]: worst = (d, colors[i], colors[j], kind)
        dt = de(simulate(rgbs[i], 'tritan'), simulate(rgbs[j], 'tritan'))
        if tri is None or dt < tri: tri = dt
    if worst:
        st = 'PASS' if worst[0] >= 8 else ('WARN' if worst[0] >= 6 else 'FAIL')
        line(st, 'CVD separation', f'worst {pairs} {worst[1]}↔{worst[2]} ΔE {worst[0]:.1f} ({worst[3]}) · tritan {tri:.1f} — red/green gate >= 8; 6–8 only with labels/gaps')
        wn = min((de(rgbs[i], rgbs[j]), colors[i], colors[j]) for i, j in idx)
        line('PASS' if wn[0] >= 15 else 'FAIL', 'Normal-vision floor', f'worst {pairs} {wn[1]}↔{wn[2]} ΔE {wn[0]:.1f} (>= 15)')
    low = [(c, round(contrast(r, surf), 2)) for c, r in zip(colors, rgbs) if contrast(r, surf) < 3]
    line('PASS' if not low else 'WARN', 'Contrast vs surface', 'all >= 3:1' if not low else f'below 3:1 — ship direct labels or the table view: {low}')
    return fails

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('colors', nargs='?', help='comma-separated hex colours')
    ap.add_argument('--mode', choices=['light', 'dark'], default='light')
    ap.add_argument('--surface', help='chart surface hex (default light #fffffe / dark #17181c)')
    ap.add_argument('--ordinal', action='store_true')
    ap.add_argument('--pairs', choices=['adjacent', 'all'], default='adjacent', help='use all for scatter and bubble charts')
    ap.add_argument('--from-json', help='validate both palettes in palette.json')
    a = ap.parse_args()
    fails = 0
    if a.from_json:
        pj = json.load(open(a.from_json, encoding='utf-8'))
        for mode in ('light', 'dark'):
            surf = pj['chrome'][mode]['surface']
            fails += check(pj['categorical'][mode], mode, surf); print()
            fails += check(pj['categorical'][mode][:3], mode, surf, pairs='all'); print()
            fails += check(pj['ordinal'][mode], mode, surf, ordinal=True); print()
    else:
        if not a.colors: ap.error('pass a colour list or --from-json')
        surf = a.surface or ('#fffffe' if a.mode == 'light' else '#17181c')
        fails = check([c.strip() for c in a.colors.split(',')], a.mode, surf, a.ordinal, a.pairs)
    print('→ ALL CHECKS PASS' if not fails else f'→ FAILED ({fails})')
    sys.exit(1 if fails else 0)

if __name__ == '__main__':
    main()
