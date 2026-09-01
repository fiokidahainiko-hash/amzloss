/* AmzLoss Specialized AI Agent: Video Director
   Responsible for: Scene-by-scene visual instructions, B-roll, motion, text overlays, transitions, pattern interrupts. */

import { runAgentTask } from "./agent_runner.mjs";

export async function runVideoDirector({ scriptData }) {
  const systemPrompt = `You are the Video Director for AmzLoss short-form video production.
Your job is to take a TikTok script and specify exact 60fps technical render directives (1080x1920 vertical format).
REQUIREMENTS:
1. Pattern Interrupts every 2.5s (zoompan, color flash, text pulse, screenshot swap).
2. Safe Zones: Text overlays must stay between Y=160 and Y=1760.
3. Sound Effects: Specify transition SFX (whoosh, thump, riser, chime).
4. Palettes: Assign tool color theme (bg, accent, alt).
Return JSON format with keys: format_template, palette_theme, resolution, safe_zones, scenes (array of { id, duration_sec, visual_element, camera_motion, text_overlay, text_style, sfx_cue, pattern_interrupt }).`;

  const userPrompt = `TikTok Script Data: ${JSON.stringify(scriptData)}

Generate the scene-by-scene technical video production blueprint. Return valid JSON only.`;

  return runAgentTask({
    role: "reasoning",
    agentName: "VideoDirector",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => ({
      format_template: "educational_data_reveal",
      palette_theme: {
        bg: [10, 16, 38],
        accent: [70, 130, 255],
        alt: [120, 210, 255]
      },
      resolution: "1080x1920 @ 60fps",
      safe_zones: { top_px: 160, bottom_px: 1760 },
      scenes: [
        {
          id: "scene_01",
          duration_sec: 3.0,
          visual_element: "Red alert problem card with glowing border",
          camera_motion: "Fast 1.2x zoom-in punch",
          text_overlay: "$4.00 ➔ $1.60?\nYOUR PAYOUT DROPPED",
          text_style: "Bold Yellow #FFC83C on Dark Purple",
          sfx_cue: "synth_thump.wav",
          pattern_interrupt: "Color flash at 0.5s + text bounce"
        },
        {
          id: "scene_02",
          duration_sec: 5.0,
          visual_element: "Order math equation breakdown card",
          camera_motion: "Slow downward pan",
          text_overlay: "Eligible Price =\nSticker Price - Discounts",
          text_style: "White #FFFFFF with 4px dark shadow",
          sfx_cue: "whoosh_light.wav",
          pattern_interrupt: "Highlight box pulse at 2.5s"
        },
        {
          id: "scene_03",
          duration_sec: 7.0,
          visual_element: "AmzLoss Audit tool interface card with animated CSV row highlight",
          camera_motion: "Horizontal slide transition from right",
          text_overlay: "Audit Underpayments\nFree Browser-Only Tool",
          text_style: "Green #46DC82 on Charcoal background",
          sfx_cue: "chime_soft.wav",
          pattern_interrupt: "Row scan animation at 10.0s"
        },
        {
          id: "scene_04",
          duration_sec: 6.0,
          visual_element: "AmzLoss brand logo + domain callout slate",
          camera_motion: "Static hero slate with glowing halo",
          text_overlay: "AmzLoss.com\nFree Webmaster & Affiliate Tools",
          text_style: "Brand Purple #4B286D & Accent Green #2B8000",
          sfx_cue: "riser_finish.wav",
          pattern_interrupt: "Open loop question prompt"
        }
      ]
    })
  });
}
