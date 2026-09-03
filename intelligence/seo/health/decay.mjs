/* AmzLoss SEO Intelligence — Content Decay Detection
   Flags pages that have gone stale using REAL on-site signals only:
     - zero inbound internal links (orphaned = unsupported)
     - no visible published/revision date evidence in the HTML
     - thin word count relative to DECAY baseline
   Traffic/impression decay is only reported when a traffic feed is
   provided — never fabricated. */

import { articleBySlug } from "../site_data.mjs";
import { DECAY } from "../config.mjs";
import { recordRecommendation } from "../io.mjs";

export function decaySignals(site, slug) {
  const a = articleBySlug(site, slug);
  if (!a) return { slug, available: false, decayed: false, reasons: [] };

  const reasons = [];
  let decayed = false;
  let risk = 0;

  if ((a.internal_inbound ?? 0) === 0) {
    reasons.push(`orphaned (${a.internal_inbound} inbound internal links)`);
    decayed = true;
    risk += DECAY.ORPHAN_PENALTY;
  } else if ((a.internal_inbound ?? 0) < DECAY.MIN_INBOUND) {
    reasons.push(`underlinked (${a.internal_inbound} inbound link)`);
    risk += 12;
  }

  const hasDateEvidence = !!(a.dates?.modified) || (a.dates?.raw || []).some(d => /20\d\d/.test(d));
  if (!hasDateEvidence) {
    reasons.push("no published/modified date evidence in HTML");
    risk += 10;
  }

  const wc = a.word_count || 0;
  if (wc > 0 && wc < DECAY.MIN_WORDS) {
    reasons.push(`thin content (${wc} words)`);
    decayed = true;
    risk += 15;
  }

  const canni = (a.cannibalization || []).filter(c => c.risk && c.risk !== "RESOLVED");
  if (canni.length) {
    reasons.push(`unresolved cannibalization with ${canni.map(c => c.with).join(", ")}`);
    risk += 8;
  }

  const classification = a.classification?.verdict;
  if (classification === "REWRITE") {
    reasons.push("classification REWRITE (thin template)");
    decayed = true;
    risk += 30;
  }

  return {
    slug,
    available: true,
    word_count: wc,
    inbound: a.internal_inbound ?? 0,
    has_date_evidence: hasDateEvidence,
    decayed: decayed || risk >= 20,
    risk_score: Math.min(100, risk),
    reasons,
    refresh_suggestion: decayed ? "Refresh this page: update data, add revision date, repair inbound links." : null
  };
}

export function decayAnalysis(site) {
  const results = site.articles.map(a => decaySignals(site, a.slug)).filter(r => r.available);
  const decayed = results.filter(r => r.decayed);
  decayed.sort((a, b) => b.risk_score - a.risk_score);
  return {
    total: results.length,
    decayed_count: decayed.length,
    healthy_count: results.length - decayed.length,
    decayed_pages: decayed,
    summary: decayed.length
      ? `${decayed.length} pages show decay signals (orphan/thin/stale). Refresh them before creating any new content.`
      : "No pages currently show decay signals."
  };
}

export function recommendDecayRefresh(site) {
  const analysis = decayAnalysis(site);
  const recs = analysis.decayed_pages.map(p => recordRecommendation({
    type: "REFRESH_CONTENT",
    slug: p.slug,
    action: "Refresh existing page rather than publishing new content",
    reason: p.reasons.join("; "),
    risk_score: p.risk_score,
    approval_required: false,
    priority: Math.min(100, 50 + p.risk_score)
  }));
  return recs;
}