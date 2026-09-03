/* AmzLoss SEO Intelligence — GSC Post-Import Report Generator
   Produces the mandatory post-import verification report:
   - DATA SOURCE, DATE RANGE, query/page/click/impression totals
   - AVERAGE CTR, AVERAGE POSITION
   - TOP 20 SEO opportunities ranked by priority
   - For each: keyword, URL, position, impressions, clicks, CTR,
     intent, recommended action, reason, confidence, data source
   - Provenance clearly labeled (TEST/LIVE/IMPORTED/UNAVAILABLE)
   - Never fabricates missing values */

import { PROVENANCE, isRealData, getProvenance, extractProvenance, getGSCFeedStatus } from "./provenance.mjs";
import { loadSiteData } from "../site_data.mjs";
import { classifyIntent } from "../keyword/search_intent.mjs";
import { matchKeywordToArticle } from "../keyword/keyword_intelligence.mjs";
import fs from "node:fs";

const GSC_FEED_PATH = "C:/Users/DELL/amzloss/intelligence/seo/data/gsc_feed.json";

const INTENT_WEIGHTS = {
  transactional: 0.25, commercial: 0.22, informational: 0.18,
  "how-to": 0.18, problem: 0.17
};

function priorityScore({ position, impressions, ctr, isStriking, isCtrOpp, hasExisting }) {
  let score = 0;
  if (isStriking) score += 30;
  if (isCtrOpp) score += 20;
  if (impressions > 1000) score += 15;
  if (impressions > 100) score += 10;
  score += Math.max(0, 30 - (position || 99));
  return Math.min(100, score);
}

function determineAction(q, pageMatch, position) {
  if (!pageMatch.covered) {
    return { action: "CREATE", reason: `No AMZLOSS page exists for "${q.query}" (position: ${position})` };
  }
  if (pageMatch.article.seo_quality < 50) {
    return { action: "OPTIMIZE", reason: `Existing page "${pageMatch.article.slug}" has low SEO quality (${pageMatch.article.seo_quality}/100)` };
  }
  if (position && position <= 10) {
    return { action: "EXPAND", reason: `Page ranks ${position} — expand to push to top 3` };
  }
  return { action: "OPTIMIZE", reason: `Existing page "${pageMatch.article.slug}" has ranking opportunity at position ${position}` };
}

