#!/usr/bin/env python3
"""Dynamic AMZLOSS tool discovery.

Scans sitemap.xml + local page metadata, identifies public tools and
resources, and writes ``.github/tool_content_library.json`` used by the
content matrix generator. New tools are picked up automatically without
editing this script's sibling configuration.
"""
import json, os, re
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / ".github" / "tool_content_library.json"
SITEMAP = ROOT / "sitemap.xml"

# Strong tool-page signals; everything else is treated as regular content.
TOOL_SLUG_PATTERN = re.compile(r"(calculator|audit|rates|submit|directory|networks|link-tools|breakeven|commission|margin|revenue)", re.I)

# Fallback so first run is deterministic if sitemap is missing.
FALLBACK = [
    {"id": "audit",        "name": "Earnings Audit",           "page": "audit.html"},
    {"id": "calculator",   "name": "Commission Calculator",      "page": "calculator.html"},
    {"id": "rates",        "name": "Current Rate Table",          "page": "rates.html"},
    {"id": "networks",     "name": "Network Calculator",          "page": "networks.html"},
    {"id": "link-tools",   "name": "Link Tools",                  "page": "link-tools.html"},
    {"id": "submit",       "name": "URL Submitter",               "page": "submit.html"},
    {"id": "directory",    "name": "Backlink Directory",          "page": "directory.html"},
    {"id": "breakeven",    "name": "Break-Even Calculator",       "page": "breakeven.html"},
]

def page_slugs():
    if not SITEMAP.exists():
        return []
    text = SITEMAP.read_text(encoding="utf-8")
    return re.findall(r"<loc>\s*https://amzloss\.com/([^/]+\.html|)\s*</loc>", text)

def read_meta(path):
    if not path.exists():
        return {}, {}
    html = path.read_text(encoding="utf-8", errors="ignore")
    title_m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    desc_m = re.search(r'name="description"\s+content="([^"]+)"', html, re.I)
    title = title_m.group(1).strip() if title_m else ""
    desc = desc_m.group(1).replace("&amp;", "&").strip() if desc_m else ""
    # opportunistic: grab a first H1/H2 as a human-readable name hint
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.I | re.S)
    heading = re.sub(r"<[^>]+>", "", h1.group(1)).strip() if h1 else ""
    return {"title": title, "description": desc, "heading": heading}, html

def human_name(tool_id):
    return tool_id.replace("-", " ").replace(".html", "").title()

def content_ideas(tool):
    name = tool["name"]
    url = f"https://amzloss.com/{tool['page']}"
    return {
        "tiktok": [
            f"{name} explained in 30 seconds",
            f"Problem: {tool['problem']}",
            f"Stop wasting time — {name} does it instantly",
        ],
        "youtube_short": [
            f"{name} tutorial (beginner)",
            f"Real examples with {name}",
        ],
        "x": [
            f"Checking {name} before you publish? Worth it.",
        ],
        "linkedin": [
            f"Save hours weekly: {tool['audience']} now use {name}.",
        ],
        "pinterest": [
            f"Quick guide: {name} for affiliates",
        ],
        "seo_articles": [
            f"Ultimate guide to {tool['name'].lower()}",
            f"Why {tool['name'].lower()} matters for affiliate marketers",
        ],
        "cta": f"Try it free: {url}",
    }

def build():
    known = {}
    for fb in FALLBACK:
        known[fb["id"]] = dict(fb)

    seen = set()
    for slug in page_slugs():
        if not slug:
            continue
        # skip non-page entries in sitemap root
        if not slug.endswith(".html"):
            continue
        page = slug
        base = page[:-5]
        if base in seen:
            continue
        seen.add(base)
        # Only treat as a tool if the slug smells like a tool OR meta strongly hints
        if not TOOL_SLUG_PATTERN.search(page) and base not in known:
            continue
        meta, _ = read_meta(ROOT / page)
        existing = known.get(base)
        tool_src = dict(existing) if existing else {"name": human_name(base), "page": page}
        tool_src.setdefault("name", meta.get("heading") or human_name(base))
        tool_src.setdefault("problem", f"Affiliates need clarity about {base.replace('-', ' ')}")
        tool_src.setdefault("audience", "Amazon affiliates, affiliate marketers, SEO builders")
        entry = {
            "id": base,
            "name": tool_src["name"],
            "page": page,
            "title": meta.get("title", ""),
            "description": meta.get("description", ""),
            "problem": tool_src["problem"],
            "audience": tool_src["audience"],
            "content": content_ideas(tool_src),
        }
        known[base] = entry

    # make sure fallback order is preserved for stable daily rotation
    ordered = []
    for fb in FALLBACK:
        if fb["id"] in known:
            ordered.append(known.pop(fb["id"]))
    ordered.extend(known.values())
    ordered.sort(key=lambda t: t["id"])

    payload = {
        "generated": date.today().isoformat(),
        "count": len(ordered),
        "tools": ordered,
    }
    LIB.parent.mkdir(parents=True, exist_ok=True)
    LIB.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"DISCOVERED={len(ordered)} tools -> {LIB}", flush=True)
    for t in ordered:
        print(f"  - {t['id']} ({t['name']})", flush=True)

if __name__ == "__main__":
    build()