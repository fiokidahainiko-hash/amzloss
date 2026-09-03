/* AmzLoss SEO Intelligence — Blog Pipeline Bridge
   Connects the SEO engine to the blog pipeline at strategic points:
   1. Pre-check: validate keyword opportunity before pipeline runs
   2. Brief enhancement: inject SERP intent, entities, headings into brief
   3. Post-generation: validate generated keyword alignment
   4. Cannibalization gate: prevent conflicting articles */

import { SEOCommandCenter } from "../seo/orchestrator/seo_command_center.mjs";
import { analyzeSerpIntent, shouldCreateContent } from "../seo/orchestrator/serp_intent.mjs";
import { keywordOpportunityScore } from "../seo/orchestrator/keyword_scoring.mjs";
import { competitorKeywordGap } from "../seo/competition/keyword_gap.mjs";
import { loadSiteData } from "../seo/site_data.mjs";

const cc = new SEOCommandCenter();

export async function seoPreCheck({ keyword, category }) {
  const checks = {
    keyword,
    passed: true,
    blockers: [],
    warnings: [],
    scores: {},
    serp_analysis: null,
    opportunity_score: null
  };

  const research = await cc.execute({ command: "research", args: { keyword } }) || {};
  checks.serp_analysis = research.serp_analysis;
  checks.opportunity_score = research.opportunity;

  if (research.error) {
    checks.warnings.push(`SEO research partial failure: ${research.error}`);
  }

  if (research.opportunity) {
    checks.scores.opportunity = research.opportunity.opportunity_score;
    if (research.opportunity.opportunity_score < 25) {
      checks.warnings.push(`Low opportunity score (${research.opportunity.opportunity_score}/100) — consider a different keyword`);
    }
  }

  if (research.serp_analysis) {
    const shouldCreate = shouldCreateContent(research.serp_analysis, "informational");
    if (!shouldCreate.create) {
      checks.blockers.push(`Intent mismatch: SERP expects ${research.serp_analysis.dominant_intent} but pipeline generates informational`);
    }
    if (research.serp_analysis.has_paa && !research.serp_analysis.has_featured_snippet) {
      checks.warnings.push("SERP has People Also Ask — FAQ sections recommended");
    }
    if (research.serp_analysis.has_video) {
      checks.warnings.push("Video results dominate SERP — consider adding video embed");
    }
    if (research.serp_analysis.commercial_signal_strength > 0.5) {
      checks.warnings.push("High commercial signal — ensure affiliate disclosure is prominent");
    }
  }

  checks.passed = checks.blockers.length === 0;
  return checks;
}

export function enhanceBriefFromSERPs({ brief, keyword, serp_analysis, opportunity }) {
  const enhanced = { ...brief };

  if (serp_analysis) {
    if (serp_analysis.dominant_page_type === "tool" || serp_analysis.dominant_page_type === "calculator") {
      enhanced.requires_tool = true;
      enhanced.note = "SERP dominated by tools/calculators — content should be interactive";
    }

    if (serp_analysis.top_entities?.length) {
      enhanced.required_entities = serp_analysis.top_entities.slice(0, 8);
    }

    if (serp_analysis.common_headings?.length) {
      enhanced.recommended_headings = serp_analysis.common_headings.slice(0, 5);
    }

    if (serp_analysis.serp_features?.includes("faq")) {
      enhanced.requires_faq = true;
    }

    if (serp_analysis.serp_features?.includes("comparison_table")) {
      enhanced.requires_comparison_table = true;
    }

    if (serp_analysis.avg_content_depth > 2000) {
      enhanced.min_word_count = Math.round(serp_analysis.avg_content_depth * 0.85);
    }

    enhanced.intent_match = serp_analysis.dominant_intent;
    enhanced.serp_features = serp_analysis.serp_features;
  }

  if (opportunity) {
    enhanced.seo_quality_target = Math.max(70, opportunity.opportunity_score);
    enhanced.competitor_weakness = opportunity.components?.find(c => c.name === "competitor_weakness")?.score;
  }

  return enhanced;
}

export function validateGeneratedContent({ keyword, generatedSlug, html, serp_analysis }) {
  const issues = [];
  const checks = { passed: true, issues };

  if (!html || html.length < 300) {
    issues.push({ type: "CONTENT_TOO_SHORT", severity: "HIGH", message: "Generated content is too short" });
  }

  if (serp_analysis?.required_entities?.length) {
    const missing = serp_analysis.required_entities.filter(e => !html.toLowerCase().includes(e.toLowerCase()));
    if (missing.length > 3) {
      issues.push({ type: "MISSING_ENTITIES", severity: "MEDIUM", message: `Missing ${missing.length} key entities: ${missing.slice(0, 3).join(", ")}` });
    }
  }

  if (serp_analysis?.requires_faq && !html.toLowerCase().includes("faq")) {
    issues.push({ type: "MISSING_FAQ", severity: "MEDIUM", message: "SERP expects FAQ section" });
  }

  const hasDisclosure = html.toLowerCase().includes("affiliate") || html.toLowerCase().includes("commission") || html.toLowerCase().includes("disclosure");
  if (!hasDisclosure) {
    issues.push({ type: "MISSING_DISCLOSURE", severity: "HIGH", message: "No affiliate disclosure found — Amazon compliance requirement" });
  }

  const hasH2 = html.includes("<h2") || html.includes("<h3");
  if (!hasH2) {
    issues.push({ type: "NO_HEADINGS", severity: "MEDIUM", message: "No subheadings found — poor structure" });
  }

  checks.passed = !issues.some(i => i.severity === "HIGH");
  return checks;
}

