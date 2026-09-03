/* AmzLoss SEO Intelligence — Competitor Keyword Gap Engine
   Compares AMZLOSS against multiple competitors using real feed data.
   Each competitor provides: domain, tracked_keywords[], positions[].
   Gaps classified as: CREATE, OPTIMIZE, EXPAND, MERGE, IGNORE, MONITOR.
   Requires actual competitor data feeds — never fabricated. */

import { ev, DATA_UNAVAILABLE, position } from "../orchestrator/seo_evidence.mjs";

export function competitorKeywordGap({
  amzlossKeywords = [],
  competitors = [],
  amzlossPages = [],
  minGapSize = 1
} = {}) {
  const allCompetitorKeywords = new Map();
  for (const comp of competitors) {
    for (const kw of comp.tracked_keywords || []) {
      if (!allCompetitorKeywords.has(kw.keyword)) allCompetitorKeywords.set(kw.keyword, []);
      allCompetitorKeywords.get(kw.keyword).push({ domain: comp.domain, ...kw });
    }
  }

  const amzlossSet = new Set(amzlossKeywords.map(k => k.keyword.toLowerCase()));
  const gaps = [];

  for (const [keyword, entries] of allCompetitorKeywords) {
    const kwLower = keyword.toLowerCase();
    const amzlossHas = amzlossSet.has(kwLower);
    const amzlossEntry = amzlossKeywords.find(k => k.keyword.toLowerCase() === kwLower);
    const amzlossPos = amzlossEntry?.position ? position(amzlossEntry.position) : DATA_UNAVAILABLE;

    const bestCompetitor = entries.sort((a, b) => (a.position || 999) - (b.position || 999))[0];
    const competitorPos = bestCompetitor?.position ? position(bestCompetitor.position) : DATA_UNAVAILABLE;

    let classification = "CREATE";
    let reason = "";

    if (!amzlossHas) {
      classification = "CREATE";
      reason = `AMZLOSS has no content for "${keyword}" while ${bestCompetitor?.domain} ranks ${bestCompetitor?.position || "??"}`;
    } else if (amzlossPos.available && competitorPos.available && amzlossPos.value > competitorPos.value) {
      classification = "OPTIMIZE";
      reason = `AMZLOSS ranks ${amzlossPos.value} vs ${bestCompetitor.domain} at ${competitorPos.value}`;
    } else if (amzlossPos.available && amzlossPos.value <= 20 && amzlossPos.value > 10) {
      classification = "EXPAND";
      reason = `AMZLOSS ranks ${amzlossPos.value} (striking distance)`;
    } else if (amzlossHas && entries.length >= 3) {
      classification = "MONITOR";
      reason = `Multiple competitors rank for "${keyword}"`;
    } else {
      classification = "IGNORE";
      reason = "Already well-covered or no clear opportunity";
    }

    if (classification !== "IGNORE") {
      gaps.push({
        keyword,
        classification,
        reason,
        amzloss_position: amzlossPos?.available ? amzlossPos.value : null,
        best_competitor: bestCompetitor?.domain,
        best_competitor_position: competitorPos?.available ? competitorPos.value : null,
        all_competitors: entries.map(e => ({ domain: e.domain, position: e.position })),
        intent: amzlossEntry?.intent || bestCompetitor?.intent,
        evidence_available: amzlossPos.available && competitorPos.available
      });
    }
  }

  return gaps.sort((a, b) => {
    const order = { "CREATE": 0, "OPTIMIZE": 1, "EXPAND": 2, "MONITOR": 3 };
    return (order[a.classification] || 9) - (order[b.classification] || 9);
  });
}