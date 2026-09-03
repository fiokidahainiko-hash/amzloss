# AmzLoss SEO Intelligence — Data Integration Guide

This guide explains every optional data feed the SEO engine can consume,
what fields each requires, how to export the data from GSC / Ahrefs /
Semrush / GA4, and how the "no fabrication" guarantee works.

The system is designed so that **search volume, rankings, backlinks, and
traffic are NEVER invented**. Those numbers only appear when you fill the
corresponding feed file with real data. Everything else (entity coverage,
technical audits, content gaps, decay, cannibalization, topical authority)
is derived deterministically from the **real** HTML files in `blogs/` and
the site content audit.

---

## 1. Feed file quick reference

All live feeds live in `intelligence/seo/data/` and are read at runtime by
`site_data.mjs` loaders. A missing or `{}` feed is treated as
"not provided" — the engine gracefully falls back to
`DATA_UNAVAILABLE` / `provided: false` / `count: 0` templates.

| File | Purpose | Read by | Provided ⇒ |
|------|---------|---------|-----------|
| `keyword_research_feed.json` | External keyword research (volume, difficulty, CPC) | `keyword_intelligence.mjs` | `keywords[].metrics.volume.available` |
| `serp_snapshot.json` | Real SERP observations per query | `serp_analysis.mjs`, `entity_coverage.mjs` | `SERPSnapshots.provided` |
| `competitor_feed.json` | Competitor URLs + topic lists | `competitor_gaps.mjs` | `competitors_count` |
| `backlink_feed.json` | Unlinked mentions / resource pages | `backlinks.mjs` | `backlinks.provided` |
| `traffic_feed.json` | Per-page GSC/GA4 traffic | `performance.mjs` | `measured_count` |
| `gsc_feed.json` | Search Console query export | `orchestrator/gsc.mjs` | `gscSummary().feed_available` |
| `rank_tracking.json` | Keyword→URL position history | `orchestrator/rank_tracking.mjs` | `rankSummary().feed_available` |
| `analytics_feed.json` | Landing-page + conversion data | `orchestrator/analytics.mjs` | `analyticsSummary().feed_available` |
| `content_decay_history.json` | Historical traffic snapshots for decay detection | `orchestrator/content_decay.mjs` | decay trend signals |

### Sample data files

A set of realistic **example** exports ships alongside:
`gsc_sample.json`, `rank_tracking_sample.json`, `competitor_sample.json`,
`analytics_sample.json`, `backlink_sample.json`. These are **examples only**
— rename/copy them to the live feed names below when you have real data.

---

## 2. Required fields per feed

### `gsc_feed.json`
```jsonc
{
  "queries": [
    { "query": "amazon commission cut",
      "impressions": 12100, "clicks": 743,
      "ctr": 0.0614, "position": 4.8,
      "page": "amazon-2026-commission-cuts" }
  ],
  "pages": [ { "page": "...", "query": "...", "position": 4, "impressions": 900 } ],
  "countries": ["US"], "devices": ["desktop"],
  "dates": [ { "date": "2026-08-01", "impressions": 4500 } ]
}
```

### `rank_tracking.json`
```jsonc
{
  "rankings": [
    { "keyword": "amazon commission cut", "url": "amazon-2026-commission-cuts",
      "position": 3, "source": "rank_tracker", "geo": "US",
      "device": "desktop", "date": "2026-09-01",
      "serp_features": ["featured_snippet"] }
  ],
  "history": [
    { "keyword": "amazon commission cut", "url": "amazon-2026-commission-cuts",
      "position": 6, "date": "2026-08-01", "change": 0 }
  ]
}
```

### `competitor_feed.json`
```jsonc
{
  "competitors": [
    { "domain": "affiliatepayouts.example",
      "url": "https://affiliatepayouts.example/amazon-commission-rates",
      "tracked_keywords": ["amazon commission cut"],
      "topics": ["amazon commission cuts 2026", "affiliate calculator"],
      "dr": 48, "traffic": 120000 }
  ]
}
```

### `backlink_feed.json`
```jsonc
{
  "domains": ["affiliatebuzz.example"],
  "links": [
    { "domain": "affiliatebuzz.example",
      "url": "https://affiliatebuzz.example/amazon-commission-cuts",
      "kind": "unlinked_mention", "anchor": "amazon commission rates",
      "relevance": "topic" }
  ]
}
```

### `traffic_feed.json`
```jsonc
{
  "pages": [
    { "slug": "amazon-2026-commission-cuts",
      "impressions": 12100, "clicks": 743,
      "position": 4.8, "ctr": 0.0614 }
  ]
}
```

### `analytics_feed.json`
```jsonc
{
  "landing_pages": [
    { "url": "amazon-2026-commission-cuts", "sessions": 6100,
      "engaged_sessions": 4700, "avg_engagement_time": 201,
      "conversions": 187, "revenue": 1660.25 }
  ],
  "events": [
    { "event_name": "tool_use", "tool": "commission_calculator", "count": 1845 },
    { "event_name": "affiliate_click", "destination": "amazon", "count": 2088 },
    { "event_name": "email_signup", "page": "...", "count": 311 }
  ]
}
```

