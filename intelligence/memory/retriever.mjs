/* AmzLoss Content Intelligence — Intelligent Context Retriever (v2.0.0) */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INTELLIGENCE_DIR = path.join(__dirname, "..");
const KNOWLEDGE_DIR = path.join(INTELLIGENCE_DIR, "knowledge");
const MEMORY_DIR = path.join(INTELLIGENCE_DIR, "memory");

export function loadJson(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {
    console.warn(`[Retriever] Warning loading ${filePath}: ${e.message}`);
  }
  return fallback;
}

export function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn(`[Retriever] Warning saving ${filePath}: ${e.message}`);
  }
}

const seoKnowledge = loadJson(path.join(KNOWLEDGE_DIR, "seo_knowledge.json"));
const blogKnowledge = loadJson(path.join(KNOWLEDGE_DIR, "blog_knowledge.json"));
const tiktokKnowledge = loadJson(path.join(KNOWLEDGE_DIR, "tiktok_knowledge.json"));
const approvedExamples = loadJson(path.join(MEMORY_DIR, "approved_examples.json"), []);
const feedbackHistory = loadJson(path.join(MEMORY_DIR, "feedback_history.json"), { generation_logs: [], performance_metrics: {} });
const creativeFeedback = loadJson(path.join(MEMORY_DIR, "creative_feedback.json"), { approved_creative_references: [], rejected_creative_feedback: [] });

const saasDesignKnowledge = loadJson(path.join(INTELLIGENCE_DIR, "design", "knowledge", "saas_design_knowledge.json"));
const motionKnowledge = loadJson(path.join(INTELLIGENCE_DIR, "design", "knowledge", "motion_knowledge.json"));
const visualReferences = loadJson(path.join(INTELLIGENCE_DIR, "design", "references", "visual_references.json"), []);
const creativeStyles = loadJson(path.join(INTELLIGENCE_DIR, "video", "systems", "creative_styles.json"), {});
const kineticTypography = loadJson(path.join(INTELLIGENCE_DIR, "video", "systems", "kinetic_typography.json"), {});
const soundDesignKnowledge = loadJson(path.join(INTELLIGENCE_DIR, "video", "systems", "sound_design.json"), {});

export const SITE_PAGES = [
  { url: "calculator.html", title: "Amazon Affiliate Commission Calculator", category: "Tools", keywords: ["commission calculator", "calculate earnings", "amazon rate math"] },
  { url: "audit.html", title: "Amazon Associates Earnings Audit", category: "Tools", keywords: ["earnings audit", "report verification", "underpayment check"] },
  { url: "breakeven.html", title: "Amazon Affiliate Price Drop Calculator", category: "Tools", keywords: ["break-even", "price drop", "commission loss"] },
  { url: "commission-loss.html", title: "Amazon Affiliate Commission Loss Calculator", category: "Tools", keywords: ["commission loss", "revenue impact", "rate cuts"] },
  { url: "rates.html", title: "Current Amazon Associates Commission Rates 2026", category: "Amazon", keywords: ["rates 2026", "category rate table", "associates rates"] },
  { url: "earnings-analyzer.html", title: "Amazon Earnings Report Analyzer", category: "Tools", keywords: ["earnings report analyzer", "csv audit", "order report"] },
  { url: "networks.html", title: "Affiliate Network Commission Calculator", category: "Networks", keywords: ["shareasale", "cj affiliate", "impact", "network comparison"] },
  { url: "link-builder.html", title: "Amazon Affiliate Link Builder", category: "Link Building", keywords: ["link builder", "tracking tag", "nofollow sponsored"] },
  { url: "backlink-checker.html", title: "Free Backlink Checker", category: "Link Building", keywords: ["backlink checker", "open pagerank", "link verification"] },
  { url: "url-submitter.html", title: "Free URL Submission Tool", category: "Tools", keywords: ["url submitter", "indexnow", "search engine indexing"] },
  { url: "directory.html", title: "Free Webmaster & Affiliate Resources Directory", category: "Link Building", keywords: ["webmaster directory", "backlink directory", "affiliate resources"] }
];

