/* AmzLoss SEO Intelligence — Content Gap Engine 2.0
   Detects keyword, topic, entity, intent, depth, supporting-content,
   tool, internal-link, and backlinkable-asset gaps from real data. */

import { ev, DATA_UNAVAILABLE } from "./seo_evidence.mjs";
import { matchKeywordToArticle } from "../keyword/keyword_intelligence.mjs";

export function detectAllGaps({
  site,
  keywordFeed = [],
  competitorGaps = [],
  serpAnalyses = [],
  entityCoverage = [],
  backlinkAssets = [],
  internalLinkGraph = {}
} = {}) {
  const gaps = { keyword: [], topic: [], entity: [], intent: [], depth: [], supporting: [], tool: [], internal_link: [], backlink_asset: [] };

  /* Keyword gaps from competitor analysis */
  for (const gap of competitorGaps) {
    if (gap.classification === "CREATE") gaps.keyword.push({ type: "keyword_gap", keyword: gap.keyword, intent: gap.intent, reason: gap.reason });
    if (gap.classification === "OPTIMIZE") gaps.keyword.push({ type: "keyword_optimize", keyword: gap.keyword, intent: gap.intent, reason: gap.reason });
  }

  /* Topic gaps: competitor topics not covered by AMZLOSS */
  for (const compGap of competitorGaps) {
    if (compGap.classification === "CREATE") {
      const match = matchKeywordToArticle(site, compGap.keyword);
      if (!match.covered) {
        gaps.topic.push({ type: "topic_gap", topic: compGap.keyword, intent: compGap.intent, reason: compGap.reason });
      }
    }
  }

  /* Entity gaps: strategic entities with low coverage */
  for (const e of entityCoverage) {
    if (e.coverage_status === "THIN" || e.coverage_status === "ABSENT") {
      gaps.entity.push({ type: "entity_gap", entity: e.entity, status: e.coverage_status, clusters_covered: e.clusters_covered, reason: `Strategic entity "${e.entity}" is ${e.coverage_status.toLowerCase()}` });
    }
  }

  /* Intent gaps: SERP has intent but AMZLOSS lacks page */
  for (const serp of serpAnalyses) {
    if (!serp.top_entities.length) continue;
    const hasPage = matchKeywordToArticle(site, serp.keyword);
    if (!hasPage.covered) {
      gaps.intent.push({ type: "intent_gap", keyword: serp.keyword, missing_intent: serp.dominant_intent, reason: `SERP shows ${serp.dominant_intent} intent but no AMZLOSS page exists` });
    }
  }

  /* Depth gaps: AMZLOSS has page but thinner than SERP average */
  for (const serp of serpAnalyses) {
    const match = matchKeywordToArticle(site, serp.keyword);
    if (match.covered && serp.avg_content_depth) {
      const amzPage = site.articles.find(a => a.slug === match.article.slug);
      if (amzPage && amzPage.word_count < serp.avg_content_depth * 0.7) {
        gaps.depth.push({ type: "depth_gap", slug: amzPage.slug, keyword: serp.keyword, current_words: amzPage.word_count, serp_avg: serp.avg_content_depth, reason: `AMZLOSS page ${amzPage.slug} has ${amzPage.word_count} words vs SERP avg ${serp.avg_content_depth}` });
      }
    }
  }

  /* Supporting-content gaps: pillar exists but lacks cluster members */
  for (const clusterName of Object.keys(site.clusters || {})) {
    const cluster = site.clusters[clusterName];
    const pillar = cluster?.pillar ? site.articles.find(a => a.slug === cluster.pillar) : null;
    const members = (cluster?.articles || []).filter(s => s !== cluster.pillar).map(s => site.articles.find(a => a.slug === s)).filter(Boolean);
    if (pillar && members.length < 3) {
      gaps.supporting.push({ type: "supporting_gap", cluster: clusterName, pillar: pillar.slug, current_members: members.length, reason: `Pillar "${pillar.slug}" has only ${members.length} supporting articles` });
    }
  }

  /* Tool gaps: transactional intent but no tool exists */
  for (const serp of serpAnalyses) {
    if (serp.dominant_intent === "transactional" && serp.dominant_page_type === "tool") {
      const match = matchKeywordToArticle(site, serp.keyword);
      if (!match.covered) {
        gaps.tool.push({ type: "tool_gap", keyword: serp.keyword, reason: `Transactional SERP for "${serp.keyword}" expects a tool/calculator` });
      }
    }
  }

  /* Internal-link gaps: important pages with < 2 inbound links */
  for (const article of site.articles || []) {
    if ((article.internal_inbound || 0) < 2 && article.importance === "HIGH") {
      gaps.internal_link.push({ type: "internal_link_gap", slug: article.slug, current_inbound: article.internal_inbound || 0, reason: `High-importance page "${article.slug}" has only ${article.internal_inbound || 0} inbound links` });
    }
  }

  /* Backlinkable-asset gaps: high-potential topics with no linkable resource */
  for (const asset of backlinkAssets) {
    if (asset.asset_tier === "WEAK" && asset.seo_quality >= 60) {
      gaps.backlink_asset.push({ type: "backlink_asset_gap", slug: asset.slug, reason: `Page "${asset.slug}" has high quality (${asset.seo_quality}) but weak linkable-asset score` });
    }
  }

  return gaps;
}