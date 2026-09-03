/* AmzLoss SEO Intelligence — Cannibalization Engine
   Extends the existing link_architecture cannibalization report (the
   source of truth from the site audit) with an actionable resolution
   layer: for every unresolved case it proposes a REUSE / MERGE /
   DIFFERENTIATE decision and flags the approval gate when a merge or
   redirect is required.

   IMPORTANT: does not re-run the detection. It consumes the site
   audit's phase7_cannibalization (already executed against real HTML). */

import { articleBySlug } from "../site_data.mjs";
import { APPROVAL_GATED_ACTIONS } from "../config.mjs";

export function canniSubjects(site, slug) {
  const cases = (site.cannibalization_cases || []).filter(c =>
    (c.article_a === slug || c.article_b === slug) && c.risk !== "RESOLVED");
  return cases.map(c => ({
    with: (c.article_a === slug) ? c.article_b : c.article_a,
    overlap: parseInt(String(c.overlap).replace("%", ""), 10) || 0,
    risk: c.risk,
    recommendation: c.recommendation
  }));
}

export function cannibalizationCaseResolution(site, c) {
  const a = articleBySlug(site, c.article_a);
  const b = articleBySlug(site, c.article_b);
  const risk = c.risk;
  const overlap = parseInt(String(c.overlap).replace("%", ""), 10) || 0;

  let decision = "DIFFERENTIATE";
  let requires_approval = false;
  let approval_gate = null;
  let reason = "";

  if (risk === "RESOLVED") {
    decision = "RESOLVED_KEEP";
    reason = "Editorial network already differentiates via bidirectional links and distinct intents.";
  } else if (overlap >= 80) {
    // High overlap: strong merge candidate, but only if intents match
    const sameIntent = (a?.search_intent || c.search_intent) === (b?.search_intent || c.search_intent);
    if (sameIntent || (!a && !b)) {
      decision = "MERGE";
      requires_approval = true;
      approval_gate = { gate_type: "MERGE", pages: [c.article_a, c.article_b], note: "High overlap + same intent. Merge into one URL with 301 redirects." };
      reason = `Overlap ${overlap}% and matching intent — merging reduces split signals.`;
    } else {
      decision = "DIFFERENTIATE_INTENT";
      reason = `High overlap but different search intent — keep both, sharpen each one's heading/title promise.`;
    }
  } else {
    decision = "DIFFERENTIATE";
    reason = `Overlap ${overlap}% within tolerable range; sharpen H1/title wording and add explicit bidirectional links.`;
  }

  return {
    id: c.id,
    article_a: { slug: c.article_a, title: a?.title || null },
    article_b: { slug: c.article_b, title: b?.title || null },
    overlap_pct: overlap,
    risk,
    search_intent: c.search_intent,
    primary_query: c.primary_query,
    decision,
    reason,
    requires_approval,
    approval_gate
  };
}

export function cannibalizationAnalysis(site) {
  const cases = (site.cannibalization_cases || []).map(c => cannibalizationCaseResolution(site, c));
  const unresolved = cases.filter(c => c.decision !== "RESOLVED_KEEP");
  return {
    total_cases: cases.length,
    resolved: cases.filter(c => c.decision === "RESOLVED_KEEP").length,
    unresolved: unresolved.length,
    merge_candidates: unresolved.filter(c => c.decision === "MERGE"),
    differentiate_candidates: unresolved.filter(c => c.decision !== "MERGE"),
    cases,
    note: "Detection came from the existing link_architecture audit (real HTML). This layer only adds resolution decisions."
  };
}

export function cannibalizationSummary(site) {
  const analysis = cannibalizationAnalysis(site);
  return {
    total_cases: analysis.total_cases,
    unresolved: analysis.unresolved,
    merges_flagged: analysis.merge_candidates.length,
    notes: analysis.merge_candidates.map(c => `${c.article_a.slug} + ${c.article_b.slug} → ${c.decision}`)
  };
}