export function blogPipelineSEOAdvice({ keyword, checks }) {
  const advice = [];

  if (checks?.serp_analysis?.has_paa && !checks.serp_analysis.has_featured_snippet) {
    advice.push({ action: "ADD_FAQ", reason: "People Also Ask present but no featured snippet — target FAQ schema" });
  }

  if (checks?.serp_analysis?.has_video) {
    advice.push({ action: "EMBED_VIDEO", reason: "Video results prominent — add YouTube embed" });
  }

  if (checks?.serp_analysis?.avg_content_depth > 2000) {
    advice.push({ action: "INCREASE_DEPTH", reason: `SERP avg depth: ${checks.serp_analysis.avg_content_depth} words — match or exceed` });
  }

  if (checks?.opportunity_score?.opportunity_score >= 60) {
    advice.push({ action: "TARGET_RANKING", reason: `High opportunity (${checks.opportunity_score.opportunity_score}/100) — prioritize this keyword` });
  }

  const site = loadSiteData();
  const cannibalization = (site.cannibalization_cases || []).filter(c => {
    const overlap = new Set([c.article_a?.toLowerCase(), c.article_b?.toLowerCase()].filter(Boolean));
    return overlap.has(keyword.toLowerCase()) || overlap.has(generatedSlug?.toLowerCase());
  });

  if (cannibalization.length > 0) {
    advice.push({ action: "RESOLVE_CANNIBALIZATION", reason: `Keyword overlaps with ${cannibalization.length} existing article(s)` });
  }

  return advice;
}

/* SEO ON-PAGE ENFORCEMENT SYSTEM */

export function seoPublishingGate({ article, keyword, brief, research, cluster, linking }) {
  const results = { passed: true, reasons: [], scores: {} };
  const { title, meta_description, content_html, slug } = article;
  
  const lowerTitle = (title || "").toLowerCase();
  const lowerMeta = (meta_description || "").toLowerCase();
  const lowerSlug = (slug || "").toLowerCase();
  const lowerKeyword = (keyword || "").toLowerCase();

  // 1. Target Keyword Requirements
  if (!lowerTitle.includes(lowerKeyword)) results.reasons.push(`Keyword "${keyword}" missing from title`);
  if (!lowerMeta.includes(lowerKeyword)) results.reasons.push(`Keyword "${keyword}" missing from meta description`);
  
  // Simple slug check: keyword words in slug
  const kWords = lowerKeyword.split(/\s+/);
  if (kWords.filter(w => lowerSlug.includes(w)).length < kWords.length * 0.5) {
    results.reasons.push(`Keyword "${keyword}" not sufficiently present in URL slug`);
  }

  // H1
  const h1Match = (content_html || "").match(/<h1[^>]*>(.*?)<\/h1>/i);
  const h1Content = h1Match ? h1Match[1].toLowerCase() : "";
  if (!h1Content.includes(lowerKeyword)) results.reasons.push(`Keyword "${keyword}" missing from H1`);

  // First 100 words
  const textOnly = (content_html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const first100Words = textOnly.split(" ").slice(0, 100).join(" ").toLowerCase();
  if (!first100Words.includes(lowerKeyword)) results.reasons.push(`Keyword "${keyword}" missing from first 100 words`);

  // 2. Title Tag Rules
  const titleLen = (title || "").length;
  if (titleLen < 40 || titleLen > 70) results.reasons.push(`Title length ${titleLen} outside range (40-70)`);
  if (!lowerKeyword.split(" ")[0] || !lowerTitle.includes(lowerKeyword.split(" ")[0])) {
    results.reasons.push("Primary keyword should be near the beginning of the title");
  }

  // 6. Meta Description Rules
  const metaLen = (meta_description || "").length;
  if (metaLen < 120 || metaLen > 160) results.reasons.push(`Meta description length ${metaLen} outside range (120-160)`);

  // Publishing Gate items
  const intent = brief?.intent_match || research?.search_intent;
  if (!intent) results.reasons.push("Search intent unclear");

  if (!linking?.recommended_links?.length) results.reasons.push("No internal links recommended");
  if (!cluster?.primary_cluster && !brief?.cluster) results.reasons.push("No topic cluster assigned");
  if (!brief) results.reasons.push("Missing SEO intelligence brief");

  results.passed = results.reasons.length === 0;
  return results;
}

export function validateGSCOptimization(page, keyword, position) {
  if (!page || position === undefined) return null;
  
  // Rule: If a page ranks between positions 5 and 20, Priority = OPTIMIZE
  if (position >= 5 && position <= 20) {
    return {
      page: page.slug,
      keyword,
      position,
      priority: "OPTIMIZE",
      reason: `Striking distance: Ranking #${position} for "${keyword}". Optimize content and CTR before creating new pages.`
    };
  }
  
  return null;
}