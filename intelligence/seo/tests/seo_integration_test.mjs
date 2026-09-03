/* AmzLoss SEO Intelligence & Topical Authority Engine — Integration Test
   Exercises every SEO sub-engine against the real site data.
   Demonstrates: keyword intelligence, search intent, SERP analysis,
   topical authority, content gaps, entity coverage, topic expansion,
   prioritization, blueprint, differentiation, optimization, cannibalization,
   decay, technical SEO, competitor gaps, backlinks, dashboard, next-action,
   performance, experiments, approval gates, memory, and report. */

import { loadSiteData, articleBySlug } from "../site_data.mjs";
import { keywordIntelligence, siteKeywordMap, matchKeywordToArticle, detectSearchIntent } from "../keyword/keyword_intelligence.mjs";
import { searchIntentAnalysis, clusterIntentCoverage, classifyIntent, intentDefinition } from "../keyword/search_intent.mjs";
import { analyzeSERPOpportunities, serpSummary } from "../keyword/serp_analysis.mjs";
import { clusterAuthorityScore, topicalAuthorityMap, topicalAuthorityGraph } from "../topics/topical_authority.mjs";
import { contentGapAnalysis, bestGap, evaluateGap } from "../topics/content_gaps.mjs";
import { entityCoverageMap, unaddressedSemanticQueries } from "../topics/entity_coverage.mjs";
import { evaluateTopicExpansion, adjudicateExpansions } from "../topics/topic_expansion.mjs";
import { priorityScore, rankByPriority } from "../content/prioritization.mjs";
import { articleBlueprint, blueprintsForGaps } from "../content/blueprint.mjs";
import { differentiationProfile } from "../content/differentiation.mjs";
import { optimizeArticle, optimizeArticleBatch } from "../content/optimization.mjs";
import { cannibalizationAnalysis, cannibalizationSummary } from "../health/cannibalization.mjs";
import { decayAnalysis } from "../health/decay.mjs";
import { technicalSiteAudit, technicalPriorityFixes } from "../health/technical.mjs";
import { competitorGapAnalysis, competitorSummary } from "../competition/competitor_gaps.mjs";
import { linkableAssetEngine, backlinkOpportunityEngine } from "../competition/backlinks.mjs";
import { seoDashboard } from "../strategy/dashboard.mjs";
import { nextAction } from "../strategy/next_action.mjs";
import { performanceSnapshot, performanceFeedbackReport } from "../strategy/performance.mjs";
import { seoMemoryOverview } from "../strategy/seo_memory.mjs";
import { createExperiment, listExperiments, updateExperimentStatus } from "../strategy/experiments.mjs";
import { requiresApproval, gateStatus, submitForApproval, approveGate, rejectGate, pendingApprovals } from "../strategy/approval.mjs";
import { seoReport, seoReportMarkdown } from "../report.mjs";
import { saveJson } from "../io.mjs";
import { verdictForScore, CONTENT_VERDICT, AUTHORITY_TIERS, APPROVAL_GATED_ACTIONS } from "../config.mjs";

