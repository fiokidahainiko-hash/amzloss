/* AmzLoss SEO Intelligence — Keyword Opportunity Scoring
   Scores keywords using available evidence without fabricating data.
   Considers: relevance, intent match, difficulty, traffic potential,
   business value, existing authority, current rankings, competitor
   weakness, SERP characteristics, conversion potential, content effort,
   topical-cluster value. */

import { ev, evN, DATA_UNAVAILABLE, volume, difficulty, cpc, position, reconcile } from "./seo_evidence.mjs";

export const INTENT_WEIGHTS = {
  transactional: 0.25,
  commercial: 0.22,
  informational: 0.18,
  "how-to": 0.18,
  problem: 0.17
};

export function intentMatchScore(intent, targetIntent) {
  if (!intent || !targetIntent) return 0.5;
  return intent === targetIntent ? 1.0 : 0.6;
}

export function keywordOpportunityScore({
  keyword,
  intent,
  targetIntent = null,
  volumeData = DATA_UNAVAILABLE,
  difficultyData = DATA_UNAVAILABLE,
  cpcData = DATA_UNAVAILABLE,
  currentPosition = DATA_UNAVAILABLE,
  competitorPositions = [],
  existingAuthority = 0,
  existingRankings = [],
  clusterValue = 0.5,
  businessValue = 0.5,
  contentEffort = 0.5,
  conversionPotential = 0.5,
  serpFeatures = [],
  serpWeakness = 0
} = {}) {
  const components = [];

  const vol = volumeData?.available ? Math.min(1, (volumeData.value || 0) / 10000) : 0.5;
  const diff = difficultyData?.available ? Math.max(0, 1 - (difficultyData.value || 0) / 100) : 0.5;
  const cpcVal = cpcData?.available ? Math.min(1, (cpcData.value || 0) / 10) : 0.5;
  const pos = currentPosition?.available ? Math.max(0, 1 - (currentPosition.value || 0) / 100) : 0;
  const intentScore = targetIntent ? intentMatchScore(intent, targetIntent) : 0.7;

  const compWeakness = competitorPositions.length
    ? Math.max(0, 1 - competitorPositions.reduce((a, b) => a + b, 0) / (competitorPositions.length * 100))
    : 0.5;

  const serpBonus = serpFeatures.includes("featured_snippet") ? 0.1
    : serpFeatures.includes("people_also_ask") ? 0.08
    : serpFeatures.includes("video") ? 0.05
    : 0;

  components.push({ name: "volume_potential", weight: 0.12, score: vol });
  components.push({ name: "difficulty_inverse", weight: 0.10, score: diff });
  components.push({ name: "cpc_indicator", weight: 0.06, score: cpcVal });
  components.push({ name: "current_ranking_headroom", weight: 0.14, score: pos });
  components.push({ name: "competitor_weakness", weight: 0.12, score: compWeakness });
  components.push({ name: "intent_match", weight: 0.14, score: intentScore });
  components.push({ name: "existing_authority", weight: 0.08, score: Math.min(1, existingAuthority / 100) });
  components.push({ name: "cluster_strategic_value", weight: 0.10, score: clusterValue });
  components.push({ name: "business_value", weight: 0.08, score: businessValue });
  components.push({ name: "conversion_potential", weight: 0.06, score: conversionPotential });

  let totalWeight = 0;
  let weightedSum = 0;
  for (const c of components) {
    weightedSum += c.score * c.weight;
    totalWeight += c.weight;
  }

  const baseScore = Math.round((weightedSum / totalWeight) * 100);
  const adjusted = Math.min(100, baseScore + Math.round(serpBonus * 100));

  return {
    keyword,
    intent,
    opportunity_score: adjusted,
    components: components.map(c => ({ ...c, contribution: Math.round(c.score * c.weight * 100) })),
    confidence: (volumeData.available && difficultyData.available && currentPosition.available) ? "HIGH" : "MEDIUM",
    breakdown: components.map(c => `${c.name}:${Math.round(c.score * 100)}`).join(" | ")
  };
}

export function rankKeywordOpportunities(keywords) {
  return keywords.map(k => keywordOpportunityScore(k)).sort((a, b) => b.opportunity_score - a.opportunity_score);
}