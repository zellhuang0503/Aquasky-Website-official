"""Build a six-language glossary from translation/sources/*.md.

Offline only. For every page file the English section is aligned with each other
language section by element-tag sequence (difflib), so lines that sit at the same
structural position are paired even when a language has a few extra blocks.

A pair becomes a glossary entry when the English text is short (a term, a heading,
a menu item, a table header), the other-language text differs from the English
(i.e. the old site really translated it), and neither side is just a number.

Outputs (default --out translation/glossary):
  glossary.md          one table: EN | zh | es | fr | ru | ar | source pages
  glossary.json        same data, machine readable (term -> lang -> variants -> pages)
  inconsistencies.md   terms the old site translated two or more different ways
  still-english.md     short EN strings that stay English on non-EN pages (untranslated)

Usage (repo root):
  python translation/build_glossary.py [--sources translation/sources] [--out translation/glossary]
"""

import argparse
import difflib
import json
import re
from collections import defaultdict
from pathlib import Path

LANGS = ["en", "zh", "es", "fr", "ru", "ar"]
TERM_TAGS = {"title", "h1", "h2", "h3", "h4", "li", "a", "th", "td", "caption",
             "button", "other", "label", "option", "p"}
MAX_TERM_CHARS = 90          # longer EN strings are sentences, not terms
LINE_RE = re.compile(r"^\[([a-z0-9]+)\] (.*)$")
NUMERIC_RE = re.compile(r"^[\s\d.,/+%°\"'″×x\-–]+$")
MODEL_RE = re.compile(r"^[A-Z]{2,5}\s?-?\s?\d+[A-Z]*$")   # LQC-8SS, PT-24 ...


def parse_sources(path: Path):
    """Return {lang: [(tag, text), ...]} and {lang: source_url} for one page file."""
    sections, urls = {}, {}
    lang = None
    for raw in path.read_text(encoding="utf-8").splitlines():
        if raw.startswith("## "):
            lang = raw[3:].strip()
            sections[lang] = []
            continue
        if lang is None:
            continue
        if raw.startswith("來源："):
            m = re.search(r"https?://\S+", raw)
            urls[lang] = m.group(0) if m else ""
            continue
        m = LINE_RE.match(raw)
        if m:
            sections[lang].append((m.group(1), m.group(2).strip()))
    return sections, urls


# Menu / footer items the old site breaks into two blocks; joined before alignment.
SPLITS = {
    ("DEPÓSITO DE", "GRAN TAMAÑO DL"): "DEPÓSITO DE GRAN TAMAÑO DL",          # es LARGE SIZE DL TANK
    ("RÉSERVOIR DL DE", "GRANDE TAILLE"): "RÉSERVOIR DL DE GRANDE TAILLE",     # fr
    ("БОЛЬШОЙ РАЗМЕР", "DL БАКА"): "БОЛЬШОЙ РАЗМЕР DL БАКА",                   # ru
    ("ASME認證", "工業式密閉膨脹水箱"): "ASME認證工業式密閉膨脹水箱",              # zh footer ASME TANK
}


def join_splits(blocks):
    out, i = [], 0
    while i < len(blocks):
        if i + 1 < len(blocks) and (blocks[i][1], blocks[i + 1][1]) in SPLITS:
            out.append((blocks[i][0], SPLITS[(blocks[i][1], blocks[i + 1][1])]))
            i += 2
        else:
            out.append(blocks[i])
            i += 1
    return out


NAV_START = "Toggle navigation"      # button that precedes the menu on every page
NAV_END = "اَلْعَرَبِيَّةُ"                 # last item of the language list closes the menu


def split_nav(blocks):
    """Return (nav_items, body_blocks). nav_items is [] on pages without the menu."""
    nav, body, inside, seen = [], [], False, False
    for tag, text in blocks:
        if not seen and text == NAV_START:
            inside, seen = True, True
            continue
        if inside:
            nav.append(text)
            if text == NAV_END:
                inside = False
            continue
        body.append((tag, text))
    return nav, body


def normalize_nav(lang, nav):
    """Make the old site's menu line up 1:1 with the English menu.

    The old site splits or adds a few menu items per language; these fixes were read
    off translation/sources (every page shows the same menu per language).
    Returns (items, extras): items has the English menu's length, extras are menu
    entries with no English counterpart.
    """
    nav = list(nav)
    extras = []
    if lang == "zh":
        extras.append(nav.pop(0))        # 關於溢康 = parent of 公司簡介 (COMPANY)
        extras.append(nav.pop(21))       # ESG產品, no English menu item
    return nav, extras


def align(en_blocks, other_blocks):
    """Pair EN and other-language blocks that sit in matching tag runs."""
    # Strings that appear verbatim on both sides (product names, numbers, model
    # numbers, language list) act as anchors; everything else matches by tag only.
    shared = {t for _, t in en_blocks} & {t for _, t in other_blocks}
    key = lambda blk: (blk[0], blk[1]) if blk[1] in shared else (blk[0],)
    en_tags = [key(b) for b in en_blocks]
    ot_tags = [key(b) for b in other_blocks]
    sm = difflib.SequenceMatcher(a=en_tags, b=ot_tags, autojunk=False)
    pairs = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                pairs.append((en_blocks[i1 + k], other_blocks[j1 + k]))
    return pairs


