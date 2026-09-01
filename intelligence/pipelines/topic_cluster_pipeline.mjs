/* AmzLoss Content Intelligence — Topic Cluster Pipeline
   Handles Topic Cluster generation: checks existing content -> identifies missing supporting topics ->
   allows interactive or automated cluster creation with options ('Create All', 'Create Selected', 'Skip'). */

import { runTopicClusterAgent } from "../agents/topic_cluster_agent.mjs";
import { runBlogPipeline } from "./blog_pipeline.mjs";

export async function runTopicClusterPipeline({ topic, action = "recommend", selectedSlugs = [] }) {
  console.log(`\n==================================================`);
  console.log(`[Topic Cluster Pipeline] Analyzing topic: "${topic}"`);
  console.log(`==================================================\n`);

  // Step 1: Run Topic Cluster Agent
  const clusterRecommendation = await runTopicClusterAgent({ topic });

  console.log(`[Cluster Analysis] Pillar Topic: "${clusterRecommendation.pillar_topic}"`);
  console.log(`[Cluster Analysis] Existing Content Matches: ${JSON.stringify(clusterRecommendation.existing_coverage_matches)}`);
  console.log(`[Cluster Analysis] Supporting Topics Recommended: ${clusterRecommendation.supporting_topics.length}`);

  const summary = {
    pillar_topic: clusterRecommendation.pillar_topic,
    existing_matches: clusterRecommendation.existing_coverage_matches,
    supporting_topics: clusterRecommendation.supporting_topics,
    content_gaps: clusterRecommendation.content_gaps_identified,
    options: ["Create All", "Create Selected", "Skip"]
  };

  // If action is "recommend" only, return the recommendations
  if (action === "recommend") {
    return summary;
  }

  const generatedArticles = [];

  // Filter topics to generate based on action
  let topicsToCreate = [];
  if (action === "create_all") {
    topicsToCreate = clusterRecommendation.supporting_topics;
  } else if (action === "create_selected" && Array.isArray(selectedSlugs) && selectedSlugs.length > 0) {
    topicsToCreate = clusterRecommendation.supporting_topics.filter(t =>
      selectedSlugs.includes(t.target_slug) || selectedSlugs.includes(t.primary_keyword)
    );
  } else if (action === "skip") {
    console.log(`[Topic Cluster Pipeline] User selected 'Skip'. No articles generated.`);
    return { ...summary, generated_articles: [] };
  }

  console.log(`[Topic Cluster Pipeline] Generating ${topicsToCreate.length} articles...`);

  for (const item of topicsToCreate) {
    console.log(`\n--> Generating cluster article: "${item.title}" (${item.primary_keyword})`);
    const result = await runBlogPipeline({
      keyword: item.primary_keyword,
      category: "Tools",
      autoPublish: true
    });
    generatedArticles.push(result);
  }

  return {
    ...summary,
    generated_articles: generatedArticles
  };
}
