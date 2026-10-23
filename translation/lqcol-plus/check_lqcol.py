"""Consistency check for the LQCOL-PLUS six-language drafts.

Reads translation/lqcol-plus/LQCOL-PLUS.<lang>.md for zh, es, fr, ru, ar. Each file is
a list of blocks:

    ### B05 · p
    EN: <English source text, one line>
    ZH: <translation, one line>          (the key is the upper-case language code)

Checks, per block and per language:
  1. every language file has the same block ids with byte-identical EN text
  2. no empty translation
  3. the multiset of numbers (12, 0.5, 3/4, 100 ...) is identical to the EN text
  4. the multiset of model numbers (LQC-8, LQC-24SS ...) is identical
  5. every protected term (brand, material grades, standards, acronyms, units) appears
     exactly as often as in the EN text, as a whole word
  6. number+unit pairs (2 bar, 30 psi, 90°C, 0.5L, 100%, 100 kW) are identical
  7. Arabic text uses Western digits (so numbers stay searchable and comparable)

Exit code 1 when anything fails. Usage (repo root):
  python translation/lqcol-plus/check_lqcol.py
"""

import re
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent
LANGS = ["zh", "es", "fr", "ru", "ar"]

# Must stay verbatim in every translation (whole-word match, case-sensitive).
PROTECTED = [
    "AQUASKY", "LQCOL", "LQC", "SUS304", "316L", "EPDM", "PG25", "N₂",
    "G/NPT/BSP", "CDU", "QD", "HPC", "AI", "TDP", "ZSPOF",
    "O-ring", "kW", "In-Rack", "In-Row",
]
# An English plural "s" (CDUs, QDs) counts as the same term; zh/ru/ar have no plural.
NUM_RE = re.compile(r"\d+(?:[.,]\d+)?")
MODEL_RE = re.compile(r"LQC\s*-\s*(\d+)\s*(SS)?")
UNIT_RE = re.compile(r"\d\s*(L|bar|psi|kW|°C|°F|%)(?![A-Za-z])", re.IGNORECASE)
ARABIC_DIGITS = re.compile(r"[٠-٩۰-۹]")
BLOCK_RE = re.compile(r"^### (B\d+)(?: · (\S+))?\s*$")


def parse(path: Path, lang: str):
    blocks = {}
    cur = None
    for ln, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        m = BLOCK_RE.match(raw)
        if m:
            cur = m.group(1)
            blocks[cur] = {"tag": m.group(2) or "", "en": None, "tr": None, "line": ln}
            continue
        if cur is None:
            continue
        if raw.startswith("EN: "):
            blocks[cur]["en"] = raw[4:].strip()
        elif raw.startswith(lang.upper() + ": "):
            blocks[cur]["tr"] = raw[len(lang) + 2:].strip()
    return blocks


def word_count(term, text):
    pat = r"(?<![A-Za-z0-9₂])" + re.escape(term) + r"s?(?![A-Za-z0-9₂])"
    return len(re.findall(pat, text))


def models(text):
    return Counter(f"LQC-{n}{ss or ''}" for n, ss in MODEL_RE.findall(text))


def units(text):
    return Counter(u.lower() for u in UNIT_RE.findall(text))


def main():
    problems = 0
    files = {l: parse(HERE / f"LQCOL-PLUS.{l}.md", l) for l in LANGS}
    ref_lang = LANGS[0]
    ref = files[ref_lang]

    for lang in LANGS:
        blocks = files[lang]
        if set(blocks) != set(ref):
            problems += 1
            print(f"[{lang}] block ids differ from {ref_lang}: "
                  f"missing {sorted(set(ref) - set(blocks))}, extra {sorted(set(blocks) - set(ref))}")
        for bid, b in blocks.items():
            where = f"[{lang} {bid} L{b['line']}]"
            if b["en"] is None:
                problems += 1
                print(f"{where} no EN line")
                continue
            if bid in ref and ref[bid]["en"] != b["en"]:
                problems += 1
                print(f"{where} EN text differs from {ref_lang} file")
            tr = b["tr"]
            if not tr:
                problems += 1
                print(f"{where} empty translation")
                continue
            en = b["en"]
            if lang == "ar" and ARABIC_DIGITS.search(tr):
                problems += 1
                print(f"{where} Arabic-Indic digits used; keep Western digits")
            n_en, n_tr = Counter(NUM_RE.findall(en)), Counter(NUM_RE.findall(tr))
            if n_en != n_tr:
                problems += 1
                print(f"{where} numbers differ: EN {sorted(n_en.elements())} vs {sorted(n_tr.elements())}")
            m_en, m_tr = models(en), models(tr)
            if m_en != m_tr:
                problems += 1
                print(f"{where} model numbers differ: EN {dict(m_en)} vs {dict(m_tr)}")
            u_en, u_tr = units(en), units(tr)
            if u_en != u_tr:
                problems += 1
                print(f"{where} number+unit pairs differ: EN {dict(u_en)} vs {dict(u_tr)}")
            for term in PROTECTED:
                c_en, c_tr = word_count(term, en), word_count(term, tr)
                if c_en != c_tr:
                    problems += 1
                    print(f"{where} '{term}' appears {c_en}x in EN, {c_tr}x in translation")

    total = sum(len(b) for b in files.values())
    if problems:
        print(f"\n{problems} problem(s) in {total} blocks")
        sys.exit(1)
    print(f"OK: {total} blocks across {len(LANGS)} languages, all checks passed")


if __name__ == "__main__":
    main()
