/* AmzLoss SEO Intelligence — Topic Expansion Discipline
   The anti-bloat gate (spec): never create a new page when an existing
   page already satisfies the same primary intent for the same cluster.
   Every proposed new topic is adjudicated: CREATE vs DEFER vs REUSE.

   Expansions are only approved when:
     - the primary query is NOT already the primary query of another page;
     - the intent is genuinely distinct AND not already satisfied in-cluster;
     - the cluster itself has authority to support one more member
       (expanding into a dormant cluster with no pillar is blocked). */

import { matchKeywordToArticle } from "../keyword/keyword_intelligence.mjs";
import { clusterIntentCoverage, classifyIntent } from "../keyword/search_intent.mjs";
import { clusterAuthorityScore } from "./topical_authority.mjs";

export function evaluateTopicExpansion(site, { title = "", slug = "", intent = null, cluster = null } = {}) {
  const topic = title || slug.replace(/-/g, " ");
  const primaryQuery = title ? title.split(/[|–-]/)[0].trim().toLowerCase() : slug.replace(/-/g, " ");
  const targetCluster = cluster || guessCluster(site, topic);
  const targetIntent = intent || classifyIntent(topic).intent;

  // 1. Duplicate primary query?
  const dup = site.articles.find(a =>
    (a.primary_query && a.primary_query.toLowerCase() === primaryQuery) ||
    (a.title && a.title.split(/[|–-]/)[0].trim().toLowerCase() === primaryQuery)
  );

  // 2. Same intent already satisfied in cluster?
  const clusterCoverage = targetCluster ? clusterIntentCoverage(site, targetCluster) : null;
  const intentCovered = clusterCoverage?.covered_intents.some(c => c.intent === targetIntent) && slotTaken(targetCluster, targetIntent);

  // 3. Cluster authority to support expansion
  const authority = targetCluster ? clusterAuthorityScore(site, targetCluster) : null;
  const dormant = authority && authority.tier === "DORMANT";
  const noPillarInCluster = targetCluster && (!site.clusters[targetCluster]?.pillar);

  const match = matchKeywordToArticle(site, topic);

  let verdict = "CREATE";
  const reasons = [];

  if (dup) { verdict = "REUSE"; reasons.push(`Primary query "${primaryQuery}" already targeted by "${dup.title}". Update that page instead.`); }
  else if (match.covered && intentCovered) { verdict = "REUSE"; reasons.push(`"${topic}" already well-matched by "${match.article.title}" with same intent in ${targetCluster}. Expanding would create a near-duplicate.`); }
  else if (dormant || noPillarInCluster) { verdict = "DEFER"; reasons.push(`Cluster "${targetCluster}" has no authority base (${authority?.tier || "no pillar"}). Create pillar/lead content first.`); }
  else if (intentCovered) { verdict = "DEFER"; reasons.push(`Cluster "${targetCluster}" already satisfies "${targetIntent}" intent. Reuse the existing member; only expand with a materially different query.`); }
  else {
    reasons.push(`New query "${primaryQuery}" not served; intent "${targetIntent}" is genuinely distinct in cluster "${targetCluster}".`);
  }

  const review = { title, slug: slug || slugify(topic), primary_query: primaryQuery, intent: targetIntent, cluster: targetCluster };
  review.recommended_focus = verdict === "CREATE" ? gapFocusForIntent(targetIntent) : null;

  return {
    topic,
    proposed: review,
    verdict,
    reasons,
    duplicate_of: dup ? dup.slug : null,
    matched_article: match.article,
    cluster_authority: authority ? authority.score : null,
    approve: verdict === "CREATE",
    comment: reasons.join(" ")
  };
}

function slotTaken(cluster, intent) {
  // sincere default: cluster pages that already have this intent
  return true; // evaluated via clusterIntentCoverage caller behavior
}

function guessCluster(site, topic) {
  const t = topic.toLowerCase();
  const candidates = Object.keys(site.clusters).filter(c => t.includes(c.toLowerCase().replace(/[^a-z ]/g, "").substring(0, 8)));
  if (candidates.length) return candidates[0];
  return null;
}

function slugify(t) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function gapFocusForIntent(intent) {
  const map = {
    informational: "Comprehensive explainer covering the full entity map.",
    commercial: "Comparison table + rate benchmarks + decision framework.",
    transactional: "Immediate utility: calculator / audit / submit workflow.",
    "how-to": "Step-by-step guided walkthrough with concrete outputs.",
    problem: "Diagnostic cause-and-effect with actionable fixes."
  };
  return map[intent] || map.informational;
}

/* Batch-adjudicate a list of expansion proposals. */
export function adjudicateExpansions(site, proposals) {
  const results = proposals.map(p => evaluateTopicExpansion(site, p));
  return {
    total: results.length,
    create: results.filter(r => r.verdict === "CREATE").length,
    reuse: results.filter(r => r.verdict === "REUSE").length,
    defer: results.filter(r => r.verdict === "DEFER").length,
    results
  };
}