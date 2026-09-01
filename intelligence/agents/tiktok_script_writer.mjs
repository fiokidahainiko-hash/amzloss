/* AmzLoss Specialized AI Agent: TikTok Script Writer
   Responsible for: Writing short-form scripts, voiceover narration, visual cues, pacing, CTA. */

import { runAgentTask } from "./agent_runner.mjs";
import { getTikTokContext } from "../memory/retriever.mjs";

export async function runTikTokScriptWriter({ strategyData, topic }) {
  const context = getTikTokContext({ topic });

  const systemPrompt = `You are the TikTok Script Writer for AmzLoss.
Write a crisp 20-22 second voiceover script (50-60 words total) based on the strategy.
RULES:
1. First 3 seconds MUST use the chosen hook without any fluff intro.
2. Pacing: 150-170 words per minute cadence.
3. Voiceover must pair cleanly with on-screen visual triggers.
4. CTA must direct users to AmzLoss.com for free browser-only tools.
Return JSON format with keys: title, chosen_hook, full_voiceover_text, word_count, estimated_duration_sec, scene_script (array of { time_range, voiceover, visual_action, text_overlay }).`;

  const userPrompt = `Strategy Data: ${JSON.stringify(strategyData)}
TikTok SEO Context: ${JSON.stringify(context.tiktok_seo)}

Write the full TikTok script JSON.`;

  return runAgentTask({
    role: "writing",
    agentName: "TikTokScriptWriter",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => {
      const hookText = strategyData?.hooks?.[0]?.hook_text || `If you referred a $100 sale on Amazon, your payout might be $1.60 instead of $4.`;
      const fullText = `${hookText} Amazon calculates commission on the order amount after discounts, not the sticker price. Plus, 2026 category rate cuts shrunk margins further. Run your earnings report through AmzLoss to audit underpayments for free. Link in bio!`;

      return {
        title: `${topic || "Amazon Affiliate Commission"} Explained`,
        chosen_hook: hookText,
        full_voiceover_text: fullText,
        word_count: fullText.split(/\s+/).length,
        estimated_duration_sec: 21,
        scene_script: [
          {
            time_range: "0-3s",
            voiceover: hookText,
            visual_action: "Show red alert card with $4.00 slashed out to $1.60",
            text_overlay: "$4.00 ➔ $1.60? WHY YOUR PAYOUT DROPPED"
          },
          {
            time_range: "3-8s",
            voiceover: "Amazon calculates commission on the order amount after discounts, not the sticker price.",
            visual_action: "Highlight eligible order math equation on screen",
            text_overlay: "Eligible Price = Sticker Price - Discounts"
          },
          {
            time_range: "8-15s",
            voiceover: "Plus, 2026 category rate cuts shrunk margins further. Run your report through AmzLoss to audit underpayments.",
            visual_action: "Show AmzLoss audit interface processing CSV in browser",
            text_overlay: "Free Browser-Only Earnings Audit"
          },
          {
            time_range: "15-22s",
            voiceover: "Check your true earnings at AmzLoss.com today!",
            visual_action: "Show logo slate + domain AmzLoss.com",
            text_overlay: "AmzLoss.com | Free Webmaster Tools"
          }
        ]
      };
    }
  });
}