def is_term(tag, text):
    if tag not in TERM_TAGS:
        return False
    if len(text) > MAX_TERM_CHARS:
        return False
    if NUMERIC_RE.match(text) or MODEL_RE.match(text):
        return False
    if text.lower().startswith(("http", "www.")):
        return False
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sources", default="translation/sources")
    ap.add_argument("--out", default="translation/glossary")
    args = ap.parse_args()
    src = Path(args.sources)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    # term -> lang -> variant -> set(pages)
    glossary = defaultdict(lambda: defaultdict(lambda: defaultdict(set)))
    # term -> lang -> set(pages) where the text stayed English
    still_en = defaultdict(lambda: defaultdict(set))
    term_tag = {}
    nav_extras = defaultdict(lambda: defaultdict(set))   # lang -> item -> pages

    for f in sorted(src.glob("*.md")):
        page = f.stem
        sections, _ = parse_sources(f)
        if "en" not in sections:
            continue
        for lang in LANGS[1:]:
            if lang not in sections:
                continue
            en_nav, en_body = split_nav(sections["en"])
            ot_nav, ot_body = split_nav(join_splits(sections[lang]))
            pairs = align(en_body, ot_body)
            if en_nav and ot_nav:
                ot_items, extras = normalize_nav(lang, ot_nav)
                if len(ot_items) == len(en_nav):
                    pairs += [(("li", e), ("li", o)) for e, o in zip(en_nav, ot_items)]
                    for x in extras:
                        nav_extras[lang][x].add(page)
                else:
                    print(f"WARN {page}/{lang}: menu has {len(ot_items)} items, EN {len(en_nav)}")
            for (etag, etext), (otag, otext) in pairs:
                if not is_term(etag, etext):
                    continue
                if NUMERIC_RE.match(otext):
                    continue
                term_tag.setdefault(etext, etag)
                if otext == etext:
                    still_en[etext][lang].add(page)
                else:
                    glossary[etext][lang][otext].add(page)

    # ---- glossary.md / glossary.json ----
    def tag_rank(t):
        order = ["title", "h1", "h2", "h3", "h4", "caption", "th", "td", "li", "a",
                 "button", "label", "option", "other", "p"]
        return order.index(t) if t in order else len(order)

    terms = sorted(glossary, key=lambda t: (tag_rank(term_tag[t]), t.lower()))
    lines = [
        "# 六語系術語表（從 2026-10-22 封存的舊站既有譯文整理）",
        "",
        "產生方式：`python translation/build_glossary.py`，只讀 `translation/sources/`，不連網。",
        "每一列是舊站真的翻過的字串；同一語系若有兩種以上譯法會用「／」並列並加 ⚠，細節見 inconsistencies.md。",
        "「來源頁」是該譯法出現的頁面（對應 sources/<頁>.md）。空格＝該語系舊站沒翻（仍是英文或沒有這個區塊）。",
        "",
        f"共 {len(terms)} 條。",
        "",
        "| 元素 | EN | zh | es | fr | ru | ar | 來源頁 |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    data = {}
    inconsistent = []
    for t in terms:
        row = [term_tag[t], t.replace("|", "\\|")]
        pages = set()
        data[t] = {"tag": term_tag[t], "langs": {}}
        for lang in LANGS[1:]:
            variants = glossary[t].get(lang, {})
            if not variants:
                row.append("")
                continue
            ordered = sorted(variants.items(), key=lambda kv: -len(kv[1]))
            cell = " ／ ".join(v.replace("|", "\\|") for v, _ in ordered)
            if len(ordered) > 1:
                cell = "⚠ " + cell
                inconsistent.append((t, lang, ordered))
            row.append(cell)
            data[t]["langs"][lang] = {v: sorted(p) for v, p in ordered}
            for _, p in ordered:
                pages |= p
        row.append(", ".join(sorted(pages)))
        lines.append("| " + " | ".join(row) + " |")
    (out / "glossary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (out / "glossary.json").write_text(json.dumps(data, ensure_ascii=False, indent=1),
                                       encoding="utf-8")

    # ---- inconsistencies.md ----
    lines = ["# 舊站同一英文字串在同一語系有兩種以上譯法", "",
             "翻新稿時要挑一種；建議挑出現頁數多的那種，或請該語系審稿人裁決。", ""]
    for t, lang, ordered in inconsistent:
        lines.append(f"- **{t}**（{lang}）")
        for v, p in ordered:
            lines.append(f"  - {v} ← {', '.join(sorted(p))}")
    if not inconsistent:
        lines.append("（無）")
    if nav_extras:
        lines += ["", "## 舊站選單裡英文版沒有的項目", ""]
        for lang, items in sorted(nav_extras.items()):
            for x, p in items.items():
                lines.append(f"- {lang}：{x}（{len(p)} 頁）")
    (out / "inconsistencies.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # ---- still-english.md ----
    lines = ["# 非英文頁面上仍是英文的短字串", "",
             "舊站沒翻的字；新站翻譯時要補。括號內是出現該情況的語系：頁數。", ""]
    rows = sorted(still_en.items(), key=lambda kv: (tag_rank(term_tag[kv[0]]), kv[0].lower()))
    for t, per_lang in rows:
        if t in glossary and all(lang in glossary[t] for lang in per_lang):
            continue  # translated somewhere in every language; not a gap
        detail = ", ".join(f"{lang}:{len(p)}" for lang, p in sorted(per_lang.items()))
        lines.append(f"- [{term_tag[t]}] {t}（{detail}）")
    (out / "still-english.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"terms: {len(terms)}  inconsistent: {len(inconsistent)}  "
          f"still-english: {sum(1 for _ in rows)}  -> {out}")


if __name__ == "__main__":
    main()