let passed = 0;
let failed = 0;
function assert(label, condition) {
  if (condition) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ FAIL: ${label}`); }
}

console.log("=== SEO INTEGRATION TEST ===\n");

/* ── Load real site ────────────────────────────────────────────── */
const site = loadSiteData({ includeHTML: true });
console.log(`Real site loaded: ${site.articles.length} articles, ${Object.keys(site.clusters).length} clusters\n`);

/* ── TEST 1: Site data integrity ──────────────────────────────── */
console.log("--- TEST 1: Site Data Integrity ---");
assert("articles > 0", site.articles.length > 0);
assert("clusters > 0", Object.keys(site.clusters).length > 0);
assert("has audit data", site.audit.phase1_inventory?.articles?.length > 0);
assert("priority_queue loaded", site.priority_queue.length > 0);
assert("cannibalization_cases loaded", Array.isArray(site.cannibalization_cases));
const sample = site.articles[0];
assert("article has slug", !!sample.slug);
assert("article has title", !!sample.title);
assert("article has seo_quality", typeof sample.seo_quality === "number");
assert("article has entities array", Array.isArray(sample.entities));
assert("article has html", !!sample.html);
assert("article has meta_description", typeof sample.meta_description === "string");
assert("article has headings", !!sample.headings.h2);
assert("article has structured_data_types", Array.isArray(sample.structured_data_types));
assert("article has has_main boolean", typeof sample.has_main === "boolean");
assert("article has has_faq boolean", typeof sample.has_faq === "boolean");

/* ── TEST 2: Keyword Intelligence ─────────────────────────────── */
console.log("\n--- TEST 2: Keyword Intelligence ---");
const kw = keywordIntelligence(site);
assert("total_keywords > 0", kw.total_keywords > 0);
assert("internal_keywords >= 0", kw.internal_keywords >= 0);
assert("intent_coverage has informational", "informational" in kw.intent_coverage);
assert("keywords list populated", kw.keywords.length > 0);
assert("each keyword has metrics object", kw.keywords[0].metrics !== undefined);
assert("volume marked unavailable when absent", kw.search_volume_available === 0);

/* ── TEST 3: Search Intent ────────────────────────────────────── */
console.log("\n--- TEST 3: Search Intent ---");
const intentAnalysis = searchIntentAnalysis(site);
assert("page_intent_distribution has entries", Object.keys(intentAnalysis.page_intent_distribution).length > 0);
assert("cluster_intent_coverage has entries", intentAnalysis.cluster_intent_coverage.length > 0);
assert("classifyIntent returns valid intent", ["informational","commercial","transactional","how-to","problem"].includes(classifyIntent("amazon affiliate commission calculator").intent));
assert("intentDefinition returns object for informational", intentDefinition("informational").label === "Informational");
const topCluster = Object.keys(site.clusters)[0];
const clusterCov = clusterIntentCoverage(site, topCluster);
assert("clusterIntentCoverage returns covered_intents", Array.isArray(clusterCov.covered_intents));
assert("clusterIntentCoverage returns missing_intents", Array.isArray(clusterCov.missing_intents));
assert("detectSearchIntent identifies how-to", detectSearchIntent("how to audit amazon earnings") === "how-to");
assert("detectSearchIntent identifies commercial", detectSearchIntent("best affiliate network comparison") === "commercial");

/* ── TEST 4: SERP Analysis ────────────────────────────────────── */
console.log("\n--- TEST 4: SERP Analysis ---");
const serp = serpSummary(site);
assert("serp returns provided boolean", typeof serp.provided === "boolean");
assert("no feed = not provided", serp.provided === false);
const serpOpps = analyzeSERPOpportunities(site);
assert("SERP opportunities has queries", Array.isArray(serpOpps.snapshots.queries));

/* ── TEST 5: Topical Authority ────────────────────────────────── */
console.log("\n--- TEST 5: Topical Authority ---");
const topAuth = topicalAuthorityMap(site);
assert("clusters array populated", topAuth.clusters.length > 0);
assert("average_score 0-100", topAuth.average_score >= 0 && topAuth.average_score <= 100);
assert("leading + growing + emerging + dormant sums", topAuth.leading + topAuth.growing + topAuth.emerging + topAuth.dormant === topAuth.clusters.length);
const clusterAuth = clusterAuthorityScore(site, "Commission Cuts");
assert("Commission Cuts authority score 0-100", clusterAuth.score >= 0 && clusterAuth.score <= 100);
assert("has component_scores", typeof clusterAuth.component_scores === "object");
assert("has verdict with action", typeof clusterAuth.verdict?.action === "string");
assert("has strategic_importance", typeof clusterAuth.strategic_importance === "number");
const topAuthGraph = topicalAuthorityGraph(site);
assert("authority graph has relationship_types", typeof topAuthGraph.relationship_types === "object");
assert("authority graph warns not to rebuild", topAuthGraph.note.includes("Do not rebuild"));

/* ── TEST 6: Content Gaps ─────────────────────────────────────── */
console.log("\n--- TEST 6: Content Gaps ---");
const gaps = contentGapAnalysis(site);
assert("gaps object has gaps array", Array.isArray(gaps.gaps));
assert("gaps object has ignored array", Array.isArray(gaps.ignored));
assert("total_gaps is integer", Number.isInteger(gaps.total_gaps));
assert("has note field", typeof gaps.note === "string");
if (gaps.top_gap) {
  assert("top_gap has topic", !!gaps.top_gap.topic);
  assert("top_gap has intent", !!gaps.top_gap.intent);
  assert("top_gap has cluster", !!gaps.top_gap.cluster);
  assert("top_gap has genuine_gap boolean", typeof gaps.top_gap.genuine_gap === "boolean");
  assert("top_gap has priority_score", typeof gaps.top_gap.priority_score === "number");
}
/* evaluateGap manually */
const gapEval = evaluateGap(site, { topic: "Amazon affiliates", intent: "informational", cluster: "Earnings & Payout" });
assert("evaluateGap has genuine_gap", typeof gapEval.genuine_gap === "boolean");
assert("evaluateGap has verdict", ["NEW_CONTENT_GAP","ALREADY_COVERED"].includes(gapEval.verdict));

/* ── TEST 7: Entity Coverage ──────────────────────────────────── */
console.log("\n--- TEST 7: Entity Coverage ---");
const ent = entityCoverageMap(site);
assert("strategic_entities is array", Array.isArray(ent.strategic_entities));
assert("dense/thin/absent arrays", Array.isArray(ent.dense) && Array.isArray(ent.thin) && Array.isArray(ent.absent));
assert("entities_total_seen > 0", ent.entities_total_seen > 0);
const unaddressed = unaddressedSemanticQueries(site);
assert("unaddressedSemanticQueries returns results array", Array.isArray(unaddressed.results));

/* ── TEST 8: Topic Expansion ──────────────────────────────────── */
console.log("\n--- TEST 8: Topic Expansion Discipline ---");
const expansion = evaluateTopicExpansion(site, {
  title: "Amazon Associates Commission Rates 2026",
  cluster: "Commission Rates"
});
assert("duplicate query flagged", expansion.duplicate_of !== null || expansion.verdict !== "CREATE");
assert("has verdict", ["CREATE","REUSE","DEFER"].includes(expansion.verdict));
assert("has reasons array", Array.isArray(expansion.reasons) && expansion.reasons.length > 0);
const batchExpansion = adjudicateExpansions(site, [
  { title: "New affiliate program X", intent: "commercial", cluster: "Affiliate Networks" },
  { title: "Amazon Associates Commission Rates 2026", cluster: "Commission Rates" }
]);
assert("batch adjudication has totals", batchExpansion.create + batchExpansion.reuse + batchExpansion.defer === batchExpansion.total);

/* ── TEST 9: Prioritization ───────────────────────────────────── */
console.log("\n--- TEST 9: Prioritization (0-100 explainable) ---");
const prio = priorityScore(site, { slug: sample.slug });
assert("score 0-100", prio.score >= 0 && prio.score <= 100);
assert("has verdict", typeof prio.verdict === "string");
assert("has breakdown array", Array.isArray(prio.breakdown));
assert("breakdown components have name/value/weight/explanation", prio.breakdown.every(c => c.name && typeof c.value === "number" && typeof c.weight === "number" && typeof c.explanation === "string"));
assert("missing_signals present", Array.isArray(prio.missing_signals));
assert("reasoning is string", typeof prio.reasoning === "string");
const ranked = rankByPriority(site, { pages: site.articles.slice(0, 5).map(a => ({ slug: a.slug, title: a.title, cluster: a.topic_cluster, seo_quality: a.seo_quality, importance: a.importance, inbound: a.internal_inbound })) });
assert("ranked array sorted by score descending", ranked.length > 0 && ranked[0].score >= ranked[ranked.length - 1].score);

/* ── TEST 10: Blueprint ───────────────────────────────────────── */
console.log("\n--- TEST 10: Article Blueprint ---");
const bpTopic = site.articles[1].title;
const bp = articleBlueprint(site, { title: bpTopic, slug: "test-blueprint", cluster: site.articles[1].topic_cluster });
assert("blueprint has blueprint_id", !!bp.blueprint_id);
assert("blueprint has slug", !!bp.slug);
assert("blueprint has intent", !!bp.intent);
assert("blueprint has cluster", !!bp.cluster);
assert("blueprint has entities_to_cover", Array.isArray(bp.entities_to_cover));
assert("blueprint has faq_seeds", Array.isArray(bp.faq_seeds));
assert("blueprint has original_value_mandate", typeof bp.original_value_mandate === "string");
assert("blueprint has approval_gate", typeof bp.approval_gate === "object");
assert("approval_gate requires_approval", bp.approval_gate.requires_approval === true);
assert("blueprint has internal_link_targets", Array.isArray(bp.internal_link_targets));
assert("blueprint has cluster_authority", typeof bp.cluster_authority === "number");

/* ── TEST 11: Differentiation ─────────────────────────────────── */
console.log("\n--- TEST 11: Differentiation ---");
const diff = differentiationProfile(site, { title: sample.title, slug: sample.slug });
assert("has differentiation_score 0-100", typeof diff.differentiation_score === "number" && diff.differentiation_score >= 0 && diff.differentiation_score <= 100);
assert("has verdict", ["DIFFERENTIATED","MARGINAL","NOT_DIFFERENTIATED"].includes(diff.verdict));
assert("has proposed_angle", typeof diff.proposed_angle === "string");
assert("has original_value boolean", typeof diff.original_value === "boolean");
assert("has no_duplicate_guarantee", typeof diff.no_duplicate_guarantee === "boolean");
assert("has angle_statement", typeof diff.angle_statement === "string");

/* ── TEST 12: Optimization ────────────────────────────────────── */
console.log("\n--- TEST 12: Optimization Agent ---");
const opt = optimizeArticle(site, sample.slug);
assert("available is true", opt.available === true);
assert("has issues array", Array.isArray(opt.issues));
assert("has seo_quality", typeof opt.seo_quality === "number");
assert("has priority 0-100", typeof opt.priority === "number" && opt.priority >= 0 && opt.priority <= 100);
assert("does NOT recommend new page for editorial", opt.recommends_new_page === false);
assert("has is_publish_ready_after_fix boolean", typeof opt.is_publish_ready_after_fix === "boolean");
assert("has summary string", typeof opt.summary === "string");
assert("has approval_notes", typeof opt.approval_notes === "string");
const batch = optimizeArticleBatch(site);
assert("batch total > 0", batch.total > 0);
assert("batch needs_attention is integer", typeof batch.needs_attention === "number");

/* ── TEST 13: Cannibalization ─────────────────────────────────── */
console.log("\n--- TEST 13: Cannibalization ---");
const canni = cannibalizationAnalysis(site);
assert("total_cases is integer", typeof canni.total_cases === "number");
assert("resolved + unresolved = total", canni.resolved + canni.unresolved === canni.total_cases);
assert("each case has id", canni.cases.every(c => typeof c.id === "string"));
assert("each case has decision", ["RESOLVED_KEEP","MERGE","DIFFERENTIATE","DIFFERENTIATE_INTENT"].includes(canni.cases[0]?.decision));
assert("merge candidates have requires_approval flag", canni.merge_candidates.every(c => typeof c.requires_approval === "boolean"));
const canniSummary = cannibalizationSummary(site);
assert("cannibalizationSummary has unresolved count", typeof canniSummary.unresolved === "number");

/* ── TEST 14: Decay ───────────────────────────────────────────── */
console.log("\n--- TEST 14: Decay ---");
const decay = decayAnalysis(site);
assert("total matches articles count", decay.total === site.articles.length);
assert("decayed_count is integer", typeof decay.decayed_count === "number");
assert("decayed_pages sorted by risk_score", decay.decayed_pages.length <= 1 || decay.decayed_pages[0].risk_score >= decay.decayed_pages[decay.decayed_pages.length - 1].risk_score);
assert("each decayed page has reasons array", decay.decayed_pages.every(p => Array.isArray(p.reasons)));
assert("has summary string", typeof decay.summary === "string");

/* ── TEST 15: Technical SEO ───────────────────────────────────── */
console.log("\n--- TEST 15: Technical SEO ---");
const tech = technicalSiteAudit(site);
assert("total_pages matches", tech.total_pages === site.articles.length);
assert("green + yellow + red = total", tech.green + tech.yellow + tech.red === tech.total_pages);
assert("average_score 0-100", tech.average_score >= 0 && tech.average_score <= 100);
assert("has pages array", Array.isArray(tech.pages));
assert("pages sorted by score ascending", tech.pages.length <= 1 || tech.pages[0].technical_score <= tech.pages[1].technical_score);
assert("each page has health_tier", tech.pages.every(p => ["GREEN","YELLOW","RED"].includes(p.health_tier)));
const fix = technicalPriorityFixes(site);
assert("has top_global_issues", Array.isArray(fix.top_global_issues));
assert("has summary", typeof fix.summary === "string");

/* ── TEST 16: Competitor Gaps ─────────────────────────────────── */
console.log("\n--- TEST 16: Competitor Gaps ---");
const comp = competitorGapAnalysis(site);
assert("competitors_count is integer", typeof comp.competitors_count === "number");
assert("note string", typeof comp.note === "string");
assert("has coverage_gaps and depth_gaps arrays", Array.isArray(comp.coverage_gaps) && Array.isArray(comp.depth_gaps));

/* ── TEST 17: Backlinks / Linkable Assets ─────────────────────── */
console.log("\n--- TEST 17: Backlinks & Linkable Assets ---");
const assets = linkableAssetEngine(site);
assert("assets array length matches", assets.assets.length === site.articles.length);
assert("top_assets length <= 5", assets.top_assets.length <= 5);
assert("has asset_score 0-100", assets.assets[0].asset_score >= 0 && assets.assets[0].asset_score <= 100);
assert("has asset_tier", ["PREMIUM","SOLID","WEAK"].includes(assets.assets[0].asset_tier));
assert("sorted by score desc", assets.assets[0].asset_score >= assets.assets[assets.assets.length - 1].asset_score);
const opps = backlinkOpportunityEngine(site);
assert("has provided boolean", typeof opps.provided === "boolean");
assert("no feed = false", opps.provided === false);

/* ── TEST 18: Dashboard ───────────────────────────────────────── */
console.log("\n--- TEST 18: Dashboard ---");
const dash = seoDashboard(site);
assert("has generated_at", !!dash.generated_at);
assert("has title", dash.title === "AmzLoss SEO Intelligence Dashboard");
assert("kpis object present", typeof dash.kpis === "object");
assert("kpis.clusters > 0", dash.kpis.clusters > 0);
assert("kpis.articles > 0", dash.kpis.articles > 0);
assert("kpis.avg_authority 0-100", dash.kpis.avg_authority >= 0 && dash.kpis.avg_authority <= 100);
assert("opportunity_map array", Array.isArray(dash.opportunity_map));
assert("opportunity_map items have cluster and open_levers", dash.opportunity_map.every(o => o.cluster && typeof o.open_levers === "object"));
assert("feeds object present", typeof dash.feeds === "object");
assert("feeds keyword_research boolean", typeof dash.feeds.keyword_research === "boolean");
assert("feeds serp_snapshot boolean", typeof dash.feeds.serp_snapshot === "boolean");
assert("feeds competitor_feed boolean", typeof dash.feeds.competitor_feed === "boolean");
assert("feeds backlink_feed boolean", typeof dash.feeds.backlink_feed === "boolean");
assert("feeds traffic_feed boolean", typeof dash.feeds.traffic_feed === "boolean");
assert("next_action present", typeof dash.next_action === "object");
assert("next_action has priority", typeof dash.next_action.priority === "string");
assert("next_action has detail or one_liner", typeof (dash.next_action.detail || dash.next_action.one_liner) === "string");

/* ── TEST 19: Next Action ─────────────────────────────────────── */
console.log("\n--- TEST 19: Next Action Engine ---");
const na = nextAction(site);
assert("has rank", typeof na.rank === "number");
assert("has type", typeof na.type === "string");
assert("has one_liner", typeof na.one_liner === "string");
assert("has approval_required boolean", typeof na.approval_required === "boolean");
assert("has reason or reason-like field", typeof (na.reason || "") === "string");

/* ── TEST 20: Performance ─────────────────────────────────────── */
console.log("\n--- TEST 20: Performance Feedback ---");
const perf = performanceSnapshot(site);
assert("feed_provided boolean", typeof perf.feed_provided === "boolean");
assert("all pages in unmeasured (no feed)", perf.unmeasured_count === site.articles.length);
assert("note string", typeof perf.note === "string");
const perfReport = performanceFeedbackReport(site);
assert("snapshot in report", !!perfReport.snapshot);
assert("has recommended_next string", typeof perfReport.recommended_next === "string");

/* ── TEST 21: Experiments ─────────────────────────────────────── */
console.log("\n--- TEST 21: Experiments ---");
const expCreate = createExperiment({
  title: "Test Experiment",
  hypothesis: "Changing meta description improves CTR",
  control: "original meta",
  variable: "new meta with numbers",
  metric: "CTR",
  pages: ["amazon-2026-commission-cuts"]
});
assert("experiment created", expCreate.ok === true);
assert("experiment has id", typeof expCreate.experiment.id === "string");
const exps = listExperiments();
assert("experiments list has total", typeof exps.total === "number");
assert("experiment found", exps.experiments.some(e => e.title === "Test Experiment"));
const expUpdate = updateExperimentStatus(expCreate.experiment.id, { status: "RUNNING", result_note: "started" });
assert("experiment status updated", expUpdate.ok === true);
assert("status is RUNNING", expUpdate.experiment.status === "RUNNING");

/* ── TEST 22: Approval Gates ──────────────────────────────────── */
console.log("\n--- TEST 22: Approval Gates ---");
assert("NEW_URL is approval-gated", requiresApproval("NEW_URL") === true);
assert("MERGE is approval-gated", requiresApproval("MERGE") === true);
assert("REDIRECT is approval-gated", requiresApproval("REDIRECT") === true);
assert("DELETE is approval-gated", requiresApproval("DELETE") === true);
assert("OUTREACH is approval-gated", requiresApproval("OUTREACH") === true);
assert("EDIT is NOT approval-gated", requiresApproval("EDIT") === false);
const gate = gateStatus("MERGE");
assert("gateStatus MERGE requires approval", gate.approval_required === true);
const submitted = submitForApproval({ actionType: "MERGE", pages: ["page-a","page-b"], reason: "high overlap" });
assert("submission ok", submitted.ok === true);
assert("has requirement_id", typeof submitted.requirement_id === "string");
const approved = approveGate(submitted.requirement_id, "test-user");
assert("approval ok", approved.ok === true);
assert("status is APPROVED", approved.status === "APPROVED");
const pending = pendingApprovals();
assert("pendingApprovals returns array", Array.isArray(pending));

/* ── TEST 23: SEO Memory ──────────────────────────────────────── */
console.log("\n--- TEST 23: SEO Memory ---");
const mem = seoMemoryOverview();
assert("total_recommendations >= 1 (from approval test)", mem.total_recommendations >= 1);
assert("approved >= 1", mem.approved >= 1);
assert("recent array", Array.isArray(mem.recent));
assert("recent items have id and status", mem.recent.length === 0 || (mem.recent[0].id && mem.recent[0].status));
assert("experiments integer", typeof mem.experiments === "number");
assert("feedback_entries integer", typeof mem.feedback_entries === "number");

/* ── TEST 24: Report ──────────────────────────────────────────── */
console.log("\n--- TEST 24: SEO Report ---");
const report = seoReport(site);
assert("report has generated_at", !!report.generated_at);
assert("report has headline", typeof report.headline === "object");
assert("report has sections", typeof report.sections === "object");
assert("sections has keyword_intelligence", !!report.sections.keyword_intelligence);
assert("sections has topical_authority", !!report.sections.topical_authority);
assert("sections has content_gaps", !!report.sections.content_gaps);
assert("sections has cannibalization", !!report.sections.cannibalization);
assert("sections has decay", !!report.sections.decay);
assert("sections has technical_seo", !!report.sections.technical_seo);
assert("sections has performance", !!report.sections.performance);
assert("sections has memory", !!report.sections.memory);
assert("report has recommendations", typeof report.recommendations === "object");
assert("has next_action", !!report.next_action);
const md = seoReportMarkdown(site);
assert("markdown is string", typeof md === "string");
assert("markdown starts with #", md.startsWith("#"));
assert("markdown length > 500", md.length > 500);
assert("markdown contains 'Topical Authority'", md.includes("Topical Authority"));

/* ── TEST 25: Config verdicts ─────────────────────────────────── */
console.log("\n--- TEST 25: Config & Scoring Integrity ---");
assert("verdictForScore(95) = PUBLISH", verdictForScore(95) === CONTENT_VERDICT.PUBLISH.label);
assert("verdictForScore(82) = MINOR", verdictForScore(82) === CONTENT_VERDICT.MINOR.label);
assert("verdictForScore(71) = REVISION", verdictForScore(71) === CONTENT_VERDICT.REVISE.label);
assert("verdictForScore(50) = REJECT", verdictForScore(50) === CONTENT_VERDICT.REJECT.label);
assert("APPROVAL_GATED_ACTIONS length >= 6", APPROVAL_GATED_ACTIONS.length >= 6);
assert("AUTHORITY_TIERS has LEADING", typeof AUTHORITY_TIERS.LEADING === "number");

/* ── TEST 26: No fabricated data guarantee ────────────────────── */
console.log("\n--- TEST 26: No Fabricated Data Guarantee ---");
const allKw = kw.keywords;
const volumeAvail = allKw.filter(k => k.metrics.volume.available);
assert("NO keyword volume data fabricated when feed absent", volumeAvail.length === 0);
const serpFeed = serpSummary(site);
assert("NO SERP ranking data fabricated when feed absent", serpFeed.queries_with_rank === 0);
const perfSnap = performanceSnapshot(site);
assert("ALL pages flagged unmeasured when no traffic feed", perfSnap.measured_count === 0);
const compAnalysis = competitorGapAnalysis(site);
assert("NO competitor data fabricated when feed absent", compAnalysis.competitors_count === 0);
const oppsB = backlinkOpportunityEngine(site);
assert("NO backlink opportunity fabricated when feed absent", oppsB.provided === false);

/* ── Save test report ─────────────────────────────────────────── */
const testReport = {
  timestamp: new Date().toISOString(),
  site: { articles: site.articles.length, clusters: Object.keys(site.clusters).length },
  passed,
  failed,
  total: passed + failed,
  all_pass: failed === 0
};
saveJson("C:\\Users\\DELL\\amzloss\\intelligence\\seo\\reports\\seo_test_report.json", testReport);
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} total ===`);
console.log(failed === 0 ? "ALL TESTS PASS ✓" : `TESTS FAILED ✗ (${failed} failures)`);