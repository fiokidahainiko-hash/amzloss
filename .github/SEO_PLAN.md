# AMZLOSS SEO Implementation Plan

Generated from audit of all existing pages. This is the reference document for the complete SEO strategy.

---

## TABLE 1 — Existing Pages Audit

| Page | Current Title | Current H1 | Meta Desc | Problem | Recommended Change |
|------|--------------|------------|-----------|---------|-------------------|
| index.html | Free Amazon Affiliate Tools \| Earnings Audit \| AmzLoss | Free tools that help you earn more... | Exists (truncated) | H1 contains `<span>` markup; no tool-specific internal links to supporting content | Keep as-is; focus on adding tool-to-article links |
| audit.html | Amazon Affiliate Underpayment Checker \| AmzLoss | Amazon Associates Earnings Audit | Exists | **Title/H1 mismatch**: title says "Underpayment Checker" but primary keyword is "earnings audit" | Title: "Amazon Associates Earnings Audit — Check Your Affiliate Report \| AMZLOSS" |
| calculator.html | Amazon Affiliate Commission Calculator \| AmzLoss | Amazon Affiliate Commission Calculator | Exists | Good | Add links to commission-rates-2026.html and commission-loss.html (new) |
| rates.html | Amazon Affiliate Commission Rates 2026 \| AmzLoss | Current Amazon Associates Commission Rates (2026) | Exists | Good | Add links to commission-cuts-2026.html and calculator.html |
| networks.html | Affiliate Network Commission Calculator \| AmzLoss | Affiliate Network Commission Calculator | Exists | Good | Add link to affiliate-network-comparison.html |
| breakeven.html | Break-Even & Price-Drop Calculator \| AmzLoss | Break-Even & Price-Drop Calculator | Exists | Title could target "price drop calculator" keyword better | Consider adding "Amazon Affiliate" to title for keyword coverage |
| submit.html | URL Submitter — Submit to 31+ Platforms \| AmzLoss | URL Submitter | Exists | **H1 too thin** — should be "Free URL Submission Tool" | H1: "Free URL Submission Tool" |
| link-tools.html | Link Tools: Affiliate Builder, Backlink Tools \| AmzLoss | Link Tools | Exists | **H1 too thin** — should be more descriptive | H1: "Amazon Affiliate Link Builder & Backlink Tools" |
| directory.html | Affiliate & Blogger Directory \| AmzLoss | Backlink Directory | Exists | **Title/H1 mismatch**: title = "Affiliate & Blogger Directory" but H1 = "Backlink Directory". Should reposition per strategy (not "backlink selling") | H1: "Free Webmaster & Affiliate Resources Directory" |
| listing.html | Site Listing \| AmzLoss Backlink Directory | Site Listing | Exists | Dynamic page, fine | Keep as-is |
| faq.html | FAQ — Amazon Affiliate Earnings & Commissions \| AmzLoss | Frequently Asked Questions | Exists | Good | Add links to new tools |
| blogs.html | AmzLoss Blog — Affiliate & Webmaster Guides \| Learn | Learn | Exists | **H1 too thin** — should be descriptive | H1: "Amazon Affiliate & Webmaster Guides" |
| videos.html | AMZLOSS Videos | AMZLOSS Promo — 120fps | Exists | ROBOTS: none (noindex) — correct for internal page | Keep as-is |
| about.html | About AmzLoss | About AmzLoss | Exists | Good | Keep as-is |
| robots.txt | — | — | — | **MISSING**: no disallow for amzloss/ subdirectory (duplicate content) | Add: Disallow: /amzloss/ |
| amzloss/ | 59 duplicate HTML files | — | — | **CRITICAL**: 59 pages duplicate every root page | Disallow in robots.txt + consider deleting |

### Blog pages: 43 articles
- All have titles, H1s, and canonicals
- All target relevant long-tail keywords
- No thin pages detected (all have substantive content)

---

## TABLE 2 — Keyword Priority Map

