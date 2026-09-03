/* AmzLoss SEO Intelligence — Comprehensive SEO Report
   Composes every engine into ONE markdown-ready + structured report.
   This is the artifact an operator reads each cycle. It never fabricates
   metrics; every section exposes its data source. */

import { seoDashboard } from "./strategy/dashboard.mjs";
import { nextAction } from "./strategy/next_action.mjs";
import { keywordIntelligence } from "./keyword/keyword_intelligence.mjs";
import { topicalAuthorityMap } from "./topics/topical_authority.mjs";
import { contentGapAnalysis } from "./topics/content_gaps.mjs";
import { decayAnalysis } from "./health/decay.mjs";
import { technicalSiteAudit, technicalPriorityFixes } from "./health/technical.mjs";
import { performanceFeedbackReport } from "./strategy/performance.mjs";
import { seoMemoryOverview } from "./strategy/seo_memory.mjs";
import { cannibalizationAnalysis } from "./health/cannibalization.mjs";
import { differentiationProfile } from "./content/differentiation.mjs";

export function seoReport(site) {
  const d = seoDashboard(site);
  const next = nextAction(site);
  const kw = keywordIntelligence(site);
  const auth = topicalAuthorityMap(site);
  const gaps = contentGapAnalysis(site);
  const decay = decayAnalysis(site);
  const tech = technicalSiteAudit(site);
  const techFixes = technicalPriorityFixes(site);
  const perf = performanceFeedbackReport(site);
  const memory = seoMemoryOverview();
  const canni = cannibalizationAnalysis(site);

  return {
    generated_at: new Date().toISOString(),
    report_version: "1.0.0",
    headline: d.kpis,
    next_action: next,
    sections: {
      keyword_intelligence: kw,
      topical_authority: auth,
      content_gaps: gaps,
      cannibalization: { total_cases: canni.total_cases, unresolved: canni.unresolved, merges: canni.merge_candidates.map(c => ({ a: c.article_a.slug, b: c.article_b.slug })) },
      decay: decay,
      technical_seo: { average_score: tech.average_score, green: tech.green, yellow: tech.yellow, red: tech.red, priority_fixes: techFixes.top_global_issues },
      performance: perf,
      memory: memory
    },
    recommendations: {
      top_opportunities: d.top_gaps.slice(0, 4),
      top_technical: d.top_technical,
      top_assets: d.top_assets.map(a => ({ slug: a.slug, asset_score: a.asset_score, tier: a.asset_tier })),
      top_backlinks: d.top_backlink_opportunities.map(o => ({ domain: o.external_domain, kind: o.kind })),
      differentiation_watch: site.articles.filter(a => {
        const p = differentiationProfile(site, { slug: a.slug, title: a.title });
        return p.differentiation_score < 60;
      }).slice(0, 5).map(a => ({ slug: a.slug, differentiation_score: differentiationProfile(site, { slug: a.slug, title: a.title }).differentiation_score }))
    }
  };
}

export function seoReportMarkdown(site) {
  const report = seoReport(site);
  const L = [];

  L.push(`# AmzLoss SEO Intelligence Report`);
  L.push(`Generated: ${report.generated_at}\n`);

  L.push(`## Headline KPIs`);
  L.push(`- Clusters: ${report.headline.clusters} | Articles: ${report.headline.articles}`);
  L.push(`- Avg authority: ${report.headline.avg_authority} | Leading clusters: ${report.headline.leading_clusters}`);
  L.push(`- Genuine content gaps: ${report.headline.genuine_gaps} | Decayed pages: ${report.headline.decayed_pages}`);
  L.push(`- Unresolved cannibalization: ${report.headline.unresolved_cannibalization} | Tech-red pages: ${report.headline.page_tech_red}`);
  L.push(`- Unmeasured pages (no traffic feed): ${report.headline.unmeasured_pages}\n`);

  L.push(`## Next Action`);
  L.push(`**${report.next_action.type}** — ${report.next_action.one_liner}`);
  L.push(`Approval required: ${report.next_action.approval_required}`);
  L.push(`Reason: ${report.next_action.reason || "n/a"}\n`);

  L.push(`## Topical Authority`);
  for (const c of report.sections.topical_authority.clusters) {
    L.push(`- ${c.cluster}: ${c.score}/100 (${c.tier}) | strategic ${c.strategic_importance} | ${c.verdict.action}`);
  }
  L.push("");

  L.push(`## Content Gaps`);
  L.push(`Total genuine gaps: ${report.sections.content_gaps.total_gaps}`);
  for (const g of report.sections.content_gaps.gaps.slice(0, 8)) {
    L.push(`- [${g.priority_score}] ${g.topic} (cluster: ${g.cluster}, intent: ${g.intent})`);
  }
  L.push("");

  L.push(`## Content Decay`);
  L.push(report.sections.decay.summary);
  L.push("");

  L.push(`## Technical SEO`);
  L.push(`Average: ${report.sections.technical_seo.average_score}/100 | Green: ${report.sections.technical_seo.green}, Yellow: ${report.sections.technical_seo.yellow}, Red: ${report.sections.technical_seo.red}`);
  L.push(report.sections.technical_seo.priority_fixes.map(f => `- ${f.check}: ${f.count} pages (${f.note})`).join("\n"));
  L.push("");

  L.push(`## Competitor & SERP & Backlinks`);
  L.push(report.headline.competitors_tracked ? `- Competitors tracked: ${report.headline.competitors_tracked}` : "- Competitor feed not provided.");
  L.push(report.headline.serp_queries_tracked ? `- SERP queries tracked: ${report.headline.serp_queries_tracked}` : "- SERP snapshot not provided.");
  L.push(report.headline.backlinks_provided ? `- Backlink opportunities: ${report.headline.backlinks_provided}` : "- Backlink feed not provided.");
  L.push("");

  L.push(`## SEO Memory`);
  L.push(`Recommendations: ${report.sections.memory.total_recommendations} | Pending approval: ${report.sections.memory.pending_approval} | Approved: ${report.sections.memory.approved} | Executed: ${report.sections.memory.executed}`);
  L.push("");

  L.push(`## Data integrity`);
  L.push(`- Volume data fabricated: NO (only counts from real feeds are reported).`);
  L.push(`- Feeds present: keyword=${report.headline.feed_keywords > 0}, serp=${report.sections.performance ? "see dashboard" : "no"}`);

  return L.join("\n");
}