export function getBlogContext({ topic = "", keyword = "", category = "Tools" } = {}) {
  const relevantExamples = (Array.isArray(approvedExamples) ? approvedExamples : [])
    .filter(ex => ex.content_type === "blog" && ex.status === "approved").slice(0, 2);
  const relevantPages = SITE_PAGES.filter(p => p.category === category || topic.toLowerCase().includes(p.keywords[0]));

  return {
    seo_rules: { search_intent: seoKnowledge.seo_rules?.search_intent || {}, internal_linking: seoKnowledge.seo_rules?.internal_linking || {}, eeat: seoKnowledge.seo_rules?.eeat_and_affiliate_guidelines || {} },
    brand_standards: { brand_voice: blogKnowledge.blog_standards?.brand_voice || {}, writing_style: blogKnowledge.blog_standards?.writing_style || {}, banned_phrases: blogKnowledge.blog_standards?.brand_voice?.banned_phrases || [] },
    internal_link_targets: relevantPages,
    approved_examples: relevantExamples
  };
}

export function getTikTokContext({ topic = "" } = {}) {
  const relevantExamples = (Array.isArray(approvedExamples) ? approvedExamples : [])
    .filter(ex => ex.content_type === "tiktok" && ex.status === "approved").slice(0, 2);
  return {
    hook_formulas: tiktokKnowledge.tiktok_standards?.hook_formulas || [],
    banned_intros: tiktokKnowledge.tiktok_standards?.banned_intros || [],
    storytelling_structure: tiktokKnowledge.tiktok_standards?.storytelling_structure || {},
    retention_techniques: tiktokKnowledge.tiktok_standards?.retention_techniques || {},
    tiktok_seo: tiktokKnowledge.tiktok_standards?.tiktok_seo || {},
    approved_examples: relevantExamples
  };
}

export function getDesignContext() {
  return {
    saas_design_principles: saasDesignKnowledge,
    motion_design_principles: motionKnowledge,
    visual_references: (Array.isArray(visualReferences) ? visualReferences : []).slice(0, 3),
    creative_rejected_feedback: (Array.isArray(creativeFeedback.rejected_creative_feedback) ? creativeFeedback.rejected_creative_feedback : []).filter(f => f.type === "website_design")
  };
}

export function getVideoContext() {
  return {
    creative_styles: creativeStyles,
    kinetic_typography: kineticTypography,
    sound_design: soundDesignKnowledge,
    approved_references: (Array.isArray(creativeFeedback.approved_creative_references) ? creativeFeedback.approved_creative_references : []).filter(f => f.type === "video_production").slice(0, 2),
    rejected_video_feedback: (Array.isArray(creativeFeedback.rejected_creative_feedback) ? creativeFeedback.rejected_creative_feedback : []).filter(f => f.type === "video_production")
  };
}

export function getLinkingContext() {
  const blogsDir = path.join(INTELLIGENCE_DIR, "..", "blogs");
  const existingBlogs = [];
  try {
    if (fs.existsSync(blogsDir)) {
      const files = fs.readdirSync(blogsDir).filter(f => f.endsWith(".html"));
      for (const file of files) {
        existingBlogs.push({ slug: file.replace(".html", ""), url: `blogs/${file}`, title: file.replace(/-/g, " ").replace(".html", "") });
      }
    }
  } catch (e) {}
  return { tool_pages: SITE_PAGES, existing_blogs: existingBlogs.slice(0, 50) };
}

export function reloadKnowledge() {
  return {
    seoKnowledge: loadJson(path.join(KNOWLEDGE_DIR, "seo_knowledge.json")),
    blogKnowledge: loadJson(path.join(KNOWLEDGE_DIR, "blog_knowledge.json")),
    tiktokKnowledge: loadJson(path.join(KNOWLEDGE_DIR, "tiktok_knowledge.json"))
  };
}
