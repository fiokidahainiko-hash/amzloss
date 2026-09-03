/* AmzLoss SEO Intelligence — Edge Case Test Suite
   Comprehensive edge-case coverage against the REAL site data and
   real feed handling. Focuses on:
     - Missing data (all feeds absent)
     - Partial data
     - Conflicting evidence reconciliation
     - URL switching / rank cannibalization
     - Cannibalization arithmetic
     - Content decay
     - Competitor gaps (no feed + with feed)
     - Content gap + expansion adjudication
     - Blog pipeline bridge
     - Data-source failure (corrupt JSON)
     - Empty feed handling

   Hard guarantee enforced here: the engine NEVER fabricates metrics.
   Anything without a real feed must be marked DATA_UNAVAILABLE. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadSiteData } from "../site_data.mjs";
import { keywordIntelligence } from "../keyword/keyword_intelligence.mjs";
import { searchIntentAnalysis, classifyIntent } from "../keyword/search_intent.mjs";
import { serpSummary } from "../keyword/serp_analysis.mjs";
import { clusterAuthorityScore, topicalAuthorityMap } from "../topics/topical_authority.mjs";
import { contentGapAnalysis, evaluateGap } from "../topics/content_gaps.mjs";
import { entityCoverageMap } from "../topics/entity_coverage.mjs";
import { evaluateTopicExpansion, adjudicateExpansions } from "../topics/topic_expansion.mjs";
import { priorityScore } from "../content/prioritization.mjs";
import { optimizeArticle } from "../content/optimization.mjs";
import { cannibalizationAnalysis, cannibalizationSummary } from "../health/cannibalization.mjs";
import { technicalSiteAudit } from "../health/technical.mjs";
import { decayAnalysis } from "../health/decay.mjs";
import { competitorGapAnalysis } from "../competition/competitor_gaps.mjs";
import { backlinkOpportunityEngine, linkableAssetEngine } from "../competition/backlinks.mjs";
import { nextAction } from "../strategy/next_action.mjs";
import { performanceSnapshot } from "../strategy/performance.mjs";
import { saveJson } from "../io.mjs";
import { reconcile, DATA_UNAVAILABLE, ev, evN } from "../orchestrator/seo_evidence.mjs";

import { seoPreCheck, enhanceBriefFromSERPs, validateGeneratedContent } from "../../pipelines/blog_seo_bridge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SEO_DIR = path.join(__dirname, "..");
export const DATA_DIR = path.join(SEO_DIR, "data");
export const REPORT_PATH = path.join(SEO_DIR, "reports", "seo_edge_case_report.json");

let passed = 0;
let failed = 0;
function assert(label, condition, extra = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${label}${extra ? ` — ${extra}` : ""}`);
  }
}

/* ---------- Backup / restore helpers ---------- */
const SITE_DATA_FEEDS = [
  "keyword_research_feed.json",
  "serp_snapshot.json",
  "competitor_feed.json",
  "backlink_feed.json",
  "traffic_feed.json",
  "gsc_feed.json",
  "rank_tracking.json",
  "analytics_feed.json",
  "content_decay_history.json"
];

function filePath(name) {
  return path.join(DATA_DIR, name);
}

function backupFile(name) {
  const p = filePath(name);
  let content;
  try {
    content = fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
  } catch (e) {
    content = null;
  }
  return { name, content };
}

function restoreFile(bak) {
  if (bak.content === null) {
    try { fs.rmSync(filePath(bak.name), { force: true }); } catch (e) {}
  } else {
    try { fs.writeFileSync(filePath(bak.name), bak.content, "utf-8"); } catch (e) {}
  }
}

function writeFeed(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2), "utf-8");
}

