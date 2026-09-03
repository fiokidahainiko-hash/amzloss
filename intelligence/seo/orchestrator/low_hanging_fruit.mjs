/* AmzLoss SEO Intelligence — Low-Hanging Fruit Content Refresh Engine
   Identifies existing pages that already rank and have realistic potential
   to move significantly higher using real GSC data.

   Priority Ranges:
     5–10  = HIGH PRIORITY
     11–15 = PRIORITY
     16–20 = SECONDARY / STRIKING DISTANCE
     21+   = do not classify as low-hanging fruit unless another strong signal

   Rules:
   - DEFAULT action = OPTIMIZE (never CREATE for existing pages in range)
   - CREATE only after verifying no existing URL satisfies the intent
   - Never fabricate missing GSC values */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROVENANCE, isRealData, getProvenance } from "./provenance.mjs";
import { loadSiteData } from "../site_data.mjs";
import { classifyIntent } from "../keyword/search_intent.mjs";
import { matchKeywordToArticle } from "../keyword/keyword_intelligence.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DATA_DIR = path.join(__dirname, "../data/");
const GSC_FEED_PATH = path.join(DATA_DIR, "gsc_feed.json");

function loadGscFeed() {
  try {
    if (!fs.existsSync(GSC_FEED_PATH)) return null;
    return JSON.parse(fs.readFileSync(GSC_FEED_PATH, "utf-8"));
  } catch { return null; }
}

function priorityTier(position) {
  if (position >= 5 && position <= 10) return "HIGH PRIORITY";
  if (position >= 11 && position <= 15) return "PRIORITY";
  if (position >= 16 && position <= 20) return "SECONDARY";
  return null;
}

function opportunityScore({ position, impressions, ctr, articleMatch, tier }) {
  let score = 0;
  if (tier === "HIGH PRIORITY") score += 40;
  else if (tier === "PRIORITY") score += 25;
  else if (tier === "SECONDARY") score += 10;
  if (impressions >= 100) score += 15;
  if (impressions >= 500) score += 10;
  if (impressions >= 1000) score += 10;
  score += Math.max(0, Math.round((20 - position) * 3));
  if (articleMatch?.covered) score += 10;
  if (articleMatch?.seo_quality > 0) score += Math.round(articleMatch.seo_quality / 20);
  if (ctr && ctr < 0.02) score += 15;
  else if (ctr && ctr < 0.05) score += 5;
  return Math.min(100, score);
}

function determineAction(q, pageMatch, article, position) {
  if (pageMatch?.covered) {
    const quality = pageMatch.seo_quality || 0;
    if (quality < 50) return { action: "OPTIMIZE", reason: `Existing page ranks ${position} but has low SEO quality (${quality}/100). Optimize on-page signals before expanding.` };
    if (position <= 5) return { action: "EXPAND", reason: `Page ranks #${position} — push to top 3 with deeper content, better CTR, and more internal links.` };
    return { action: "OPTIMIZE", reason: `Existing page "${article?.slug || q.page}" ranks #${position}. Optimize to move into top 5.` };
  }
  return { action: "CREATE", reason: `No existing AMZLOSS page covers "${q.query}". Verify intent — if a new page is needed, write a full brief first.` };
}