### `keyword_research_feed.json`
```jsonc
{
  "keywords": [
    { "query": "amazon commission cut", "intent": "problem",
      "volume": 5400, "difficulty": 42, "cpc": 1.85,
      "cluster": "Commission Cuts", "matched_slug": "amazon-2026-commission-cuts" }
  ]
}
```

### `serp_snapshot.json`
```jsonc
{
  "queries": [
    { "query": "amazon commission cut", "intent": "problem",
      "our_rank": 3, "our_url": "amazon-2026-commission-cuts",
      "features": ["featured_snippet", "people_also_ask"],
      "top_pages": [ { "domain": "affiliatepayouts.example", "url": "..." } ] }
  ]
}
```

---

## 3. How to export from real tools

### Google Search Console (→ `gsc_feed.json`)
1. Performance → date range (e.g. last 90 days).
2. Add dimensions: Query, Page, Country, Device, Date (separate exports).
3. Export as CSV/Sheets, then map each row into the `queries` array
   (query / impressions / clicks / CTR / position / page).

### Ahrefs / Semrush (→ `keyword_research_feed.json`)
1. Keywords Explorer / Keyword Analytics → search a topic.
2. Filter to your niche and sort by volume.
3. Export the columns: Keyword, Intent, Volume, Difficulty, CPC.
4. Map each row into the `keywords` array; attach `cluster` and
   `matched_slug` by hand using your content map.

### Ahrefs / Semrush competitors (→ `competitor_feed.json`)
1. Site Explorer → enter a competitor domain.
2. Organic Keywords / Top Pages → export the topic keyword list.
3. Add `domain`, `url`, `tracked_keywords`, and a `topics` list of
   the concepts they rank for that you don't cover yet.

### Ahrefs / Semrush backlinks (→ `backlink_feed.json`)
1. Backlinks → filter to unlinked mentions / broken contexts.
2. Resources → find "resource page" opportunities.
3. Export domain, URL, anchor, and kind; map into the `links` array.

### Google Analytics 4 (→ `analytics_feed.json`)
1. Reports → Engagement → Landing Pages.
2. Add conversions + revenue, export.
3. Events → export `tool_use` / `affiliate_click` / `email_signup` counts.

---

## 4. Switch from sample data to live data

1. Copy the sample into the live feed name and edit it:

```powershell
# from intelligence/seo/data
Copy-Item gsc_sample.json gsc_feed.json -Force
Copy-Item rank_tracking_sample.json rank_tracking.json -Force
Copy-Item competitor_sample.json competitor_feed.json -Force
Copy-Item backlink_sample.json backlink_feed.json -Force
Copy-Item analytics_sample.json analytics_feed.json -Force
```

2. Replace the synthetic values with your exported real rows.
3. Re-run the edge-case suite to confirm nothing breaks with a populated
   feed (`node intelligence/seo/tests/seo_edge_case_tests.mjs`).
4. Anything you don't have a real feed for yet — **leave that feed absent**
   (delete the file or set it to `{}`). The engine will correctly report
   `DATA_UNAVAILABLE` instead of guessing.

---

## 5. The evidence wrapper pattern

Every metric that can come from an external source is wrapped in an
**evidence object** (see `orchestrator/seo_evidence.mjs`):

```jsonc
{
  "available": true,
  "value": 12100,
  "source": "search_console",
  "timestamp": "2026-09-01T00:00:00.000Z",
  "confidence": "HIGH",
  "geo": "US",
  "device": "desktop"
}
```

- `available: false` ⇔ the value is unknown (`DATA_UNAVAILABLE` — the
  frozen singleton with `confidence: "NONE"`).
- Downstream scoring checks `available` and **renormalizes** so a missing
  metric never silently skews a 0–100 score.
- When two sources disagree, `reconcile()` returns:
  1. the highest-confidence source, then
  2. among equal confidence, the newer `timestamp`.
- Nothing ever auto-fabricates. Unknown stays unknown.

---

## 6. The no-fabrication guarantee

This is the central invariant, and the edge-case suite asserts it:

- **No keyword feed** → `search_volume_available === 0` and every
  `keyword.metrics.volume` is `{ value: null, available: false }`.
- **No SERP snapshot** → `serpSummary.provided === false`,
  `queries_with_rank === 0`.
- **No competitor feed** → `competitors_count === 0` and the note explains
  `DATA_UNAVAILABLE`.
- **No backlink feed** → `backlinkOpportunityEngine.provided === false`,
  `note` says "Nothing invented here."
- **No traffic feed** → every article is `UNMEASURED`
  (`measured_count === 0`).
- **Corrupt / `{}` / missing feed files are handled gracefully** — they
  never crash the system and always resolve to the unavailable template.

If you see a feed-derived metric that is *not* backed by a real file, that
is a bug. Fix it — do not paper over it with a fabricated number.
