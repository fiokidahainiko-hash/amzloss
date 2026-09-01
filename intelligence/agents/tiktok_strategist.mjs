/* AmzLoss Specialized AI Agent: TikTok Strategist
   Responsible for: Topic selection, hooks, angles, retention strategy, video structure. */

import { runAgentTask } from "./agent_runner.mjs";
import { getTikTokContext } from "../memory/retriever.mjs";

export async function runTikTokStrategist({ topic, targetAudience = "Amazon Affiliates" }) {
  const context = getTikTokContext({ topic });

  const systemPrompt = `You are the TikTok Strategist for AmzLoss.
Your job is to select the strongest angle and create 3 high-retention hooks for a 22-second short-form video.
RULES:
1. NEVER use generic intros like 'Hey guys, today we are going to talk about...'.
2. Hooks must leverage tension, data shock, rate cuts, or hidden earnings loss.
3. Define retention plan (pattern interrupt every 2.5s).
Return JSON format with keys: topic, selected_angle, hooks (array of 3 { hook_type, hook_text, visual_trigger }), target_audience, structure_plan.`;

  const userPrompt = `Video Topic: "${topic}"
Target Audience: ${targetAudience}
Hook Formulas Context: ${JSON.stringify(context.hook_formulas)}
Banned Intros: ${JSON.stringify(context.banned_intros)}

Develop the TikTok video strategy. Return valid JSON only.`;

  return runAgentTask({
    role: "reasoning",
    agentName: "TikTokStrategist",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => ({
      topic,
      selected_angle: "The Hidden Commission Loss (Data Discrepancy Reveal)",
      hooks: [
        {
          hook_type: "Data Shock",
          hook_text: `If you referred a $100 sale on Amazon, you probably assumed you earned $4. Stop guessing — here's why your payout was actually $1.60.`,
          visual_trigger: "High contrast red alert card with $4.00 slashed out to $1.60."
        },
        {
          hook_type: "Tension & Rate Cut",
          hook_text: `Amazon quietly reduced category commission rates in 2026. Here is the 10-second test to see how much revenue you lost.`,
          visual_trigger: "Side-by-side category rate table highlighting 2026 drops."
        },
        {
          hook_type: "Problem & Fix",
          hook_text: `Stop publishing Amazon URLs with messy tracking parameters that get stripped. Do this clean link fix instead.`,
          visual_trigger: "Close-up comparison of bare Amazon link vs clean tagged link."
        }
      ],
      target_audience: targetAudience,
      structure_plan: {
        "0-3s": "Hook text + visual shock card",
        "3-8s": "Explain the rate math / discount trap",
        "8-15s": "Demonstrate AmzLoss tool in action",
        "15-20s": "Key takeaway summary",
        "20-22s": "Call to Action to visit AmzLoss.com"
      }
    })
  });
}