export function generateGSCCReport(feed) {
  const meta = feed.meta || {};
  const queries = feed.queries || [];
  const site = loadSiteData({ includeHTML: false });

  /* If feed has no meta (not imported), return unavailable report */
  if (!meta.provenance) {
    return generateEmptyReport();
  }

  /* Compute aggregates */
  const impressionValues = queries.map(q => q.impressions).filter(n => typeof n === "number");
  const clickValues = queries.map(q => q.clicks).filter(n => typeof n === "number");
  const positionValues = queries.map(q => q.position).filter(n => typeof n === "number");

  const totalImpressions = impressionValues.reduce((s, v) => s + v, 0);
  const totalClicks = clickValues.reduce((s, v) => s + v, 0);
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const avgPosition = positionValues.length > 0
    ? positionValues.reduce((s, v) => s + v, 0) / positionValues.length
    : null;

  const uniquePages = [...new Set(queries.map(q => q.page).filter(Boolean))];
  const uniqueQueries = queries.length;

  /* Identify all opportunity types */
  const opportunities = [];

  /* Striking distance: position 4-20 with meaningful impressions */
  const strikingDistance = queries
    .filter(q => {
      const p = q.position;
      return p !== null && p !== undefined && p >= 4 && p <= 20 && (q.impressions || 0) >= 10;
    })
    .map(q => {
      const pageMatch = matchKeywordToArticle(site, q.query);
      const action = determineAction(q, pageMatch, q.position);
      return {
        type: "STRIKING_DISTANCE",
        query: q.query,
        current_url: q.page || null,
        current_url_available: !!q.page,
        position: q.position,
        impressions: q.impressions || 0,
        clicks: q.clicks || 0,
        ctr: q.ctr || (totalImpressions > 0 ? (q.clicks || 0) / q.impressions : null),
        search_intent: classifyIntent(q.query).intent || "informational",
        recommended_action: action.action,
        reason: action.reason,
        confidence: "HIGH",
        data_source: meta.provenance,
        priority: priorityScore({
          position: q.position,
          impressions: q.impressions || 0,
          ctr: q.ctr,
          isStriking: true,
          isCtrOpp: false,
          hasExisting: pageMatch.covered
        })
      };
    });

  opportunities.push(...strikingDistance);

  /* CTR opportunities: high impressions, low CTR */
  const ctrOpps = queries
    .filter(q => {
      const imp = q.impressions || 0;
      const c = q.ctr;
      return imp >= 100 && c !== null && c !== undefined && c < 0.03 && q.position && q.position <= 20;
    })
    .map(q => {
      const pageMatch = matchKeywordToArticle(site, q.query);
      const action = determineAction(q, pageMatch, q.position);
      return {
        type: "CTR_OPPORTUNITY",
        query: q.query,
        current_url: q.page || null,
        current_url_available: !!q.page,
        position: q.position,
        impressions: q.impressions || 0,
        clicks: q.clicks || 0,
        ctr: q.ctr,
        search_intent: classifyIntent(q.query).intent || "informational",
        recommended_action: "OPTIMIZE",
        reason: `High impressions (${q.impressions}) but low CTR (${((q.ctr || 0) * 100).toFixed(1)}%) — improve title/meta/structured data`,
        confidence: "HIGH",
        data_source: meta.provenance,
        priority: priorityScore({
          position: q.position || 15,
          impressions: q.impressions || 0,
          ctr: q.ctr,
          isStriking: false,
          isCtrOpp: true,
          hasExisting: pageMatch.covered
        })
      };
    });

  /* Deduplicate: if a query already in strikingDistance, don't add as CTR */
  const strikingQueries = new Set(strikingDistance.map(s => s.query.toLowerCase()));
  opportunities.push(...ctrOpps.filter(c => !strikingQueries.has(c.query.toLowerCase())));

  /* High-impression low-click (hidden opportunities) */
  const hiddenOpps = queries
    .filter(q => {
      const imp = q.impressions || 0;
      const c = q.clicks || 0;
      return imp >= 20 && imp < 1000 && q.position && q.position > 20 && c < imp * 0.02;
    })
    .map(q => {
      const pageMatch = matchKeywordToArticle(site, q.query);
      const action = determineAction(q, pageMatch, q.position);
      return {
        type: "HIDDEN_OPPORTUNITY",
        query: q.query,
        current_url: q.page || null,
        current_url_available: !!q.page,
        position: q.position,
        impressions: q.impressions || 0,
        clicks: q.clicks || 0,
        ctr: q.ctr || (totalImpressions > 0 ? (q.clicks || 0) / q.impressions : null),
        search_intent: classifyIntent(q.query).intent || "informational",
        recommended_action: action.action,
        reason: `Site gets ${q.impressions} impressions for "${q.query}" but page not optimized — ${pageMatch.covered ? "optimize existing page" : "create content"}`,
        confidence: "MEDIUM",
        data_source: meta.provenance,
        priority: priorityScore({
          position: q.position || 30,
          impressions: q.impressions || 0,
          ctr: q.ctr,
          isStriking: false,
          isCtrOpp: false,
          hasExisting: pageMatch.covered
        })
      };
    });

  /* URL switching detection (same query, multiple pages) */
  const byQuery = {};
  for (const q of queries) {
    if (!q.query) continue;
    const k = q.query.toLowerCase();
    if (!byQuery[k]) byQuery[k] = [];
    byQuery[k].push(q);
  }

  const urlSwitching = Object.entries(byQuery)
    .filter(([, arr]) => arr.length > 1 && new Set(arr.map(r => r.page).filter(Boolean)).size > 1)
    .map(([query, records]) => {
      const primary = records.sort((a, b) => (a.position || 999) - (b.position || 999))[0];
      return {
        type: "URL_SWITCHING",
        query,
        current_url: primary.page || null,
        current_url_available: !!primary.page,
        position: primary.position,
        impressions: records.reduce((s, r) => s + (r.impressions || 0), 0),
        clicks: records.reduce((s, r) => s + (r.clicks || 0), 0),
        ctr: null,
        search_intent: classifyIntent(query).intent || "informational",
        recommended_action: "MERGE",
        reason: `${records.length} URLs competing for "${query}" — consolidate to one canonical URL`,
        confidence: "HIGH",
        data_source: meta.provenance,
        competing_urls: records.map(r => ({ url: r.page, position: r.position })),
        priority: priorityScore({
          position: primary.position || 15,
          impressions: records.reduce((s, r) => s + (r.impressions || 0), 0),
          ctr: null,
          isStriking: false,
          isCtrOpp: false,
          hasExisting: true
        })
      };
    });

  opportunities.push(...urlSwitching);
  opportunities.push(...hiddenOpps);

  /* Sort by priority descending, take top 20 */
  opportunities.sort((a, b) => b.priority - a.priority);
  const top20 = opportunities.slice(0, 20);

  return {
    provenance: meta.provenance,
    source: meta.source || "unknown",
    property_url: meta.property_url || null,
    imported_at: meta.imported_at || null,
    date_range: meta.date_range || null,
    summary: {
      total_queries: uniqueQueries,
      total_pages: uniquePages.length,
      total_clicks: totalClicks,
      total_impressions: totalImpressions,
      avg_ctr: avgCtr,
      avg_position: avgPosition
    },
    data_source_status: meta.provenance,
    opportunities: top20.map(o => ({
      rank: 0,
      query: o.query,
      current_url: o.current_url,
      current_url_available: o.current_url_available,
      position: o.position,
      impressions: o.impressions,
      clicks: o.clicks,
      ctr: o.ctr !== null ? o.ctr : "DATA_UNAVAILABLE",
      search_intent: o.search_intent,
      recommended_action: o.recommended_action,
      reason: o.reason,
      confidence: o.confidence,
      data_source: o.data_source,
      type: o.type
    }))
  };
}

