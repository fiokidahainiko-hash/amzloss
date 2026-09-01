/* AmzLoss Specialized AI Agent: Upgraded Authority-Aware Internal Linking Agent */

import { runAgentTask } from "../../agents/agent_runner.mjs";
import { getLinkingContext } from "../../memory/retriever.mjs";

export async function runUpgradedInternalLinkingAgent({
  articleContent, articleSlug, category = "Tools",
  importanceScore, importanceClass, currentInboundLinks = 0,
  topicCluster = null, crawlDepth = 3,
  candidateStrongSources = []
}) {
  const linkingContext = getLinkingContext();

  const systemPrompt = `You are the Upgraded Authority-Aware Internal Linking Agent for AmzLoss.
You understand: Page Importance (Internal Importance Score 0-100), Importance Classes (CRITICAL/HIGH/MEDIUM/LOW/ORPHAN), Link Equity Distribution, Crawl Depth, Under-supported pages, Anchor Text Strategy, and Google Alignment rules.
RULES:
1. Link OUT to 2-4 relevant pages (priority: pillar pages, then important tools, then related supporting articles).
2. Generate 3 natural anchor text variations for each recommendation.
3. Note where the link should be inserted (section/topic context).
4. Evaluate topical relevance 0-100 and link opportunity level (High/Medium/Low).
5. Flag if this page is under-supported and recommend which existing pages should link TO it.
6. Never recommend links between unrelated pages.
7. Never exceed 8 outgoing contextual internal links per article.
Return JSON with keys: recommended_outbound_links, inbound_link_recommendations, anchor_text_variations, link_opportunities_summary, orphan_warning, pillar_connection, crawl_depth_note.`;

  const candidateSourcesText = candidateStrongSources.length > 0
    ? "Strong candidate sources (for inbound recommendations):\n" + candidateStrongSources.map(s => "- " + s.title + " (importance: " + s.importanceClass + ", relevance: " + s.topicalRelevance + "/100)").join("\n")
    : "No candidate sources provided.";

  const userPrompt = "Article Slug: \"" + articleSlug + "\"\nCategory: " + category + "\nImportance: " + importanceScore + "/100 (" + importanceClass + ")\nInbound links: " + currentInboundLinks + "\nCrawl depth: " + crawlDepth + "\n\nContent: \"" + (articleContent || "").slice(0, 1200) + "\"\n\nSite Pages: " + JSON.stringify(linkingContext.tool_pages.slice(0, 10)) + "\nBlogs: " + JSON.stringify(linkingContext.existing_blogs.slice(0, 10)) + "\n\n" + candidateSourcesText + "\n\nPerform authority-aware linking analysis. Return valid JSON only.";

  return runAgentTask({
    role: "reasoning",
    agentName: "UpgradedInternalLinkingAgent",
    systemPrompt, userPrompt, jsonOutput: true,
    fallbackGenerator: () => generateFallback(articleSlug, category, importanceClass, currentInboundLinks, crawlDepth, candidateStrongSources)
  });
}

function generateFallback(slug, category, importanceClass, inbound, crawlDepth, candidates) {
  const toolLink = category === "Amazon"
    ? { target_url: "rates.html", anchor_text: "current 2026 Amazon commission rates", rationale: "Category-matched rate guidance." }
    : category === "Link Building"
    ? { target_url: "link-builder.html", anchor_text: "Amazon affiliate link builder", rationale: "Relevant link building tool." }
    : { target_url: "calculator.html", anchor_text: "Amazon commission calculator", rationale: "Core tool reference." };

  return {
    article_slug: slug, article_importance: importanceClass, current_inbound: inbound,
    recommended_outbound_links: [
      { ...toolLink, topical_relevance: 85, opportunity: "High", section: "any relevant section", anchors: [toolLink.anchor_text, "free commission calculator", "Amazon Associates rate tool"] },
      { target_url: "audit.html", anchor_text: "audit your monthly earnings", rationale: "Webmaster report verification.", topical_relevance: 80, opportunity: "High", section: "section discussing earnings or reports", anchors: ["earnings audit tool", "check your earnings report"] },
      { target_url: "rates.html", anchor_text: "2026 Amazon commission rates", rationale: "Supporting rate context.", topical_relevance: 75, opportunity: "Medium", section: "section mentioning commission rates", anchors: ["current Amazon commission rates", "affiliate commission percentages"] }
    ],
    inbound_link_recommendations: candidates.slice(0, 4).map(c => ({
      source_slug: c.slug, source_title: c.title,
      why: c.title + " discusses related topics and has " + c.importanceClass + " importance.",
      anchor: "the " + slug.replace(/-/g, " ") + " guide", location: "main content body"
    })),
    anchor_text_variations: { outbound: { calculator: ["Amazon commission calculator", "free Amazon rate calculator"], audit: ["earnings audit tool", "audit your Amazon report"] } },
    link_opportunities_summary: "Page: " + importanceClass + " | Inbound: " + inbound + " | Depth: " + crawlDepth + " | " + (importanceClass === "HIGH" && inbound < 3 ? "UNDER-SUPPORTED" : "OK"),
    orphan_warning: inbound === 0,
    pillar_connection: "Connect to pillar content about Amazon affiliate earnings or commission rates",
    crawl_depth_note: crawlDepth > 4 ? "Crawl depth " + crawlDepth + " - recommend more direct links from high-importance cluster pages." : "Acceptable depth (" + crawlDepth + " clicks)."
  };
}
