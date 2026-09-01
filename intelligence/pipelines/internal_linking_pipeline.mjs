/* AmzLoss Content Intelligence — Site-Wide Internal Linking Pipeline
   Scans site pages and blog articles, detects orphan pages, builds semantic link connections,
   and recommends descriptive anchor text across pillar & supporting content. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SITE_PAGES } from "../memory/retriever.mjs";
import { runInternalLinkingAgent } from "../agents/internal_linking_agent.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const BLOGS_DIR = path.join(ROOT, "blogs");

export async function runInternalLinkingPipeline() {
  console.log(`\n==================================================`);
  console.log(`[Internal Linking Pipeline] Scanning site pages & blogs...`);
  console.log(`==================================================\n`);

  const blogFiles = [];
  if (fs.existsSync(BLOGS_DIR)) {
    const files = fs.readdirSync(BLOGS_DIR).filter(f => f.endsWith(".html"));
    for (const file of files) {
      const filePath = path.join(BLOGS_DIR, file);
      const content = fs.readFileSync(filePath, "utf-8");
      blogFiles.push({
        file,
        slug: file.replace(".html", ""),
        path: filePath,
        content
      });
    }
  }

  console.log(`Found ${SITE_PAGES.length} tool pages and ${blogFiles.length} blog articles.`);

  const auditReport = {
    total_tool_pages: SITE_PAGES.length,
    total_blog_pages: blogFiles.length,
    orphan_pages: [],
    recommended_internal_links: [],
    linking_health_score: 100
  };

  // 1. Detect orphan pages (pages not linked from blogs or root)
  const allHtml = blogFiles.map(b => b.content).join("\n");
  for (const tool of SITE_PAGES) {
    if (!allHtml.includes(tool.url)) {
      auditReport.orphan_pages.push({
        url: tool.url,
        title: tool.title,
        type: "tool_page",
        recommendation: `Add contextual links to '${tool.url}' in relevant blog posts.`
      });
      auditReport.linking_health_score -= 5;
    }
  }

  // 2. Sample 5 blog articles for semantic linking optimization
  const sampleBlogs = blogFiles.slice(0, 5);
  for (const blog of sampleBlogs) {
    console.log(`Analyzing internal link structure for: ${blog.file}...`);
    const agentResult = await runInternalLinkingAgent({
      articleContent: blog.content,
      articleSlug: blog.slug,
      category: "Tools"
    });

    auditReport.recommended_internal_links.push({
      file: blog.file,
      slug: blog.slug,
      recommendations: agentResult.recommended_links || []
    });
  }

  auditReport.linking_health_score = Math.max(40, auditReport.linking_health_score);

  console.log(`\n[Internal Linking Audit Complete] Linking Health Score: ${auditReport.linking_health_score}/100`);
  console.log(`Orphan Pages Detected: ${auditReport.orphan_pages.length}`);

  return auditReport;
}
