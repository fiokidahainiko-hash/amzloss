/* AmzLoss SEO Intelligence — "SEO NEXT ACTION" Engine
   The headline strategist answer: ONE highest-value action right now.
   Deterministic decision cascade over the real sub-engine outputs so
   human approval gates can be tripped cleanly.

   Decision order (evidence prioritized):
     1. Decay/refresh (existing pages losing relevance) — most urgent.
     2. Unresolved cannibalization (split ranking signals).
     3. Orphan/underlinked important pages (authority leak).
     4. Highest-value genuine content gap (new intent, publish-ready).
     5. Technical critical fails on important pages.
     6. Backlink/asset push (only with a real feed).
   Never fabricates numbers. */

import { decayAnalysis } from "../health/decay.mjs";
import { cannibalizationAnalysis } from "../health/cannibalization.mjs";
import { contentGapAnalysis } from "../topics/content_gaps.mjs";
import { technicalSiteAudit, technicalPriorityFixes } from "../health/technical.mjs";
import { topicalAuthorityMap } from "../topics/topical_authority.mjs";
import { competitorSummary } from "../competition/competitor_gaps.mjs";
import { backlinkOpportunityEngine } from "../competition/backlinks.mjs";
import { priorityScore } from "../content/prioritization.mjs";

export function nextAction(site) {
  const decay = decayAnalysis(site);
  const canni = cannibalizationAnalysis(site);
  const gaps = contentGapAnalysis(site);
  const technical = technicalSiteAudit(site);
  const authority = topicalAuthorityMap(site);
  const competitors = competitorSummary(site);
  const backlinks = backlinkOpportunityEngine(site);

  // --- Cascade ---
  if (decay.decayed_pages.length > 0) {
    const top = decay.decayed_pages[0];
    return {
      rank: 1,
      type: "REFRESH_EXISTING_CONTENT",
      one_liner: `Refresh "${top.slug}" (${decay.decayed_pages.length} pages decayed) before creating new pages.`,
      page: top.slug,
      action_definition: "Update content, fix inbound links, add revision date.",
      effort: "MEDIUM", impact: "HIGH",
      approval_required: false,
      reason: top.reasons.join("; "),
      priority: priorityScore(site, { slug: top.slug }).score,
      data_confidence: "HIGH (on-page signals)"
    };
  }

  const unresolvedCanni = canni.cases.filter(c => c.decision !== "RESOLVED_KEEP");
  if (unresolvedCanni.length > 0) {
    const c = unresolvedCanni.sort((a, b) => b.overlap_pct - a.overlap_pct)[0];
    const needsApproval = c.requires_approval;
    return {
      rank: 2,
      type: c.decision === "MERGE" ? "MERGE_CANNIBALIZED" : "DIFFERENTIATE_CANNIBALIZED",
      one_liner: `${c.decision === "MERGE" ? "Merge" : "Differentiate"} "${c.article_a.slug}" ↔ "${c.article_b.slug}" (${c.overlap_pct}% overlap).`,
      pages: [c.article_a.slug, c.article_b.slug],
      decision: c.decision,
      approval_required: needsApproval,
      approval_gate: c.approval_gate,
      reason: c.reason,
      priority: 100 - Math.min(100, c.overlap_pct),
      data_confidence: "HIGH (audit case)"
    };
  }

  // Orphan / underlinked important pages
  const orphaned = site.articles.filter(a => (a.orphan || a.internal_inbound < 2) && a.importance === "HIGH");
  if (orphaned.length > 0) {
    const top = orphaned[0];
    return {
      rank: 3,
      type: "INBOUND_LINK_SUPPORT",
      one_liner: `Add inbound internal links to important page "${top.slug}" (${top.internal_inbound} inbound).`,
      page: top.slug,
      approval_required: false,
      reason: `Important page with ${top.internal_inbound} internal inbound; fragile authority.`,
      priority: priorityScore(site, { slug: top.slug }).score,
      data_confidence: "HIGH (network signals)"
    };
  }

  const bestGap = gaps.top_gap;
  if (bestGap) {
    const bpPriority = priorityScore(site, { slug: bestGap.proposed_slug, title: bestGap.topic, cluster: bestGap.cluster, patch: { gap_intent_coverage: bestGap.priority_score } }).score;
    return {
      rank: 4,
      type: "CREATE_GENUINE_GAP_CONTENT",
      one_liner: `Create "${bestGap.topic}" in cluster "${bestGap.cluster}" — an unserved intent.`,
      proposed_slug: bestGap.proposed_slug,
      cluster: bestGap.cluster,
      intent: bestGap.intent,
      approval_required: true,
      approval_gate: { gate_type: "NEW_URL", note: "New URL requires human approval." },
      reason: bestGap.descriptor,
      priority: bpPriority,
      data_confidence: "HIGH (gap signal)"
    };
  }

  const techCritical = technical.pages.filter(p => p.health_tier === "RED");
  if (techCritical.length > 0) {
    const top = techCritical[0];
    return {
      rank: 5,
      type: "TECHNICAL_FIX",
      one_liner: `Fix critical technical issues on "${top.slug}" (${top.failed.length} fails).`,
      page: top.slug,
      failed: top.failed.map(f => f.check),
      approval_required: false,
      reason: `${top.failed.map(f => `${f.check}: ${f.detail}`).join("; ")}`,
      priority: priorityScore(site, { slug: top.slug, technical_issues: top.failed.length }).score,
      data_confidence: "HIGH (on-page checks)"
    };
  }

  if (backlinks.provided && backlinks.top_opportunities.length > 0) {
    const top = backlinks.top_opportunities[0];
    return {
      rank: 6,
      type: "BACKLINK_OUTREACH",
      one_liner: `Reach out for link on "${top.external_domain}" (${top.kind}).`,
      external_url: top.external_url,
      approval_required: true,
      approval_gate: { gate_type: "OUTREACH", note: "External outreach requires sign-off." },
      reason: top.relevance.reason,
      priority: top.relevance.score + top.feasibility.score,
      data_confidence: "MEDIUM (feed evidence)"
    };
  }

  const grow = authority.clusters.find(c => c.verdict?.action === "GROW");
  if (grow) {
    return {
      rank: 7,
      type: "GROW_CLUSTER",
      one_liner: `Grow cluster "${grow.cluster}" (authority ${grow.score}). Strategy: ${grow.verdict.reason}`,
      cluster: grow.cluster,
      approval_required: false,
      priority: grow.strategic_importance
    };
  }

  return {
    rank: 8,
    type: "MAINTAIN",
    one_liner: "No urgent action. Run the full audit + maintain decaying pages, monitor competitor feed.",
    approval_required: false
  };
}

/* same export name as used by dashboard single-decision */
export function activeGapsForCluster(site, cluster) {
  return contentGapAnalysis(site).gaps.filter(g => g.cluster === cluster);
}