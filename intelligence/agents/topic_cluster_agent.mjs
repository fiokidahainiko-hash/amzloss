/* AmzLoss Specialized AI Agent: Topic Cluster Agent
   Responsible for: Pillar topics, supporting topics, search-intent coverage, content gaps, cannibalization prevention. */

import { runAgentTask } from "./agent_runner.mjs";
import { getLinkingContext } from "../memory/retriever.mjs";

export async function runTopicClusterAgent({ topic }) {
  const linkingContext = getLinkingContext();

  const systemPrompt = `You are the Topic Cluster Agent for AmzLoss.
Your job is to structure a comprehensive topic cluster around a main topic.
1. Identify the central Pillar Page.
2. Propose 5-7 supporting cluster topics covering distinct search intents.
3. Check existing content to avoid cannibalization or duplicate search intent.
Always return JSON format with keys: pillar_topic, existing_coverage_matches, supporting_topics (array of { title, search_intent, primary_keyword, target_slug, relationship_to_pillar }), content_gaps_identified.`;

  const userPrompt = `Requested Topic: "${topic}"
Existing Site Pages & Blogs: ${JSON.stringify(linkingContext.tool_pages.concat(linkingContext.existing_blogs))}

Analyze existing pages and build a non-cannibalizing Topic Cluster. Return valid JSON only.`;

  return runAgentTask({
    role: "reasoning",
    agentName: "TopicClusterAgent",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => ({
      pillar_topic: topic,
      existing_coverage_matches: linkingContext.tool_pages
        .filter(p => topic.toLowerCase().includes(p.keywords[0]))
        .map(p => p.title),
      supporting_topics: [
        {
          title: `How ${topic} Impacts Amazon Affiliate Earnings`,
          search_intent: "Informational",
          primary_keyword: `${topic} affiliate earnings`,
          target_slug: `how-${topic.toLowerCase().replace(/[^a-z0-0]+/g, "-")}-impacts-earnings`,
          relationship_to_pillar: "Explains financial impact and formulas."
        },
        {
          title: `Step-by-Step ${topic} Audit & Calculation`,
          search_intent: "Commercial Investigation",
          primary_keyword: `${topic} audit guide`,
          target_slug: `step-by-step-${topic.toLowerCase().replace(/[^a-z0-0]+/g, "-")}-audit`,
          relationship_to_pillar: "Provides practical audit steps using AmzLoss tools."
        },
        {
          title: `2026 Rate Changes and ${topic}`,
          search_intent: "Informational",
          primary_keyword: `2026 ${topic} rate changes`,
          target_slug: `2026-rate-changes-${topic.toLowerCase().replace(/[^a-z0-0]+/g, "-")}`,
          relationship_to_pillar: "Historical and current rate comparison."
        },
        {
          title: `Common Mistakes When Calculating ${topic}`,
          search_intent: "Informational",
          primary_keyword: `${topic} mistakes`,
          target_slug: `common-${topic.toLowerCase().replace(/[^a-z0-0]+/g, "-")}-mistakes`,
          relationship_to_pillar: "Troubleshooting guide."
        }
      ],
      content_gaps_identified: [
        "Lack of category-specific mathematical breakdowns",
        "Need for updated 2026 rate benchmarks"
      ]
    })
  });
}