| Keyword | Intent | Target Page | Priority | AMZLOSS Advantage |
|---------|--------|-------------|----------|-------------------|
| Amazon Associates earnings audit | TOOL | audit.html | TIER 1 | Unique product — no competitor does this |
| Amazon affiliate earnings audit | TOOL | audit.html | TIER 1 | Same |
| Amazon earnings report analyzer | TOOL | audit.html | TIER 1 | Unique |
| Amazon affiliate commission discrepancy | PROBLEM | audit.html | TIER 1 | Unique |
| Amazon affiliate underpayment checker | TOOL | audit.html | TIER 1 | Unique |
| Amazon affiliate commission calculator | TOOL | calculator.html | TIER 1 | Good tool, needs better title |
| Amazon affiliate commission loss calculator | TOOL | commission-loss.html (NEW) | TIER 1 | No competitor has this |
| Amazon affiliate price drop calculator | TOOL | breakeven.html | TIER 2 | Good tool, needs keyword-rich title |
| Amazon Associates commission rates 2026 | INFO | rates.html | TIER 2 | Comprehensive table |
| Affiliate network commission calculator | TOOL | networks.html | TIER 2 | Unique |
| Free URL submission tool | TOOL | submit.html | TIER 2 | Unique |
| Amazon affiliate link builder | TOOL | link-tools.html | TIER 2 | Good |
| Free backlink checker | TOOL | link-tools.html | TIER 2 | Limited data (honest about coverage) |
| how to audit Amazon affiliate earnings | INFO | how-to-audit-amazon-earnings.html | TIER 3 | Blog covers this |
| how to submit a URL to Google | INFO | how-to-submit-url-to-search-engines.html | TIER 3 | Blog covers this |
| Google crawling vs indexing | INFO | (NEW article needed) | TIER 3 | Gap |
| Amazon affiliate | BROAD | — | TIER 4 | Don't pursue yet |

---

## TABLE 3 — New Pages Required

| Page | Primary Keyword | Title | Meta Description | H1 |
|------|----------------|-------|------------------|-----|
| commission-loss.html | Amazon affiliate commission loss calculator | Amazon Affiliate Commission Loss Calculator — See What Rate Changes Cost You \| AMZLOSS | Calculate how Amazon commission-rate changes affect your affiliate earnings. Compare previous and current rates to see your monthly and annual revenue difference. | Amazon Affiliate Commission Loss Calculator |
| earnings-analyzer.html | Amazon earnings report analyzer | Amazon Earnings Report Analyzer — Check Your Affiliate Report \| AMZLOSS | Analyze your Amazon Associates earnings report against applicable commission rates. Find potential discrepancies line by line in your browser. | Amazon Earnings Report Analyzer |

---

## TABLE 4 — Internal Linking Map

| Source Page | Link Target | Anchor Text |
|------------|-------------|-------------|
| audit.html | rates.html | "commission rates" |
| audit.html | calculator.html | "commission calculator" |
| calculator.html | rates.html | "current rates" |
| calculator.html | breakeven.html | "break-even calculator" |
| breakeven.html | calculator.html | "commission calculator" |
| rates.html | calculator.html | "calculator" |
| networks.html | calculator.html | "Amazon calculator" |
| submit.html | blogs/how-to-submit-url-to-search-engines.html | "how URL submission works" |
| link-tools.html | blogs/amazon-affiliate-link-tools-guide.html | "link tools guide" |
| directory.html | blogs/directory-listing-seo-guide.html | "directory SEO guide" |

---

## TABLE 5 — 90-Day Roadmap

| Week | Task | Priority | Expected Outcome |
|------|------|----------|------------------|
| 1 | Fix robots.txt to disallow amzloss/ | CRITICAL | Eliminates 59 duplicate pages |
| 1 | Fix audit.html title to "Amazon Associates Earnings Audit" | HIGH | Aligns title with primary keyword |
| 1 | Fix thin H1s on submit, link-tools, directory, blogs | HIGH | Better keyword targeting |
| 1 | Add contextual internal links to tool pages | HIGH | Improved crawlability and authority flow |
| 2 | Create commission-loss.html | HIGH | Targets #1 missing keyword cluster |
| 2 | Create earnings-analyzer.html | HIGH | Targets earnings report analyzer keyword |
| 2 | Optimize breakeven.html title for "price drop calculator" | MEDIUM | Better keyword targeting |
| 3-4 | Create 5-10 supporting articles (indexing, commission changes, etc.) | MEDIUM | Topical authority |
| 5-6 | Launch curated resource directory repositioning | MEDIUM | Directory authority |
| 7-8 | Begin backlink outreach | LOW | Link acquisition |
