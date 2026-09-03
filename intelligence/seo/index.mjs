/* AmzLoss SEO Intelligence & Topical Authority Engine — Public API
   Single import surface for the whole SEO subsystem. Consumers use
   `import { runSeoEngine } from "./intelligence/seo/index.mjs"` and a
   coherent `seo` object is returned ready for CLI/report/agents. */

import { loadSiteData, articleBySlug } from "./site_data.mjs";

import { keywordIntelligence, siteKeywordMap, researchedKeywords, matchKeywordToArticle, detectSearchIntent } from "./keyword/keyword_intelligence.mjs";
import { searchIntentAnalysis, clusterIntentCoverage, classifyIntent, pageIntent } from "./keyword/search_intent.mjs";
import { analyzeSERPOpportunities, serpSummary } from "./keyword/serp_analysis.mjs";

import { clusterAuthorityScore, topicalAuthorityMap, topicalAuthorityGraph } from "./topics/topical_authority.mjs";
import { contentGapAnalysis, bestGap, evaluateGap } from "./topics/content_gaps.mjs";
import { entityCoverageMap, unaddressedSemanticQueries } from "./topics/entity_coverage.mjs";
import { evaluateTopicExpansion, adjudicateExpansions } from "./topics/topic_expansion.mjs";

import { priorityScore, rankByPriority } from "./content/prioritization.mjs";
import { articleBlueprint, blueprintsForGaps } from "./content/blueprint.mjs";
import { differentiationProfile } from "./content/differentiation.mjs";
import { optimizeArticle, optimizeArticleBatch } from "./content/optimization.mjs";

import { cannibalizationAnalysis, cannibalizationSummary } from "./health/cannibalization.mjs";
import { decayAnalysis } from "./health/decay.mjs";
import { technicalSiteAudit, technicalAuditSingle, technicalPriorityFixes } from "./health/technical.mjs";

import { competitorGapAnalysis, competitorSummary } from "./competition/competitor_gaps.mjs";
import { linkableAssetEngine, backlinkOpportunityEngine } from "./competition/backlinks.mjs";

import { seoDashboard } from "./strategy/dashboard.mjs";
import { nextAction } from "./strategy/next_action.mjs";
import { performanceSnapshot, performanceFeedbackReport } from "./strategy/performance.mjs";
import { seoMemoryOverview } from "./strategy/seo_memory.mjs";
import { createExperiment, listExperiments, updateExperimentStatus } from "./strategy/experiments.mjs";
import { requiresApproval, gateStatus, submitForApproval, approveGate, rejectGate, pendingApprovals } from "./strategy/approval.mjs";

import { seoReport, seoReportMarkdown } from "./report.mjs";
import { recordRecommendation, recordPerformanceFeedback, getMemory, ensureMemory } from "./io.mjs";

export const VERSION = "1.0.0";

export {
  loadSiteData, articleBySlug,
  keywordIntelligence, siteKeywordMap, researchedKeywords, matchKeywordToArticle, detectSearchIntent,
  searchIntentAnalysis, clusterIntentCoverage, classifyIntent, pageIntent,
  analyzeSERPOpportunities, serpSummary,
  clusterAuthorityScore, topicalAuthorityMap, topicalAuthorityGraph,
  contentGapAnalysis, bestGap, evaluateGap,
  entityCoverageMap, unaddressedSemanticQueries,
  evaluateTopicExpansion, adjudicateExpansions,
  priorityScore, rankByPriority,
  articleBlueprint, blueprintsForGaps,
  differentiationProfile,
  optimizeArticle, optimizeArticleBatch,
  cannibalizationAnalysis, cannibalizationSummary,
  decayAnalysis,
  technicalSiteAudit, technicalAuditSingle, technicalPriorityFixes,
  competitorGapAnalysis, competitorSummary,
  linkableAssetEngine, backlinkOpportunityEngine,
  seoDashboard, nextAction,
  performanceSnapshot, performanceFeedbackReport,
  seoMemoryOverview,
  createExperiment, listExperiments, updateExperimentStatus,
  requiresApproval, gateStatus, submitForApproval, approveGate, rejectGate, pendingApprovals,
  seoReport, seoReportMarkdown,
  recordRecommendation, recordPerformanceFeedback, getMemory, ensureMemory
};

/* Convenience: run the whole engine once. Returns every section, ready
   for CLI printing or JSON report persistence. */
export async function runSeoEngine({ includeHTML = false } = {}) {
  const site = loadSiteData({ includeHTML });
  const report = seoReport(site);
  const markdown = seoReportMarkdown(site);

  // Persist the generated report
  const { saveJson, REPORT_DIR } = await import("./io.mjs");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const outDir = path.join(REPORT_DIR, "seo_report.json");
  saveJson(outDir, report);

  return {
    site,
    report,
    markdown,
    report_path: outDir
  };
}