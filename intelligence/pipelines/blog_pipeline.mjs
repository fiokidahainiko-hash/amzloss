/* AmzLoss Content Intelligence — Blog Pipeline
   Executes the complete 12-step Blog Workflow:
   Keyword -> Search Intent -> SERP -> Cluster -> Brief -> Existing check -> Cannibalization check -> Generation -> Internal Link -> SEO Audit -> Quality Evaluation -> Revision -> Final Approval -> Publish */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runSeoResearchAgent } from "../agents/seo_research_agent.mjs";
import { runTopicClusterAgent } from "../agents/topic_cluster_agent.mjs";
import { runBlogWriterAgent } from "../agents/blog_writer_agent.mjs";
import { runInternalLinkingAgent } from "../agents/internal_linking_agent.mjs";
import { runBlogSeoAuditor } from "../agents/blog_seo_auditor.mjs";
import { seoPreCheck, enhanceBriefFromSERPs, validateGeneratedContent, blogPipelineSEOAdvice } from "./blog_seo_bridge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const BLOGS_DIR = path.join(ROOT, "blogs");
const BLOG_JS = path.join(ROOT, "js", "blog.js");
const SITEMAP = path.join(ROOT, "sitemap.xml");

function loadAdminConfig() {
  try {
    const configPath = path.join(__dirname, "..", "config", "admin_config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (e) {}
  return { quality_thresholds: { blog: { approved_min: 85, revision_min: 70, max_revisions: 2 } } };
}

/**
 * Execute Complete Blog Pipeline
 */
export async function runBlogPipeline({ keyword, category = "Tools", autoPublish = false }) {
  const adminConfig = loadAdminConfig();
  const thresholds = adminConfig.quality_thresholds.blog;
  const pipelineLog = { keyword, category, steps: [], iterations: 0 };

  console.log(`\n==================================================`);
  console.log(`[Blog Pipeline] Starting run for: "${keyword}"`);
  console.log(`==================================================\n`);

  // SEO Engine Pre-Check: validate keyword opportunity before pipeline runs
  console.log(`[SEO Pre-Check] Analyzing keyword opportunity...`);
  const seoPreChecks = await seoPreCheck({ keyword, category });
  console.log(`  Opportunity: ${seoPreChecks.scores.opportunity ?? "N/A"}/100`);
  if (seoPreChecks.warnings.length) seoPreChecks.warnings.forEach(w => console.log(`  Warning: ${w}`));
  if (!seoPreChecks.passed) {
    console.warn(`[SEO Blockers] Pipeline blocked: ${seoPreChecks.blockers.join("; ")}`);
    return { article: null, seo_pre_check: seoPreChecks, published: false, blocked: true };
  }
  pipelineLog.steps.push({ step: "SEO Pre-Check", data: seoPreChecks });

  // Step 1 & 2 & 3: SEO Research, Search Intent, SERP Analysis
  console.log(`[Step 1-3] Running SEO Research Agent...`);
  const seoResearch = await runSeoResearchAgent({ keyword, category });
  pipelineLog.steps.push({ step: "SEO Research", data: seoResearch });

  // Step 4 & 5 & 6: Topic Cluster & Existing Content & Cannibalization Check
  console.log(`[Step 4-6] Running Topic Cluster & Cannibalization Check...`);
  const clusterData = await runTopicClusterAgent({ topic: keyword });
  pipelineLog.steps.push({ step: "Topic Cluster", data: clusterData });

  // Step 7: Content Brief Construction (enhanced with SERP data from SEO engine)
  let brief = {
    title: seoResearch.recommended_title || `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: 2026 Strategy Guide`,
    slug: keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    category: seoResearch.target_category || category,
    lsi_keywords: seoResearch.lsi_keywords || []
  };
  brief = enhanceBriefFromSERPs({ brief, keyword, serp_analysis: seoPreChecks.serp_analysis, opportunity: seoPreChecks.opportunity_score });
  if (brief.requires_faq) console.log(`  [SERP] FAQ section recommended by SEO engine`);
  if (brief.requires_tool) console.log(`  [SERP] Tool/calculator format expected in SERP`);
  if (brief.required_entities?.length) console.log(`  [SERP] Required entities: ${brief.required_entities.slice(0, 3).join(", ")}`);
  pipelineLog.steps.push({ step: "Content Brief", data: brief });

  // Step 8: Article Generation
  console.log(`[Step 8] Running Blog Writer Agent...`);
  let articleData = await runBlogWriterAgent({ researchData: seoResearch, brief });

  // Step 9: Internal Linking Analysis
  console.log(`[Step 9] Running Internal Linking Agent...`);
  const linkingData = await runInternalLinkingAgent({
    articleContent: articleData.content_html,
    articleSlug: articleData.slug,
    category: articleData.category
  });
  pipelineLog.steps.push({ step: "Internal Linking", data: linkingData });

  // Inject recommended internal links into HTML
  if (linkingData.recommended_links && linkingData.recommended_links.length > 0) {
    let extraLinksHtml = `<div class="trust-note" style="margin:24px 0;"><strong>Related Webmaster Tools:</strong> `;
    extraLinksHtml += linkingData.recommended_links
      .map(l => `<a href="../${l.target_url}">${l.anchor_text}</a>`)
      .join(" • ");
    extraLinksHtml += `</div>`;
    articleData.content_html += extraLinksHtml;
  }

  // Step 10 & 11 & 12: SEO Audit -> Quality Evaluation -> Revision Loop
  let evaluation = null;
  let revisions = 0;
  const maxRevisions = thresholds.max_revisions || 2;

  while (revisions <= maxRevisions) {
    pipelineLog.iterations++;
    console.log(`[Step 10-11] Evaluating Quality (Iteration ${pipelineLog.iterations})...`);
    evaluation = await runBlogSeoAuditor({ articleData });
    console.log(`[Audit Score] Overall Score: ${evaluation.overall_score}/100 (Status: ${evaluation.status})`);

    if (evaluation.overall_score >= thresholds.approved_min) {
      console.log(`[Approval] Content met threshold (>=${thresholds.approved_min}). APPROVED!`);
      break;
    }

    if (evaluation.overall_score >= thresholds.revision_min && revisions < maxRevisions) {
      revisions++;
      console.log(`[Revision] Score ${evaluation.overall_score} requires revision. Executing revision pass ${revisions}...`);
      // Re-run Blog Writer with revision instructions
      articleData = await runBlogWriterAgent({
        researchData: seoResearch,
        brief: { ...brief, revision_instructions: evaluation.revision_instructions }
      });
    } else {
      if (evaluation.overall_score < thresholds.revision_min) {
        console.warn(`[Quality Warning] Score ${evaluation.overall_score} below revision threshold (${thresholds.revision_min}). Regenerating article...`);
        articleData = await runBlogWriterAgent({ researchData: seoResearch, brief });
        revisions++;
      } else {
        console.log(`[Max Revisions Reached] Accepting best draft with score ${evaluation.overall_score}.`);
        break;
      }
    }
  }

  // Final Output Payload
  const finalResult = {
    article: articleData,
    seo_research: seoResearch,
    cluster_data: clusterData,
    linking_data: linkingData,
    evaluation,
    seo_pre_check: seoPreChecks,
    seo_brief: brief,
    seo_advice: [],
    seo_validation: null,
    published: false
  };

  // Post-generation SEO validation
  finalResult.seo_validation = validateGeneratedContent({ keyword, generatedSlug: articleData.slug, html: articleData.content_html, serp_analysis: seoPreChecks.serp_analysis });
  if (finalResult.seo_validation.issues.length > 0) {
    console.log(`[SEO Validation] ${finalResult.seo_validation.issues.length} issues found:`);
    finalResult.seo_validation.issues.forEach(i => console.log(`  [${i.severity}] ${i.message}`));
  }

  // Generate SEO pipeline advice
  finalResult.seo_advice = blogPipelineSEOAdvice({ keyword, checks: seoPreChecks });
  if (finalResult.seo_advice.length > 0) {
    console.log(`[SEO Advice] ${finalResult.seo_advice.length} actions recommended:`);
    finalResult.seo_advice.forEach(a => console.log(`  ${a.action}: ${a.reason}`));
  }

  // Step 13: Publish (if requested)
  if (autoPublish || evaluation.overall_score >= thresholds.approved_min) {
    console.log(`[Publishing] Writing HTML page and updating sitemap/blog.js...`);
    const publishInfo = publishArticleToSite(articleData);
    finalResult.published = true;
    finalResult.publish_info = publishInfo;
  }

  console.log(`\n==================================================`);
  console.log(`[Blog Pipeline Complete] Score: ${evaluation.overall_score}/100 | Published: ${finalResult.published}`);
  console.log(`==================================================\n`);

  return finalResult;
}

/**
 * Publish generated article to HTML file, js/blog.js, and sitemap.xml
 */
export function publishArticleToSite(article) {
  const slug = article.slug;
  const fileName = `${slug}.html`;
  const filePath = path.join(BLOGS_DIR, fileName);
  const nowStr = new Date().toISOString().split("T")[0];

  const faqSchema = (article.faq || []).map(f => ({
    "@type": "Question",
    "name": f.question,
    "acceptedAnswer": { "@type": "Answer", "text": f.answer }
  }));

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
 <meta charset="UTF-8">
 <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>${article.title} | AMZLOSS</title>
 <meta name="description" content="${article.meta_description}">
 <meta name="keywords" content="${(article.keywords || []).join(", ")}">
 <meta name="robots" content="index, follow">
 <link rel="canonical" href="https://amzloss.com/blogs/${fileName}">
 <link rel="preload" as="style" href="../assets/css/style.css">
 <link rel="stylesheet" href="../assets/css/style.css">
 <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
 <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" media="print" onload="this.media='all'">
 <script type="application/ld+json">
 {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${article.title}",
  "description": "${article.meta_description}",
  "author": { "@type": "Organization", "name": "AmzLoss" },
  "publisher": { "@type": "Organization", "name": "AmzLoss", "logo": { "@type": "ImageObject", "url": "https://amzloss.com/assets/img/favicon.svg" } },
  "datePublished": "${nowStr}",
  "dateModified": "${nowStr}"
 }
 </script>
 ${faqSchema.length > 0 ? `<script type="application/ld+json">
 {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": ${JSON.stringify(faqSchema, null, 2)}
 }
 </script>` : ""}
</head>
<body>

<header class="site-header">
 <div class="container nav">
  <a class="brand" href="../index.html"><img class="brand-logo" src="../assets/img/favicon.svg" alt="AmzLoss" width="30" height="30">AmzLoss</a>
  <nav class="nav-links">
   <a href="../calculator.html">Calculator</a>
   <a href="../audit.html">Audit</a>
   <a href="../rates.html">Rates</a>
   <a href="../blogs.html">Learn</a>
  </nav>
 </div>
</header>

<section class="page-head">
 <div class="container">
  <span class="kicker">${article.category || "Tools"}</span>
  <h1>${article.title}</h1>
  <p>${article.meta_description}</p>
 </div>
</section>

<section class="section">
 <div class="container page-narrow">
  ${article.tldr_points && article.tldr_points.length > 0 ? `
  <div class="trust-note" style="margin-bottom:28px;">
   <strong>Key Takeaways:</strong>
   <ul style="margin:8px 0 0 18px;padding:0;">
    ${article.tldr_points.map(p => `<li>${p}</li>`).join("\n")}
   </ul>
  </div>` : ""}

  ${article.content_html}

  ${article.faq && article.faq.length > 0 ? `
  <h2>Frequently Asked Questions</h2>
  <div class="faq-list">
   ${article.faq.map(f => `
   <div class="faq-item" style="margin-bottom:16px;">
    <h3>${f.question}</h3>
    <p>${f.answer}</p>
   </div>`).join("")}
  </div>` : ""}
 </div>
</section>

<footer class="site-footer">
 <div class="container"><p>2026 AmzLoss. Independent webmaster and affiliate verification tools.</p></div>
</footer>

<script>
(function() {
  function loadGtm() {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=G-LRXMHQECWQ";
    document.head.appendChild(s);
  }
  if ("requestIdleCallback" in window) { requestIdleCallback(loadGtm, { timeout: 3000 }); }
  else { setTimeout(loadGtm, 500); }
})();
</script>
</body>
</html>`;

  // Write file to blogs/
  fs.mkdirSync(BLOGS_DIR, { recursive: true });
  fs.writeFileSync(filePath, fullHtml, "utf-8");

  // Update js/blog.js if present
  try {
    if (fs.existsSync(BLOG_JS)) {
      const blogJsContent = fs.readFileSync(BLOG_JS, "utf-8");
      const newEntry = `  { slug: "${slug}", title: "${article.title.replace(/"/g, '\\"')}", date: "${nowStr}", category: "${article.category || "Tools"}", desc: "${article.meta_description.replace(/"/g, '\\"')}" },\n`;
      if (!blogJsContent.includes(`slug: "${slug}"`)) {
        const updatedBlogJs = blogJsContent.replace("var POSTS = [\n", "var POSTS = [\n" + newEntry);
        fs.writeFileSync(BLOG_JS, updatedBlogJs, "utf-8");
      }
    }
  } catch (e) {
    console.warn(`[Blog Pipeline] Warning updating js/blog.js: ${e.message}`);
  }

  // Update sitemap.xml if present
  try {
    if (fs.existsSync(SITEMAP)) {
      const sitemapContent = fs.readFileSync(SITEMAP, "utf-8");
      const urlTag = `  <url>\n    <loc>https://amzloss.com/blogs/${fileName}</loc>\n    <lastmod>${nowStr}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      if (!sitemapContent.includes(`blogs/${fileName}`)) {
        const updatedSitemap = sitemapContent.replace("</urlset>", `${urlTag}</urlset>`);
        fs.writeFileSync(SITEMAP, updatedSitemap, "utf-8");
      }
    }
  } catch (e) {
    console.warn(`[Blog Pipeline] Warning updating sitemap.xml: ${e.message}`);
  }

  return { file_name: fileName, file_path: filePath, published_at: nowStr };
}