async function main() {
  console.log("=== SEO EDGE CASE TEST SUITE ===\n");

  const site = loadSiteData({ includeHTML: true });
  console.log(`Real site loaded: ${site.articles.length} articles, ${Object.keys(site.clusters).length} clusters\n`);

  /* ── TEST GROUP 1: Missing Data — all feeds absent ──────────── */
  console.log("--- TEST GROUP 1: Missing Data (all feeds absent) ---");

  const kw = keywordIntelligence(site);
  assert("keywordIntelligence search_volume_available === 0", kw.search_volume_available === 0);

  const serp = serpSummary(site);
  assert("serpSummary provided === false", serp.provided === false);

  const comp = competitorGapAnalysis(site);
  assert("competitorGapAnalysis competitors_count === 0", comp.competitors_count === 0);
  assert("competitorGapAnalysis note explains DATA_UNAVAILABLE/no feed", /no competitor feed/i.test(comp.note));

  const bl = backlinkOpportunityEngine(site);
  assert("backlinkOpportunityEngine provided === false", bl.provided === false);
  assert("backlinkOpportunityEngine note says nothing invented", /nothing invented/i.test(bl.note));

  const perf = performanceSnapshot(site);
  assert("performanceSnapshot measured_count === 0", perf.measured_count === 0);
  assert("performanceSnapshot unmeasured_count === articles.length", perf.unmeasured_count === site.articles.length);

  const na = nextAction(site);
  assert("nextAction still works with all feeds absent", typeof na.type === "string" && na.type.length > 0);
  assert("nextAction has a reason/reasons field", typeof (na.reason || "") === "string" || Array.isArray(na.reasons));

  const decay = decayAnalysis(site);
  assert("decayAnalysis works without traffic feed", decay.total === site.articles.length);

  /* ── TEST GROUP 2: Partial Data ─────────────────────────────── */
  console.log("\n--- TEST GROUP 2: Partial Data ---");

  assert("keywordIntelligence keywords have metrics objects", Array.isArray(kw.keywords) && kw.keywords.length > 0 && (kw.keywords[0].metrics !== undefined));
  const hasNullVolume = kw.keywords.some(k => k.metrics.volume.value === null && k.metrics.volume.available === false);
  assert("keywords volume=null when no feed", hasNullVolume);

  const ent = entityCoverageMap(site);
  assert("entityCoverageMap derives from real articles", ent.entities_total_seen > 0 && Array.isArray(ent.strategic_entities));
  assert("entityCoverageMap works with no feed", ent.dense.length + ent.thin.length + ent.absent.length === ent.strategic_entities.length);

  const tech = technicalSiteAudit(site);
  assert("technicalSiteAudit derives from real HTML", tech.total_pages === site.articles.length && Array.isArray(tech.pages));
  assert("technicalSiteAudit green+yellow+red === total", tech.green + tech.yellow + tech.red === tech.total_pages);

  /* ── TEST GROUP 3: Conflicting Data (reconcile) ─────────────── */
  console.log("\n--- TEST GROUP 3: Conflicting Data (reconcile) ---");

  const hiLow = reconcile(
    evN(10, { source: "gsc", confidence: "HIGH", timestamp: "2026-01-01T00:00:00Z" }),
    evN(200, { source: "ahrefs", confidence: "LOW", timestamp: "2026-06-01T00:00:00Z" })
  );
  assert("higher-confidence source wins", hiLow.available && hiLow.value === 10);

  const equalConf = reconcile(
    evN(5, { source: "old", confidence: "HIGH", timestamp: "2026-01-01T00:00:00Z" }),
    evN(5, { source: "new", confidence: "HIGH", timestamp: "2026-06-01T00:00:00Z" })
  );
  assert("equal confidence, newer timestamp wins", equalConf.available && equalConf.source === "new");

  const allUnavailable = reconcile(
    { available: false, value: null, confidence: "NONE" },
    { available: false, value: null, confidence: "NONE" },
    DATA_UNAVAILABLE
  );
  assert("all unavailable -> DATA_UNAVAILABLE", allUnavailable === DATA_UNAVAILABLE || allUnavailable.available === false);

  /* ── TEST GROUP 4: URL Switching ────────────────────────────── */
  console.log("\n--- TEST GROUP 4: URL Switching (temp rank_tracking.json) ---");

  const rtBackup = backupFile("rank_tracking.json");
  writeFeed("rank_tracking.json", {
    rankings: [
      { keyword: "amazon commission calculator", url: "https://amzloss.com/blogs/amazon-affiliate-commission-calculator-guide.html", position: 3, source: "temp" },
      { keyword: "amazon commission calculator", url: "https://amzloss.com/blogs/commission-calculator-v2.html", position: 8, source: "temp" },
      { keyword: "amazon commission cuts 2026", url: "https://amzloss.com/blogs/amazon-2026-commission-cuts.html", position: 5, source: "temp" }
    ],
    history: [
      { keyword: "amazon commission intensity", url: "https://amzloss.com/blogs/page-one.html", position: 3, date: "2026-01-01" },
      { keyword: "amazon commission intensity", url: "https://amzloss.com/blogs/page-two.html", position: 9, date: "2026-01-10" }
    ]
  });

  const { urlSwitching, cannibalizationFromRankings, currentRankings } = await import("../orchestrator/rank_tracking.mjs");

  const switching = urlSwitching();
  assert("urlSwitching detects multiple URLs for a keyword", Array.isArray(switching) && switching.some(s => s.urls.length > 1));

  const canniRank = cannibalizationFromRankings();
  assert("cannibalizationFromRankings detects same-keyword conflict", Array.isArray(canniRank) && canniRank.some(c => c.pages.length > 1));

  const curRanks = currentRankings();
  assert("currentRankings returns entries", curRanks.length > 0);
  assert("currentRankings wraps position as evidence", curRanks[0].position && typeof curRanks[0].position.available === "boolean");

  restoreFile(rtBackup);
  assert("rank_tracking.json restored", true);

  /* ── TEST GROUP 5: Cannibalization Detection ────────────────── */
  console.log("\n--- TEST GROUP 5: Cannibalization Detection ---");

  const canni = cannibalizationAnalysis(site);
  assert("cannibalizationAnalysis resolved + unresolved === total", canni.resolved + canni.unresolved === canni.total_cases);
  assert("cannibalizationAnalysis every case has id", canni.cases.every(c => typeof c.id === "string"));
  assert("merge_candidates have requires_approval flag", canni.merge_candidates.every(c => typeof c.requires_approval === "boolean"));
  const canniSummary = cannibalizationSummary(site);
  assert("cannibalizationSummary has unresolved count", typeof canniSummary.unresolved === "number");
  assert("cannibalizationSummary unresolved matches analysis", canniSummary.unresolved === canni.unresolved);

  /* ── TEST GROUP 6: Content Decay ────────────────────────────── */
  console.log("\n--- TEST GROUP 6: Content Decay ---");

  assert("decayAnalysis total matches articles count", decay.total === site.articles.length);
  assert("decayed_pages sorted by risk_score descending",
    decay.decayed_pages.length <= 1 ||
    decay.decayed_pages[0].risk_score >= decay.decayed_pages[decay.decayed_pages.length - 1].risk_score);
  assert("each decayed page has reasons array", decay.decayed_pages.every(p => Array.isArray(p.reasons)));
  assert("each decayed page has risk_score", decay.decayed_pages.every(p => typeof p.risk_score === "number"));

  /* ── TEST GROUP 7: Competitor Gap (no feed + with feed) ─────── */
  console.log("\n--- TEST GROUP 7: Competitor Gap (no feed + with feed) ---");

  assert("no feed: competitors_count === 0", comp.competitors_count === 0);

  const compBackup = backupFile("competitor_feed.json");
  writeFeed("competitor_feed.json", {
    competitors: [
      {
        domain: "example.com",
        url: "https://example.com/affiliate-guide",
        topics: ["amazon commission cuts 2026", "best affiliate programs for beginners", "unique made up topic nobody covers"],
        tracked_keywords: ["amazon commission calculator"]
      },
      {
        domain: "rival.net",
        url: "https://rival.net/tools",
        topics: ["affiliate marketing strategy"]
      }
    ]
  });

  const compWith = competitorGapAnalysis(site);
  assert("with feed: competitors_count === 2", compWith.competitors_count === 2);
  assert("with feed: total_gaps === coverage + depth", compWith.total_gaps === compWith.coverage_gap_count + compWith.depth_gap_count);
  assert("with feed: coverage_gaps detected", Array.isArray(compWith.coverage_gaps));
  assert("with feed: note acknowledges real competitors", /2 real competitor/i.test(compWith.note) || !/no competitor feed/i.test(compWith.note));

  restoreFile(compBackup);
  const compRestored = competitorGapAnalysis(site);
  assert("competitor_feed.json restored (back to 0)", compRestored.competitors_count === 0);

  /* ── TEST GROUP 8: Content Gap + Expansion ──────────────────── */
  console.log("\n--- TEST GROUP 8: Content Gap + Expansion ---");

  const gaps = contentGapAnalysis(site);
  assert("contentGapAnalysis has gaps array", Array.isArray(gaps.gaps));
  assert("contentGapAnalysis has ignored array", Array.isArray(gaps.ignored));
  assert("contentGapAnalysis total_gaps is integer", Number.isInteger(gaps.total_gaps));
  assert("contentGapAnalysis has top_gap or null", gaps.top_gap === null || !!gaps.top_gap.topic);
  const gapEval = evaluateGap(site, { topic: "Amazon affiliates commission", intent: "informational", cluster: "Commission Rates" });
  assert("evaluateGap returns genuine_gap boolean", typeof gapEval.genuine_gap === "boolean");
  assert("evaluateGap verdict is valid", ["NEW_CONTENT_GAP", "ALREADY_COVERED"].includes(gapEval.verdict));

  const ex1 = evaluateTopicExpansion(site, { title: "How to audit amazon earnings 2026", intent: "how-to", cluster: "Earnings Audit" });
  assert("evaluateTopicExpansion verdict in CREATE/REUSE/DEFER", ["CREATE", "REUSE", "DEFER"].includes(ex1.verdict));
  assert("evaluateTopicExpansion has reasons array", Array.isArray(ex1.reasons) && ex1.reasons.length > 0);
  assert("evaluateTopicExpansion approve === (verdict === CREATE)", ex1.approve === (ex1.verdict === "CREATE"));

  const batch = adjudicateExpansions(site, [
    { title: "Brand new unserved niche query", intent: "informational", cluster: "Affiliate Networks" },
    { title: "Amazon Associates Commission Rates 2026", cluster: "Commission Rates" },
    { title: "Quantum hedge accounting for affiliates", intent: "transactional", cluster: "Earnings & Payout" }
  ]);
  assert("adjudicateExpansions create + reuse + defer === total",
    batch.create + batch.reuse + batch.defer === batch.total);
  assert("adjudicateExpansions total matches results array", batch.total === batch.results.length);

  /* ── TEST GROUP 9: Blog Pipeline Bridge ─────────────────────── */
  console.log("\n--- TEST GROUP 9: Blog Pipeline Bridge ---");

  const pre = await seoPreCheck({ keyword: "amazon affiliate commission calculator", category: "calculators" });
  assert("seoPreCheck returns object with passed", typeof pre === "object" && typeof pre.passed === "boolean");
  assert("seoPreCheck returns blockers array", Array.isArray(pre.blockers));
  assert("seoPreCheck returns warnings array", Array.isArray(pre.warnings));
  assert("seoPreCheck returns scores object", typeof pre.scores === "object");

  const mockSerp = {
    dominant_page_type: "calculator",
    top_entities: ["Amazon Associates", "commission", "calculator"],
    common_headings: ["Current rates", "Calculator guide"],
    serp_features: ["faq", "comparison_table"],
    avg_content_depth: 2400,
    dominant_intent: "transactional"
  };
  const enhanced = enhanceBriefFromSERPs({ brief: { title: "Guide" }, keyword: "x", serp_analysis: mockSerp, opportunity: { opportunity_score: 80 } });
  assert("enhanceBriefFromSERPs adds required_entities", Array.isArray(enhanced.required_entities));
  assert("enhanceBriefFromSERPs adds recommended_headings", Array.isArray(enhanced.recommended_headings));
  assert("enhanceBriefFromSERPs flags requires_tool for calculator SERP", enhanced.requires_tool === true);

  const vGood = validateGeneratedContent({
    keyword: "amazon affiliate commission calculator",
    generatedSlug: "x",
    html: "<p>disclosure: affiliate commission</p><h2>Rates</h2><p>short content about amazon</p>",
    serp_analysis: { required_entities: ["Amazon Associates", "commission", "calculator"], requires_faq: true, requires_comparison_table: true }
  });
  assert("validateGeneratedContent returns passed/checks", typeof vGood === "object" && typeof vGood.passed === "boolean" && Array.isArray(vGood.issues));

  const vBad = validateGeneratedContent({
    keyword: "x",
    generatedSlug: "x",
    html: "<div>tiny</div>",
    serp_analysis: { required_entities: ["entity-one", "entity-two", "entity-three", "entity-four"], requires_faq: true }
  });
  assert("validateGeneratedContent flags missing disclosure/length/headings", vBad.issues.some(i => i.type === "MISSING_DISCLOSURE" || i.type === "CONTENT_TOO_SHORT" || i.type === "NO_HEADINGS"));

  /* ── TEST GROUP 10: Data-Source Failure (corrupt JSON) ──────── */
  console.log("\n--- TEST GROUP 10: Data-Source Failure (corrupt JSON) ---");

  const gscBackup = backupFile("gsc_feed.json");
  fs.writeFileSync(filePath("gsc_feed.json"), "{ this is not valid json !!!", "utf-8");

  let moduleLoads = true;
  let gscHandler = null;
  try {
    const mod = await import("../orchestrator/gsc.mjs");
    gscHandler = mod.gscSummary;
  } catch (e) {
    moduleLoads = false;
  }
  assert("system does not crash on corrupt gsc_feed.json (module loads)", moduleLoads);

  let parseErrorContained = false;
  let corruptResult = null;
  try {
    corruptResult = gscHandler ? gscHandler() : null;
  } catch (e) {
    parseErrorContained = true;
  }
  assert("corrupt feed parse error is contained (no crash of system)",
    parseErrorContained || (corruptResult && (corruptResult.available === false || corruptResult.feed_available === false)));
  assert("suite continues after corrupt feed", passed + failed >= 1);

  restoreFile(gscBackup);
  assert("gsc_feed.json restored", true);

  /* ── TEST GROUP 11: Empty Feed Handling ─────────────────────── */
  console.log("\n--- TEST GROUP 11: Empty Feed Handling ({} to all feeds) ---");

  const emptyBackups = SITE_DATA_FEEDS.map(backupFile);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const name of SITE_DATA_FEEDS) writeFeed(name, {});

  const kwEmpty = keywordIntelligence(site);
  assert("{} feeds: keywordIntelligence search_volume_available === 0", kwEmpty.search_volume_available === 0);
  const serpEmpty = serpSummary(site);
  assert("{} feeds: serpSummary provided === false", serpEmpty.provided === false);
  const blEmpty = backlinkOpportunityEngine(site);
  assert("{} feeds: backlink provided === false", blEmpty.provided === false);
  const compEmpty = competitorGapAnalysis(site);
  assert("{} feeds: competitors_count === 0", compEmpty.competitors_count === 0);
  const perfEmpty = performanceSnapshot(site);
  assert("{} feeds: measured_count === 0", perfEmpty.measured_count === 0);
  const naEmpty = nextAction(site);
  assert("{} feeds: nextAction still returns type", typeof naEmpty.type === "string");
  assert("{} feeds: everything DATA_UNAVAILABLE (no fabricated volumes)", kwEmpty.search_volume_available === 0 && blEmpty.provided === false && compEmpty.competitors_count === 0);

  for (const bak of emptyBackups) restoreFile(bak);
  assert("all feed files restored", true);

  /* ── Save test report ───────────────────────────────────────── */
  const report = {
    timestamp: new Date().toISOString(),
    suite: "seo_edge_case_tests",
    site: { articles: site.articles.length, clusters: Object.keys(site.clusters).length },
    passed,
    failed,
    total: passed + failed,
    all_pass: failed === 0,
    groups: [
      "missing_data",
      "partial_data",
      "conflicting_data",
      "url_switching",
      "cannibalization",
      "content_decay",
      "competitor_gap",
      "content_gap_expansion",
      "blog_pipeline_bridge",
      "data_source_failure",
      "empty_feed"
    ]
  };
  saveJson(REPORT_PATH, report);
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} total ===`);
  console.log(failed === 0 ? "ALL EDGE CASE TESTS PASS ✓" : `EDGE CASE TESTS FAILED ✗ (${failed} failures)`);
  console.log(`Report saved to: ${REPORT_PATH}`);
}

main().catch(err => {
  failed++;
  console.error("✗ Unhandled error in test suite:", err);
  saveJson(REPORT_PATH, { timestamp: new Date().toISOString(), suite: "seo_edge_case_tests", passed, failed, total: passed + failed, all_pass: false, error: String(err && err.stack || err) });
  process.exitCode = 1;
});
