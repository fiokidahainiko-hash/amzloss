/* AmzLoss Specialized AI Agent: Internal Linking Agent
   Responsible for: Finding related existing articles, recommending links, creating anchor text,
   detecting orphan pages, building topic clusters, avoiding irrelevant links. */

import { runAgentTask } from "./agent_runner.mjs";
import { getLinkingContext } from "../memory/retriever.mjs";

export async function runInternalLinkingAgent({ articleContent, articleSlug, category = "Tools" }) {
  const linkingContext = getLinkingContext();

  const systemPrompt = `You are the Internal Linking Agent for AmzLoss.
Your task is to analyze an article's content and recommend high-value, natural internal links.
RULES:
1. Link to 1-2 relevant core tools (e.g. calculator.html, audit.html, rates.html, breakeven.html, link-builder.html, backlink-checker.html, url-submitter.html, directory.html).
2. Link to 1-2 related blog articles.
3. Anchor text must be descriptive and natural (e.g., 'check 2026 Amazon commission rates' or 'audit your earnings report CSV'). Never use generic 'click here' or repetitive exact-match spam.
4. Detect if the page would become an orphan page if not linked from category pages.
Return JSON format with keys: recommended_links (array of { target_url, anchor_text, insertion_context, rationale }), orphan_warning, pillar_connection.`;

  const userPrompt = `Article Slug: "${articleSlug}"
Category: ${category}
Article Snippet: "${articleContent.slice(0, 800)}"
Available Site Links: ${JSON.stringify(linkingContext.tool_pages)}
Existing Blogs: ${JSON.stringify(linkingContext.existing_blogs.slice(0, 10))}

Recommend optimal internal links for this article. Return valid JSON only.`;

  return runAgentTask({
    role: "reasoning",
    agentName: "InternalLinkingAgent",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => {
      const toolLink = category === "Amazon"
        ? { target_url: "rates.html", anchor_text: "current 2026 Amazon commission rates", rationale: "Direct match for category rate guidance." }
        : category === "Link Building"
        ? { target_url: "link-builder.html", anchor_text: "Amazon affiliate link builder", rationale: "Connects guide to link generation tool." }
        : { target_url: "calculator.html", anchor_text: "Amazon commission calculator", rationale: "Core calculator tool reference." };

      return {
        recommended_links: [
          toolLink,
          {
            target_url: "audit.html",
            anchor_text: "audit your monthly earnings report",
            rationale: "High intent contextual link for webmasters verifying reports."
          },
          {
            target_url: "breakeven.html",
            anchor_text: "calculate price drop break-even",
            rationale: "Relevant calculation link for revenue strategy."
          }
        ],
        orphan_warning: false,
        pillar_connection: "Linked to primary tool hub and category index."
      };
    }
  });
}
