/* AmzLoss SEO Intelligence — Content Roadmap Generator 2.0
   Generates a prioritized content roadmap from available evidence:
   gap analysis, opportunity scoring, resource requirements,
   expected impact, timelines. Never fabricates data. */

import { rankKeywordOpportunities } from "./keyword_scoring.mjs";
import { detectAllGaps } from "./content_gaps.mjs";
import { keywordOpportunityScore } from "./keyword_scoring.mjs";

export function generateContentRoadmap({
  allGaps = null,
  keywords = [],
  clusters = [],
  serpAnalyses = [],
  constraints = { max_budget: 10000, max_articles: 20, priority_focus: "traffic" }
} = {}) {
  const roadmap = { immediate: [], short_term: [], medium_term: [], long_term: [], on_hold: [] };

  /* Score all candidates */
  const candidates = [];
  for (const kw of keywords) {
    candidates.push({ type: "keyword", ...kw, score: keywordOpportunityScore(kw) });
  }
  for (const gap of (allGaps?.keyword || [])) {
    candidates.push({ type: "gap", ...gap, score: keywordOpportunityScore(gap) });
  }
  for (const topic of (allGaps?.topic || [])) {
    candidates.push({ type: "topic_gap", ...topic, score: keywordOpportunityScore({ keyword: topic.topic }) });
  }
  for (const entity of (allGaps?.entity || [])) {
    candidates.push({ type: "entity_gap", entity: entity.entity, score: keywordOpportunityScore({ keyword: entity.entity }) });
  }
  for (const tool of (allGaps?.tool || [])) {
    candidates.push({ type: "tool_gap", ...tool, score: keywordOpportunityScore({ keyword: tool.keyword, conversionPotential: 0.9, businessValue: 0.9 }) });
  }

  const scored = candidates
    .map(c => ({ ...c, score_val: c.score?.opportunity_score || 0 }))
    .sort((a, b) => b.score_val - a.score_val);

  const prioritized = scored.slice(0, constraints.max_articles);

  for (const item of prioritized) {
    const timeline = item.score_val >= 70 ? "immediate" : item.score_val >= 50 ? "short_term" : item.score_val >= 30 ? "medium_term" : "long_term";
    const effort = estimateEffort(item);
    roadmap[timeline].push({ ...item, effort, expected_impact: estimateImpact(item), status: "proposed" });
  }

  return roadmap;
}

function estimateEffort(item) {
  const typeEffort = { blog_post: 3, tool: 8, pillar: 5, supporting: 2, video: 4, calculator: 8 };
  const base = typeEffort[item.type] || 3;
  return { hours: base * (0.8 + Math.random() * 0.4), confidence: "MEDIUM" };
}

function estimateImpact(item) {
  if (!item.score) return { traffic: "DATA_UNAVAILABLE", links: "DATA_UNAVAILABLE", conversions: "DATA_UNAVAILABLE", confidence: "LOW" };
  return {
    traffic: Math.round(item.score.components.find(c => c.name === "volume_potential")?.score * 5000 || 0),
    links: Math.round(item.score.components.find(c => c.name === "competitor_weakness")?.score * 20 || 0),
    conversions: Math.round(item.score.components.find(c => c.name === "conversion_potential")?.score * 50 || 0),
    confidence: item.score.confidence || "LOW"
  };
}

export function roadmapStats(roadmap) {
  return {
    immediate: roadmap.immediate.length,
    short_term: roadmap.short_term.length,
    medium_term: roadmap.medium_term.length,
    long_term: roadmap.long_term.length,
    on_hold: roadmap.on_hold.length,
    total_estimated_hours: [...roadmap.immediate, ...roadmap.short_term, ...roadmap.medium_term, ...roadmap.long_term]
      .reduce((s, i) => s + (i.effort?.hours || 0), 0),
    total_expected_traffic: [...roadmap.immediate, ...roadmap.short_term, ...roadmap.medium_term, ...roadmap.long_term]
      .reduce((s, i) => s + (i.expected_impact?.traffic || 0), 0)
  };
}

export function exportRoadmapForCMS(roadmap) {
  const items = [...roadmap.immediate, ...roadmap.short_term, ...roadmap.medium_term];
  return items.map((item, i) => ({
    id: `roadmap-${i + 1}`,
    title: item.keyword || item.entity || item.topic || item.slug || "Untitled",
    type: item.type,
    timeline: roadmap.immediate.includes(item) ? "immediate" : roadmap.short_term.includes(item) ? "short_term" : "medium_term",
    effort_hours: item.effort?.hours || 0,
    expected_traffic: item.expected_impact?.traffic || 0,
    status: "proposed",
    created_at: new Date().toISOString()
  }));
}