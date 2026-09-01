/* AmzLoss Specialized AI Agent: SEO Research Agent
   Responsible for: Keyword analysis, search intent, SERP interpretation, topic opportunities, keyword relationships. */

import { runAgentTask } from "./agent_runner.mjs";
import { getBlogContext } from "../memory/retriever.mjs";

export async function runSeoResearchAgent({ keyword, category = "Tools" }) {
  const context = getBlogContext({ keyword, category });

  const systemPrompt = `You are the SEO Research Agent for AmzLoss.
Your job is to analyze keywords, identify primary search intent (Informational, Commercial Investigation, Transactional), determine 5 secondary/LSI keywords, SERP opportunities, and target audience pain points.
Always return JSON format with keys: primary_keyword, search_intent, intent_explanation, lsi_keywords, serp_target_angle, pain_points, recommended_title, target_category.`;

  const userPrompt = `Target Topic / Keyword: "${keyword}"
Category: ${category}
SEO Rules Context: ${JSON.stringify(context.seo_rules)}

Perform a thorough SEO research audit for this keyword. Return valid JSON only.`;

  return runAgentTask({
    role: "reasoning",
    agentName: "SeoResearchAgent",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => ({
      primary_keyword: keyword,
      search_intent: "Informational",
      intent_explanation: `Users searching for '${keyword}' want to understand how Amazon affiliate rates affect their payouts and how to audit earnings.`,
      lsi_keywords: [
        `${keyword} 2026`,
        `amazon affiliate ${keyword}`,
        `calculate ${keyword}`,
        `amazon earnings audit`,
        `rate cut impact`
      ],
      serp_target_angle: "Step-by-step mathematical breakdown with clear rate tables and free calculator tools.",
      pain_points: [
        "Unexplained drops in monthly affiliate income",
        "Confusing Amazon Associates report CSV columns",
        "Discounts shrinking base commission per order"
      ],
      recommended_title: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: 2026 Strategy & Calculation Guide`,
      target_category: category
    })
  });
}
