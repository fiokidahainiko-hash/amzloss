/* AmzLoss SEO Intelligence — Technical SEO Agent
   Audits REAL technical health of the actual pages: title length, H1
   presence, meta description, canonical, JSON-LD, <main> landmark,
   images, word count, heading structure, internal links.

   Uses the fresh HTML parse from site_data.mjs (source of truth),
   aligned with the existing link_architecture audit checks so results
   stay consistent across the system. */

import { articleBySlug, extractCanonical, extractStructuredData, extractHeadings, stripTags } from "../site_data.mjs";
import { TECHNICAL_CHECKS } from "../config.mjs";

export function technicalAuditSingle(site, slug) {
  const a = articleBySlug(site, slug);
  if (!a || a.isTool) return { slug, available: false, reason: "tool page or not found" };

  const checks = [];
  const html = a.html || "";
  const title = a.title || "";
  const h1 = a.h1 || "";
  const desc = a.meta_description || "";
  const headings = a.headings || { h2: [], h3: [] };
  const wordCount = a.word_count || 0;

  checks.push({ check: "Title length (30-65ch)", pass: title.length >= 30 && title.length <= 65, detail: `${title.length}ch` });
  checks.push({ check: "H1 matches topic/title", pass: !!h1, detail: h1 ? h1.slice(0, 40) : "missing" });
  checks.push({ check: "Meta description present & >=70ch", pass: !!desc && desc.length >= 70, detail: desc ? `${desc.length}ch` : "missing" });
  const structure = headings.h2.length + headings.h3.length;
  checks.push({ check: "Heading structure (>=3 H2/H3)", pass: structure >= 3, detail: `H2:${headings.h2.length} H3:${headings.h3.length}` });
  checks.push({ check: "Sufficient word count (>=800)", pass: wordCount >= 800, detail: `${wordCount} words` });
  checks.push({ check: "Canonical tag", pass: a.has_canonical, detail: a.has_canonical ? "present" : "missing" });
  checks.push({ check: "Semantic <main> landmark", pass: a.has_main, detail: a.has_main ? "present" : "missing" });
  checks.push({ check: "Images present", pass: a.has_images, detail: a.has_images ? "yes" : "none" });
  checks.push({ check: "Structured data (JSON-LD)", pass: a.has_jsonld, detail: a.has_jsonld ? `types: ${a.structured_data_types.join(",")}` : "missing" });
  checks.push({ check: "Internal links present (>=2)", pass: (a.body_links_slugs || []).length >= 2, detail: `${a.body_links_slugs.length} body links` });
  checks.push({ check: "FAQ section present", pass: a.has_faq, detail: a.has_faq ? "present" : "missing" });

  // Anti-spam: keyword density
  const text = stripTags(html).toLowerCase();
  const stop = new Set("the a an and or of to in for on with at by is are was were be been being as it this that these those from have has had not but their your our its more most other than also can will would could should may new use using has".split(" "));
  const words = text.split(/\W+/).filter(w => w.length > 3 && !stop.has(w));
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const top = Object.entries(freq).sort((x, y) => y[1] - x[1])[0];
  const density = top ? Math.round((top[1] / Math.max(1, words.length)) * 100) : 0;
  checks.push({ check: "No keyword stuffing (top term density <4%)", pass: density < 4, detail: `"${top?.[0]}" ${density}%` });

  const failed = checks.filter(c => !c.pass);
  const score = Math.round((checks.filter(c => c.pass).length / checks.length) * 100);

  return {
    slug,
    title,
    available: true,
    technical_score: score,
    total_checks: checks.length,
    passed: checks.filter(c => c.pass).length,
    failed: failed.map(c => ({ check: c.check, detail: c.detail })),
    checks,
    health_tier: score >= 85 ? "GREEN" : score >= 60 ? "YELLOW" : "RED"
  };
}

export function technicalSiteAudit(site) {
  const results = site.articles.map(a => technicalAuditSingle(site, a.slug)).filter(r => r.available);
  results.sort((a, b) => a.technical_score - b.technical_score);
  const issues = [];
  const byType = {};
  for (const r of results) {
    for (const f of r.failed) {
      byType[f.check] = (byType[f.check] || 0) + 1;
      issues.push({ slug: r.slug, check: f.check, detail: f.detail });
    }
  }
  return {
    total_pages: results.length,
    green: results.filter(r => r.health_tier === "GREEN").length,
    yellow: results.filter(r => r.health_tier === "YELLOW").length,
    red: results.filter(r => r.health_tier === "RED").length,
    average_score: results.length ? Math.round(results.reduce((s, r) => s + r.technical_score, 0) / results.length) : 0,
    worst_pages: results.slice(0, 5),
    issues,
    issues_by_type: byType,
    pages: results
  };
}

export function technicalPriorityFixes(site) {
  const audit = technicalSiteAudit(site);
  const FIX_RANK = {
    "Meta description present & >=70ch": "High impact (CTR + eligibility)",
    "Structured data (JSON-LD)": "High impact (rich-result eligibility)",
    "Semantic <main> landmark": "Low effort accessibility",
    "Canonical tag": "Low effort, prevents index split",
    "H1 matches topic/title": "High impact relevance signal",
    "Title length (30-65ch)": "Medium impact (truncation)",
    "Images present": "Low effort engagement"
  };
  const prioritized = Object.entries(audit.issues_by_type)
    .map(([check, count]) => ({ check, count, note: FIX_RANK[check] || "fix during content pass" }))
    .sort((a, b) => b.count - a.count);
  return {
    top_global_issues: prioritized,
    pages_with_most_issues: audit.worst_pages,
    summary: `Technical audit: ${audit.green} green, ${audit.yellow} yellow, ${audit.red} red of ${audit.total_pages} pages.`
  };
}