function generateEmptyReport() {
  return {
    provenance: PROVENANCE.UNAVAILABLE,
    source: "none",
    property_url: null,
    imported_at: null,
    date_range: null,
    summary: {
      total_queries: 0, total_pages: 0, total_clicks: 0,
      total_impressions: 0, avg_ctr: 0, avg_position: null
    },
    data_source_status: PROVENANCE.UNAVAILABLE,
    opportunities: []
  };
}

/* Format the report as readable text */
export function formatGSCCReport(report) {
  const prov = report.data_source_status || PROVENANCE.UNAVAILABLE;
  const provLabel = prov === PROVENANCE.TEST ? "⚠️ TEST DATA" :
                    prov === PROVENANCE.IMPORTED ? "📥 IMPORTED" :
                    prov === PROVENANCE.LIVE ? "✅ LIVE" :
                    prov === PROVENANCE.ESTIMATED ? "📊 ESTIMATED" :
                    "❌ UNAVAILABLE";

  const lines = [];
  lines.push("");
  lines.push("╔══════════════════════════════════════════════════════════════╗");
  lines.push("║          GSC POST-IMPORT REPORT                               ║");
  lines.push("╚══════════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push(`  DATA SOURCE:       ${provLabel}  ${report.property_url || ""}`);
  lines.push(`  IMPORTED AT:      ${report.imported_at ? new Date(report.imported_at).toLocaleString() : "N/A"}`);
  if (report.date_range) {
    lines.push(`  DATE RANGE:        ${report.date_range.start} → ${report.date_range.end}`);
  } else {
    lines.push(`  DATE RANGE:        DATA_UNAVAILABLE`);
  }
  lines.push("");
  lines.push("──────────────────────────────────────────────────────────────");
  lines.push("  SUMMARY");
  lines.push("──────────────────────────────────────────────────────────────");
  lines.push(`  Queries:           ${report.summary.total_queries}`);
  lines.push(`  Pages:             ${report.summary.total_pages}`);
  lines.push(`  Total Clicks:      ${report.summary.total_clicks.toLocaleString()}`);
  lines.push(`  Total Impressions: ${report.summary.total_impressions.toLocaleString()}`);
  lines.push(`  Average CTR:       ${(report.summary.avg_ctr * 100).toFixed(2)}%`);
  lines.push(`  Average Position:   ${report.summary.avg_position !== null ? report.summary.avg_position.toFixed(1) : "DATA_UNAVAILABLE"}`);

  lines.push("");
  lines.push("──────────────────────────────────────────────────────────────");
  lines.push(`  TOP ${report.opportunities.length} SEO OPPORTUNITIES (by priority)`);
  lines.push("──────────────────────────────────────────────────────────────");

  if (report.opportunities.length === 0) {
    lines.push("  No opportunities identified. Feed may be empty or all queries fully optimized.");
  }

  report.opportunities.forEach((opp, i) => {
    lines.push("");
    lines.push(`  #${i + 1} [${opp.type}] ${opp.query}`);
    lines.push(`     URL:     ${opp.current_url || "NO URL (unmapped)"}`);
    lines.push(`     Position: ${opp.position ?? "DATA_UNAVAILABLE"}`);
    lines.push(`     Impressions: ${opp.impressions.toLocaleString()} | Clicks: ${opp.clicks.toLocaleString()} | CTR: ${typeof opp.ctr === "number" ? (opp.ctr * 100).toFixed(2) + "%" : opp.ctr}`);
    lines.push(`     Intent:  ${opp.search_intent}`);
    lines.push(`     Action:  [${opp.recommended_action}] ${opp.reason}`);
    lines.push(`     Confidence: ${opp.confidence} | Source: ${opp.data_source}`);
  });

  lines.push("");
  return lines.join("\n");
}

export function getGSCReport() {
  const status = getGSCFeedStatus();
  if (status.status === "NO_FEED" || status.status === "FILE_MISSING") {
    return { report: generateEmptyReport(), status };
  }

  const feed = JSON.parse(fs.readFileSync(GSC_FEED_PATH, "utf-8"));
  const report = generateGSCCReport(feed);
  return { report, status };
}