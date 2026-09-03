/* AmzLoss SEO Intelligence — Dashboard
   Aggregates every SEO sub-engine into a single real-time dashboard:
   a headline "opportunity map" (grid of clusters x levers) plus KPI
   summaries. Output is data; rendering is left to the consumer. */

import { topicalAuthorityMap } from "../topics/topical_authority.mjs";
import { contentGapAnalysis } from "../topics/content_gaps.mjs";
import { decayAnalysis } from "../health/decay.mjs";
import { cannibalizationSummary } from "../health/cannibalization.mjs";
import { competitorSummary } from "../competition/competitor_gaps.mjs";
import { serpSummary } from "../keyword/serp_analysis.mjs";
import { keywordIntelligence } from "../keyword/keyword_intelligence.mjs";
import { technicalSiteAudit } from "../health/technical.mjs";
import { performanceSnapshot } from "./performance.mjs";
import { linkableAssetEngine, backlinkOpportunityEngine } from "../competition/backlinks.mjs";
import { clusterIntentCoverage } from "../keyword/search_intent.mjs";
import { SEARCH_INTENT_TYPES } from "../config.mjs";

export function seoDashboard(site) {
  const authority = topicalAuthorityMap(site);
  const gaps = contentGapAnalysis(site);
  const decay = decayAnalysis(site);
  const canni = cannibalizationSummary(site);
  const competitors = competitorSummary(site);
  const serp = serpSummary(site);
  const kw = keywordIntelligence(site);
  const technical = technicalSiteAudit(site);
  const perf = performanceSnapshot(site);
  const assets = linkableAssetEngine(site);
  const backlinks = backlinkOpportunityEngine(site);

  // Opportunity map: for each cluster, show which levers are open
  const opportunityMap = Object.keys(site.clusters).map(clusterName => {
    const coverage = clusterIntentCoverage(site, clusterName);
    const auth = authority.clusters.find(c => c.cluster === clusterName);
    return {
      cluster: clusterName,
      authority: auth?.score ?? null,
      tier: auth?.tier ?? null,
      strategic_value: site.clusters[clusterName]?.strategic_value ?? null,
      missing_intents: coverage.missing_intents,
      open_levers: {
        grow_cluster: auth?.verdict?.action === "GROW",
        new_content_gap: gaps.gaps.filter(g => g.cluster === clusterName).length > 0,
        fix_technical: technical.pages.filter(p => p.slug ? site.articles.find(a => a.slug === p.slug)?.topic_cluster === clusterName : false).some(p => p.health_tier === "RED"),
        refresh_decay: decay.decayed_pages.filter(p => site.articles.find(a => a.slug === p.slug)?.topic_cluster === clusterName).length > 0,
        resolve_cannibalization: canni.notes.some(n => n.includes(clusterName))
      }
    };
  });

  return {
    generated_at: new Date().toISOString(),
    title: "AmzLoss SEO Intelligence Dashboard",
    kpis: {
      clusters: Object.keys(site.clusters).length,
      articles: site.articles.length,
      avg_authority: authority.average_score,
      leading_clusters: authority.leading,
      genuine_gaps: gaps.total_gaps,
      decayed_pages: decay.decayed_count,
      unresolved_cannibalization: canni.unresolved,
      page_tech_red: technical.red,
      unmeasured_pages: perf.unmeasured_count,
      feed_keywords: kw.researched_keywords,
      competitors_tracked: competitors.competitors,
      serp_queries_tracked: serp.queries_total,
      assets_premium: assets.assets.filter(a => a.asset_tier === "PREMIUM").length,
      backlinks_provided: backlinks.opportunities.length,
      top_gap: gaps.top_gap?.topic || null
    },
    opportunity_map: opportunityMap,
    authority,
    top_gaps: gaps.gaps.slice(0, 5),
    top_decay: decay.decayed_pages.slice(0, 3),
    top_technical: technical.pages.slice(0, 3).map(p => ({ slug: p.slug, score: p.technical_score, failed: p.failed.map(f => f.check) })),
    top_assets: assets.top_assets,
    top_backlink_opportunities: backlinks.top_opportunities,
    feeds: {
      keyword_research: kw.search_volume_available > 0,
      serp_snapshot: serp.provided,
      competitor_feed: competitors.competitors > 0,
      backlink_feed: backlinks.provided,
      traffic_feed: perf.feed_provided
    },
    next_action: nextActionSuggestion({ authority, gaps, decay, canni, technical, backlinks })
  };
}

function nextActionSuggestion({ authority, gaps, decay, canni, technical, backlinks }) {
  if (decay.decayed_count > 0) return { priority: "HIGH", action: "REFRESH_DECAYED", detail: `Refresh ${decay.decayed_count} decayed pages before creating new content.` };
  if (canni.unresolved > 0) return { priority: "HIGH", action: "RESOLVE_CANNIBALIZATION", detail: `${canni.unresolved} unresolved cannibalization case(s) to differentiate/merge.` };
  const grow = authority.clusters.find(c => c.verdict?.action === "GROW");
  if (grow) return { priority: "MEDIUM", action: "GROW_CLUSTER", cluster: grow.cluster, detail: grow.verdict.reason };
  if (gaps.top_gap) return { priority: "MEDIUM", action: "CREATE_GAP", detail: `Create "active" content for "${gaps.top_gap.topic}".` };
  if (technical.red > 0) return { priority: "LOW", action: "TECH_FIX", detail: `${technical.red} pages have critical technical issues.` };
  if (backlinks.opportunities.length > 0) return { priority: "LOW", action: "OUTREACH", detail: `${backlinks.opportunities.length} backlink opportunities exist.` };
  return { priority: "LOW", action: "AUDIT", detail: "Site is healthy; run the full next-action engine for a single decision." };
}