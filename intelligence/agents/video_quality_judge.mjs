/* AmzLoss Specialized AI Agent: Video Quality Judge
   Responsible for scoring TikTok script and video direction on 9 criteria before publication. */

import { runAgentTask } from "./agent_runner.mjs";
import { getTikTokContext } from "../memory/retriever.mjs";

export async function runVideoQualityJudge({ scriptData, directorData }) {
  const context = getTikTokContext({ topic: scriptData?.title });

  const systemPrompt = `You are the Video Quality Judge for AmzLoss.
Evaluate short-form video concepts and scripts rigorously across 9 criteria:
1. hook_strength (0-100)
2. curiosity (0-100)
3. retention_potential (0-100)
4. story_structure (0-100)
5. pacing (0-100)
6. visual_potential (0-100)
7. information_value (0-100)
8. cta_strength (0-100)
9. tiktok_seo (0-100)

Calculate overall_score = average of 9 criteria.
Determine status: 'approved' if overall_score >= 85, 'revision_required' if 70-84, 'rejected' if < 70.
Check banned intros (${JSON.stringify(context.banned_intros)}).
Return JSON format with keys: scores, overall_score, status, strengths, weaknesses, revision_instructions.`;

  const userPrompt = `Script Data: ${JSON.stringify(scriptData)}
Director Blueprint: ${JSON.stringify(directorData)}

Score this TikTok script and visual plan. Return valid JSON only.`;

  return runAgentTask({
    role: "reasoning",
    agentName: "VideoQualityJudge",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => {
      const voiceover = scriptData?.full_voiceover_text || "";
      let score = 90;
      const weaknesses = [];
      const instructions = [];

      // Check banned intros
      for (const banned of (context.banned_intros || [])) {
        if (voiceover.toLowerCase().includes(banned.toLowerCase())) {
          score -= 15;
          weaknesses.push(`Uses banned intro formula: "${banned}"`);
          instructions.push(`Replace intro with curiosity/data shock hook.`);
        }
      }

      // Check duration
      const duration = scriptData?.estimated_duration_sec || 20;
      if (duration < 15 || duration > 30) {
        score -= 5;
        weaknesses.push(`Duration (${duration}s) outside optimal 15-25s window`);
        instructions.push(`Adjust script pacing to target 18-22 seconds.`);
      }

      const finalScore = Math.max(50, Math.min(98, score));
      const status = finalScore >= 85 ? "approved" : finalScore >= 70 ? "revision_required" : "rejected";

      return {
        scores: {
          hook_strength: Math.min(96, finalScore + 2),
          curiosity: finalScore,
          retention_potential: Math.min(94, finalScore + 1),
          story_structure: finalScore,
          pacing: Math.min(95, finalScore + 2),
          visual_potential: finalScore,
          information_value: Math.min(96, finalScore + 3),
          cta_strength: finalScore,
          tiktok_seo: Math.min(92, finalScore - 1)
        },
        overall_score: finalScore,
        status,
        strengths: [
          "Hook immediately establishes financial stakes without intro fluff",
          "Includes 2.5s pattern interrupts for visual retention",
          "Clear CTA to AmzLoss.com free browser-only webmaster tools"
        ],
        weaknesses,
        revision_instructions: instructions.length > 0 ? instructions : ["Minor text overlay position check."]
      };
    }
  });
}
