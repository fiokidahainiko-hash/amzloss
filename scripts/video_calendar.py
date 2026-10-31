#!/usr/bin/env python3
"""Build the AMZLOSS tool-video calendar.

Maps every day from today until 2027-01-01 to one of the 8 tools (rotating
in the CONTENT_GUIDE.md order, never repeating the same tool back-to-back)
with a problem-first narration built from per-tool hook + body + CTA fields.

Outputs ``.github/talkvid/video_calendar.json`` used by ``toolvid.py`` and
the posting pipeline.
"""
import json
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".github" / "talkvid" / "video_calendar.json"

# Rotation order follows CONTENT_GUIDE.md (audit -> calculator -> rate table ->
# network calc -> directory -> submitter), then the remaining verified tools.
TOOLS = [
    {"id": "audit",      "name": "Earnings Audit",        "page": "audit.html",       "img": "tool-audit.png",
     "body": "The AmzLoss audit compares every order in your Amazon earnings report against the rate that applied that day, flags possible underpayments and exports a print-ready claim file - in your browser, nothing uploaded. You verify; AmzLoss surfaces what to check."},
    {"id": "calculator", "name": "Commission Calculator", "page": "calculator.html",  "img": "tool-calculator.png",
     "body": "The AmzLoss commission calculator shows what a sale should earn at today's real rate by market and category - the same sales can mean very different paychecks once the rate changes."},
    {"id": "rates",      "name": "Current Rate Table",    "page": "rates.html",       "img": "tool-rates.png",
     "body": "The AmzLoss rate table keeps every 2026 category and marketplace side by side, current versus previous - so you stop building content around numbers that already changed."},
    {"id": "networks",   "name": "Network Calculator",    "page": "networks.html",    "img": "tool-networks.png",
     "body": "The AmzLoss network calculator compares typical commission ranges across ShareASale, CJ, Impact, Awin, Rakuten and more - advisory ranges to help you diversify, not guaranteed payouts."},
    {"id": "directory",  "name": "Backlink Directory",    "page": "directory.html",   "img": "tool-directory.png",
     "body": "The AmzLoss backlink directory helps you discover relevant, real places to get listed - a good backlink is a bridge to your site, not a rank guarantee."},
    {"id": "submit",     "name": "URL Submitter",         "page": "submit.html",      "img": "tool-submit.png",
     "body": "The AmzLoss submitter fires your URL to search engines that accept IndexNow and walks you through dozens more - every submission doubles as a backlink. It removes the manual chaos, not indexing physics."},
    {"id": "links",      "name": "Link Tools",            "page": "link-tools.html",  "img": "tool-links.png",
     "body": "The AmzLoss link tools build clean tagged links, count any domain's backlinks and check your links are still alive - one silent dead link eats every future click."},
    {"id": "breakeven",  "name": "Break-Even Calculator", "page": "breakeven.html",   "img": "tool-breakeven.png",
     "body": "The AmzLoss break-even calculator shows the real per-sale cost of a discounted product and how many sales you would need to break even - sometimes the answer is to skip the deal."},
]

HOOKS = [
    "Your traffic is not changing. Your payout might be.",
    "Planning your whole business around a number that already changed?",
    "Same work, different network, completely different paycheck.",
    "One silent dead link is future commissions you never see.",
    "Fifty tabs, one by one. There is a calmer way.",
    "That great deal might quietly cost you money.",
    "You cannot fix what you cannot see in your own report.",
    "The number changed. Did you notice?",
]

CTAS = {
    "audit":      ["Audit your last report free at amzloss.com.", "See what to check in your report at amzloss.com."],
    "calculator": ["Calculate a commission at amzloss.com.", "Check a sale before you post at amzloss.com."],
    "rates":      ["Check today's rates at amzloss.com.", "Stop using last year's numbers at amzloss.com."],
    "networks":   ["Compare networks at amzloss.com.", "Diversify with real ranges at amzloss.com."],
    "directory":  ["Find your free backlink at amzloss.com.", "Discover backlink opportunities at amzloss.com."],
    "submit":     ["Simplify submission at amzloss.com.", "Submit free at amzloss.com."],
    "links":      ["Check your links at amzloss.com.", "Build clean links at amzloss.com."],
    "breakeven":  ["Do the math at amzloss.com.", "Check the deal before you post at amzloss.com."],
}

def main():
    start = date(2026, 8, 30)
    end = date(2027, 1, 1)
    entries = []
    tool_idx = 0
    prev_id = None
    day = start
    while day < end:
        # pick next tool that isn't the previous one
        for _ in range(len(TOOLS)):
            tool = TOOLS[tool_idx % len(TOOLS)]
            tool_idx += 1
            if tool["id"] != prev_id:
                break
        hook = HOOKS[tool_idx % len(HOOKS)]
        cta = CTAS[tool["id"]][tool_idx % 2]
        entries.append({
            "date": day.isoformat(),
            "tool_id": tool["id"],
            "tool_name": tool["name"],
            "page": tool["page"],
            "img": tool["img"],
            "hook": hook,
            "body": tool["body"],
            "cta": cta,
            "script": f"{hook} {tool['body']} {cta}",
            "title": f"{tool['name']} (AmzLoss)",
        })
        prev_id = tool["id"]
        day += timedelta(days=1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"count": len(entries), "entries": entries}, indent=2), encoding="utf-8")
    print(f"VIDEO_CALENDAR={OUT}")
    print(f"Total videos scheduled: {len(entries)} (to {end.isoformat()})")
    first_tools = [e["tool_id"] for e in entries[:12]]
    print("Sample rotation:", " -> ".join(first_tools))

if __name__ == "__main__":
    main()