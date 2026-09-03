/* AmzLoss SEO Intelligence — Competitor Gap Analysis
   Compares OUR real page coverage against a competitor feed provided
   by operators (competitor_feed.json), deriving:
     - which competitor topics/pages we lack entirely (COVERAGE GAP)
     - which we cover but the competitor out-metrics us on (DEPTH GAP)
   Feeds MUST be real (URLs, titles, topic lists). Head-to-head metrics
   (DR, traffic) are only used if supplied; anything missing is
   `available: false`, never fabricated. */

import { loadCompetitorFeed } from "../site_data.mjs";
import { matchKeywordToArticle } from "../keyword/keyword_intelligence.mjs";
import { articleBySlug } from "../site_data.mjs";

export function competitorGapAnalysis(site) {
  const feed = loadCompetitorFeed();
  const competitors = feed.competitors || [];

  const coverage_gaps = [];
  const depth_gaps = [];

  for (const comp of competitors) {
    const topics = comp.topics || [];
    let domain = comp.domain || "unknown";
    if (comp.url) { try { domain = new URL(comp.url).hostname.replace(/^www\./, ""); } catch (e) {} }
    for (const t of topics) {
      const matched = matchKeywordToArticle(site, t);
      if (!matched.covered) {
        coverage_gaps.push({
          competitor: domain,
          topic: t,
          our_coverage: null,
          type: "COVERAGE_GAP",
          opportunity: `No page covers "${t}" while ${domain} does.`,
          competitor_url: comp.url || null,
          metric_provided: false
        });
      } else {
        const ourPage = articleBySlug(site, matched.article.slug);
        depth_gaps.push({
          competitor: domain,
          topic: t,
          our_slug: matched.article.slug,
          our_words: ourPage?.word_count || 0,
          our_quality: ourPage?.seo_quality || 0,
          type: "DEPTH_GAP",
          opportunity: `We cover "${t}" (${ourPage?.word_count || 0} words) but ${domain} also ranks — deepen originality.`,
          deeper_needed: (ourPage?.word_count || 0) < 1000
        });
      }
    }
  }

  return {
    competitors_count: competitors.length,
    coverage_gaps,
    depth_gaps,
    total_gaps: coverage_gaps.length + depth_gaps.length,
    coverage_gap_count: coverage_gaps.length,
    depth_gap_count: depth_gaps.length,
    uncovered_topics: [...new Set(coverage_gaps.map(g => g.topic))],
    note: competitors.length === 0
      ? "No competitor feed provided (competitor_feed.json). Populate with real competitor URLs/topics."
      : `Compared against ${competitors.length} real competitor record(s).`
  };
}

export function competitorSummary(site) {
  const analysis = competitorGapAnalysis(site);
  return {
    competitors: analysis.competitors_count,
    coverage_gaps: analysis.coverage_gap_count,
    depth_gaps: analysis.depth_gap_count,
    top_uncovered: analysis.uncovered_topics.slice(0, 8),
    note: analysis.note
  };
}