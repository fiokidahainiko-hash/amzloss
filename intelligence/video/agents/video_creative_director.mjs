/* AmzLoss Specialized Agent: Video Creative Director Agent
   Generates 3-5 distinct creative concepts per video topic.
   Scores each concept across 6 criteria (Hook, Curiosity, Novelty, Visual Potential, Retention, Product Relevance).
   Selects the strongest concept for production. */

import { runAgentTask } from "../../agents/agent_runner.mjs";

export async function runVideoCreativeDirector({ topic, platform = "TikTok" }) {
  const systemPrompt = `You are the Executive Creative Director for AmzLoss Short-Form Video Production.
When assigned a video topic:
1. Generate 3 to 5 distinct creative concepts (e.g. Concept A: 'Money Disappearing', Concept B: 'The Hidden Rate Cut', Concept C: 'Before vs After', Concept D: 'AI Investigates Report', Concept E: 'One Number Exposes Problem').
2. Do NOT treat static website screenshots as the primary visual concept. Use motion graphics, kinetic typography, animated numbers, visual metaphors, or cinematic product reveals.
3. Score each concept (0-100) on: hook, curiosity, novelty, visual_potential, retention, product_relevance.
4. Select the highest-scoring concept as the winning concept for production.
Return JSON format with keys: topic, generated_concepts (array of 3-5 { concept_id, title, visual_metaphor, story_angle, scores, total_score }), winning_concept.`;

  const userPrompt = `Video Topic: "${topic}"
Target Platform: ${platform}

Generate 3-5 distinct creative concepts and select the winner. Return valid JSON only.`;

  return runAgentTask({
    role: "creative",
    agentName: "VideoCreativeDirector",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => {
      const concepts = [
        {
          concept_id: "Concept A",
          title: "Money Disappearing (The Evaporating Commission)",
          visual_metaphor: "A $100 dollar bill animation crumbling into $1.60 coins under a magnifying glass.",
          story_angle: "Exposing how discounts silently shrink Amazon affiliate payouts before payment.",
          scores: { hook: 94, curiosity: 92, novelty: 95, visual_potential: 96, retention: 94, product_relevance: 95 },
          total_score: 94.3
        },
        {
          concept_id: "Concept B",
          title: "The 2026 Rate Cut Investigation",
          visual_metaphor: "Red laser scan across category rate tables highlighting 2026 drops.",
          story_angle: "Urgent rate alert showing webmasters how to check if they were underpaid.",
          scores: { hook: 90, curiosity: 88, novelty: 86, visual_potential: 90, retention: 89, product_relevance: 94 },
          total_score: 89.5
        },
        {
          concept_id: "Concept C",
          title: "Before vs After Link Hygiene",
          visual_metaphor: "Messy 200-character Amazon URL morphing into a clean, tagged nofollow sponsored link.",
          story_angle: "Step-by-step fix for affiliate link tracking and FTC compliance.",
          scores: { hook: 86, curiosity: 85, novelty: 88, visual_potential: 89, retention: 87, product_relevance: 92 },
          total_score: 87.8
        }
      ];

      // Sort by total_score descending
      concepts.sort((a, b) => b.total_score - a.total_score);

      return {
        topic,
        generated_concepts: concepts,
        winning_concept: concepts[0]
      };
    }
  });
}
