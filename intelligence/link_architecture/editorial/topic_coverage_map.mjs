/* AmzLoss Editorial Content Network — Topic Coverage Map
   For every major topic, maps: CORE TOPIC → SUBTOPICS → QUESTIONS → PROBLEMS →
   TOOLS → COMPARISONS → ADVANCED TOPICS, and identifies missing content.
   Used to recommend future articles and assess cluster completeness. */

import { identifyHubs } from "./hub_identifier.mjs";

/**
 * Build a topic coverage map for a topic/cluster.
 */
export function buildTopicCoverageMap(topic, clusterPages = [], pillar = null) {
  const covered = new Set();
  const tools = [];
  const comparisons = [];
  const advanced = [];

  for (const p of clusterPages) {
    const title = (p.title || "").toLowerCase();
    if (p.role === "tool" || /calculator|audit|checker|analyzer/.test(p.slug || "")) tools.push(p.slug);
    else if (/compare|versus|vs|alternative|network/.test(title)) comparisons.push(p.slug);
    else if (/advanced|deep|guide|strategy|optimization|forecast|how to/.test(title)) advanced.push(p.slug);
    covered.add(title);
  }

  // Known subtopics/questions that a mature editorial publication would cover
  const coreSubtopicIdeas = {
    "commission rate": ["rates by category", "2026 schedule", "rate cut reasons"],
    "earnings": ["calculation", "optimization", "forecasting", "report analysis", "tracking"],
    "audit": ["csv upload", "underpayment detection", "payout verification"]
  };

  const key = Object.keys(coreSubtopicIdeas).find(k => topic.toLowerCase().includes(k));
  const expectSubtopic = key ? coreSubtopicIdeas[key] : [];

  const coveredSubtopic = expectSubtopic.filter(s => [...covered].some(c => c.includes(s)));
  const missingSubtopic = expectSubtopic.filter(s => !coveredSubtopic.includes(s));

  // Identify missing content types
  const missing = {
    subtopics: missingSubtopic,
    questions_unanswered: [],
    problem_pages_missing: !clusterPages.some(p => p.role === "problem"),
    advanced_guides_missing: advanced.length === 0 && /guide|strategy/.test(topic.toLowerCase())
  };

  // Hub opportunities
  const hubOpportunities = identifyHubs([...clusterPages, ...(pillar ? [pillar] : [])]);

  return {
    core_topic: topic,
    pillar: pillar?.slug || null,
    subtopics_covered: coveredSubtopic,
    subtopics_missing: missingSubtopic,
    tools_available: tools,
    comparisons_available: comparisons,
    advanced_guides: advanced,
    missing_content: missing,
    hub_opportunities: hubOpportunities,
    recommended_future_articles: [
      ...missingSubtopic.map(s => `${topic}: ${capitalize(s)}`),
      ...(missing.problem_pages_missing ? [`Common ${topic} problems and how to fix them`] : []),
      ...(missing.advanced_guides_missing ? [`Advanced ${topic} optimization guide`] : [])
    ]
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