export function lowHangingFruitReport({ maxPosition = 20, minImpressions = 5 } = {}) {
  const feed = loadGscFeed();
  if (!feed) {
    return {
      status: "DATA_UNAVAILABLE",
      provenance: PROVENANCE.UNAVAILABLE,
      message: "No GSC feed imported. Run: node intelligence/cli.mjs gsc-import [--file=<path>]",
      opportunities: [],
      summary: {}
    };
  }

  const meta = feed.meta || {};
  const provenance = meta.provenance || getProvenance(meta.source);
  const queries = feed.queries || [];
  const site = loadSiteData({ includeHTML: false });
  const opportunities = [];

  const qualifying = queries.filter(q => {
    const p = q.avg_position?.value ?? q.position;
    return p !== null && p !== undefined && p <= maxPosition && p >= 1;
  }).filter(q => {
    const imp = q.impressions?.value ?? q.impressions;
    return imp !== null && imp !== undefined && imp >= minImpressions;
  });

  for (const q of qualifying) {
    const pos = q.avg_position?.value ?? q.position;
    const imp = q.impressions?.value ?? q.impressions;
    const clk = q.clicks?.value ?? q.clicks;
    const ctrVal = q.ctr?.value ?? (imp > 0 && clk !== null ? (clk || 0) / imp : null);
    const tier = priorityTier(pos);

    const article = site.articles.find(a =>
      a.url === q.page ||
      (q.page && a.url && a.url.includes(q.page.replace("https://amzloss.com", "")))
    );
    const pageMatch = matchKeywordToArticle(site, q.query);
    const intentResult = classifyIntent(q.query);
    const action = article ? determineAction(q, pageMatch, article, pos) : { action: "CREATE", reason: `Query "${q.query}" has no matching AMZLOSS page. Check intent before creating.` };

    const estimatedImprovement = pos <= 10
      ? Math.max(0, Math.round((pos - 3) * (imp / 100)))
      : Math.max(0, Math.round((pos - 5) * (imp / 200)));

    const hasStrongSignal = ctrVal !== null && ctrVal < 0.03 && imp > 50;
    const isLHF = tier !== null || hasStrongSignal;

    opportunities.push({
      query: q.query,
      current_url: article ? `https://amzloss.com/${article.url.replace("https://amzloss.com/", "")}` : (q.page || null),
      current_url_available: !!article,
      page_slug: article?.slug || null,
      page_title: article?.title || null,
      h1: article?.title || null,
      average_position: Math.round(pos * 10) / 10,
      impressions: imp,
      clicks: clk || 0,
      ctr: ctrVal !== null ? Math.round(ctrVal * 10000) / 100 : null,
      date_range: meta.date_range ? `${meta.date_range.start} → ${meta.date_range.end}` : null,
      search_intent: intentResult.intent || "informational",
      intent_confidence: intentResult.confidence || "derived",
      target_keyword: q.query,
      keyword_page_relevance: pageMatch.covered ? "COVERED" : "MISSING",
      seo_quality: pageMatch.seo_quality || 0,
      tier: tier || "OUT_OF_RANGE",
      opportunity_score: isLHF ? opportunityScore({ position: pos, impressions: imp, ctr: ctrVal, articleMatch: pageMatch, tier }) : 0,
      estimated_improvement_clicks: estimatedImprovement,
      priority: isLHF ? (tier || "OUT_OF_RANGE") : null,
      recommended_action: action.action,
      reason: action.reason,
      confidence: isRealData(provenance) ? "HIGH" : provenance === PROVENANCE.TEST ? "LOW" : "LOW",
      data_provenance: provenance,
      data_source: meta.source || null,
      ctr_opportunity: ctrVal !== null && ctrVal < 0.03,
      striking_distance: pos <= 20 && pos >= 5,
      data_available: {
        position: pos !== null,
        impressions: imp !== null,
        clicks: clk !== null,
        ctr: ctrVal !== null,
        page: !!article
      }
    });
  }

  const high = opportunities.filter(o => o.tier === "HIGH PRIORITY");
  const priority = opportunities.filter(o => o.tier === "PRIORITY");
  const secondary = opportunities.filter(o => o.tier === "SECONDARY");
  const lhf = opportunities.filter(o => o.opportunity_score > 0);

  lhf.sort((a, b) => b.opportunity_score - a.opportunity_score);
  high.sort((a, b) => b.opportunity_score - a.opportunity_score);
  priority.sort((a, b) => b.opportunity_score - a.opportunity_score);

  return {
    status: "OK",
    provenance,
    meta: meta.date_range ? { date_range: meta.date_range, source: meta.source, rows: meta.rows || queries.length } : null,
    summary: {
      total_qualifying: qualifying.length,
      high_priority: high.length,
      priority: priority.length,
      secondary: secondary.length,
      low_hanging_fruit_count: lhf.length,
      total_impressions: qualifying.reduce((s, q) => {
        const imp = q.impressions?.value ?? q.impressions;
        return s + (imp || 0);
      }, 0),
      avg_ctr: qualifying.length > 0
        ? Math.round(qualifying.reduce((s, q) => {
          const imp = q.impressions?.value ?? q.impressions ?? 0;
          const clk = q.clicks?.value ?? q.clicks ?? 0;
          return s + (imp > 0 ? clk / imp : 0);
        }, 0) / qualifying.length * 10000) / 100
        : null,
      create_count: opportunities.filter(o => o.recommended_action === "CREATE").length,
      optimize_count: opportunities.filter(o => o.recommended_action === "OPTIMIZE" || o.recommended_action === "EXPAND").length,
      expandable_count: opportunities.filter(o => o.recommended_action === "EXPAND").length
    },
    prioritized_opportunities: lhf,
    high_priority: high,
    priority_opportunities: priority,
    secondary_opportunities: secondary,
    all_opportunities: opportunities
  };
}