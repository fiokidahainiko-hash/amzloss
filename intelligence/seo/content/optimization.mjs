/* AmzLoss SEO Intelligence — Existing Content Optimization Agent
   For every existing article, produce an actionable optimization plan
   from REAL signal: failed technical/SEO checks, classification verdict,
   internal-link gaps (orphan/underlinked), cannibalization flags, entity
   thinness, and decay risk.

   Distinguishes "improve existing page" vs "create new page", so the
   engine never recommends publishing when editing suffices. */

import { priorityScore } from "./prioritization.mjs";
import { verdictForScore } from "../config.mjs";
import { entityCoverageMap } from "../topics/entity_coverage.mjs";
import { canniSubjects } from "../health/cannibalization.mjs";
import { decaySignals } from "../health/decay.mjs";
import { articleBySlug } from "../site_data.mjs";

const FIX_MAP = {
  "Title length (30-65ch)": { action: "REWRITE_TITLE", fix: "Shorten/lengthen the <title> to 30–65 characters, keeping the primary keyword within the first 60 chars." },
  "H1 matches topic/title": { action: "FIX_H1", fix: "Make the H1 echo the primary keyword and the page's actual promise." },
  "Meta description present & >=70ch": { action: "ADD_META_DESCRIPTION", fix: "Write a 70–160 char meta description with the primary keyword + tangible benefit." },
  "Heading structure (>=3 H2/H3)": { action: "ADD_HEADINGS", fix: "Add at least 3 H2/H3 headings that reflect question phrasing users search." },
  "Sufficient word count (>=800)": { action: "EXPAND_CONTENT", fix: "Deepen the page to ≥800 words with real depth (not filler)." },
  "Useful introduction": { action: "FIX_INTRO", fix: "Open with the reader's problem + exact promise, not a generic greeting." },
  "Internal links present (>=2)": { action: "ADD_INTERNAL_LINKS", fix: "Add ≥2 contextual internal links to related articles/tools." },
  "Semantic/entity coverage (>=4 entities)": { action: "ADD_ENTITIES", fix: "Introduce the missing semantic entities naturally into headings/body." },
  "Images present": { action: "ADD_IMAGES", fix: "Add at least one relevant, original image (screenshot/diagram), with alt text." },
  "Canonical tag": { action: "ADD_CANONICAL", fix: "Add a self-referencing rel=canonical URL for this page." },
  "Semantic <main> landmark": { action: "ADD_MAIN", fix: "Wrap primary content in <main> for clean accessibility/crawl structure." },
  "Links to core tools": { action: "ADD_TOOL_LINK", fix: "Link to the relevant AmzLoss calculator/audit tool from body context." },
  "FAQ section present": { action: "ADD_FAQ", fix: "Add an FAQ block (eligible for People Also Ask rich results)." },
  "Structured data (JSON-LD)": { action: "ADD_JSONLD", fix: "Add Article/FAQPage JSON-LD schema." },
  "No manipulative anchor/link phrasing": { action: "CLEAN_ANCHORS", fix: "Replace manipulative anchor phrasing ('click here') with natural anchors." }
};

export function optimizeArticle(site, slug) {
  const a = articleBySlug(site, slug);
  if (!a || a.isTool) return { slug, available: false, reason: "not an article or not found" };

  const failedChecks = ((a.seo_checks || [])).filter(c => c && (c.issue || !c.pass)).map(c => c.check || (typeof c === "string" ? c : c.issue));
  const issues = [];

  for (const checkName of failedChecks) {
    const fix = FIX_MAP[checkName];
    if (fix) issues.push({ check: checkName, ...fix });
  }

  // Inbound support
  if (a.internal_inbound === 0) issues.push({ check: "orpan", action: "GET_INBOUND_LINKS", fix: "Ask a supporting article/pillar to link here (orphan)." });
  else if (a.internal_inbound === 1) issues.push({ check: "underlinked", action: "ADD_INBOUND_LINK", fix: "Add one more inbound link from a related article." });

  // Cannibalization exposure
  const canni = canniSubjects(site, slug);
  if (canni.length) issues.push({ check: "cannibalization", action: "RESOLVE_INTENT", fix: `Differentiate from ${canni.map(c => c.with).join(", ")} (overlap ${canni[0].overlap}%).` });

  // Entity thinness
  const entities = entityCoverageMap(site);
  const thin = entities.thin.map(e => e.entity);
  const articleEntities = a.entities || [];
  const missingStrategic = thin.filter(e => !articleEntities.includes(e));
  if (missingStrategic.length) issues.push({ check: "thin_entity_coverage", action: "ADD_STRATEGIC_ENTITIES", fix: `Cover strategic entities: ${missingStrategic.join(", ")}.` });

  // Decay
  const decay = decaySignals(site, slug);
  if (decay.decayed) issues.push({ check: "content_decay", action: "REFRESH_CONTENT", fix: `Refresh: ${decay.reasons.join("; ")}.` });

  const technicalIssues = issues.length;
  const priority = priorityScore(site, { slug, cluster: a.topic_cluster, seo_quality: a.seo_quality, importance: a.importance, inbound: a.internal_inbound, technical_issues: technicalIssues });

  return {
    slug,
    title: a.title,
    available: true,
    cluster: a.topic_cluster,
    classification: a.classification?.verdict,
    seo_quality: a.seo_quality,
    priority: priority.score,
    priority_verdict: priority.verdict,
    priority_breakdown: priority.breakdown,
    recommends_new_page: false,
    issues,
    recommended_actions: issues.map(i => i.action),
    summary: `Optimize "${a.title}": ${issues.length} actionable issues (tech=${failedChecks.length}, links, cannibalization, entities, decay).`,
    approval_notes: "All fixes are on-page or link-placement only — no URL/merge/redirect needed.",
    is_publish_ready_after_fix: priority.score >= 90
  };
}

export function optimizeArticleBatch(site) {
  const results = site.articles.map(a => optimizeArticle(site, a.slug)).filter(r => r.available);
  results.sort((a, b) => a.seo_quality - b.seo_quality || b.priority - a.priority);
  return {
    total: results.length,
    needs_attention: results.filter(r => r.issues.length > 0).length,
    healthy: results.filter(r => r.issues.length === 0).length,
    pages: results,
    top_picks: results.slice(0, 5)
  };
}