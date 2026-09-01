/* AmzLoss Specialized Agent: Storyboard & Motion Production Agent
   Generates scene-by-scene production specs (kinetic typography, visual graphics, camera motion, transitions, SFX, background music). */

import { runAgentTask } from "../../agents/agent_runner.mjs";

export async function runStoryboardAgent({ winningConcept, topic }) {
  const systemPrompt = `You are the Lead Storyboard & Motion Production Designer for AmzLoss.
Your task is to transform a winning creative video concept into a full, production-ready 60fps vertical storyboard (1080x1920).
PRODUCTION RULES:
1. Do NOT use static screenshots as primary visual. Use kinetic typography, animated numbers, visual metaphors, or dynamic UI motion graphics.
2. Structure: PROBLEM ➔ TENSION ➔ DISCOVERY ➔ PRODUCT ➔ TRANSFORMATION ➔ PROOF ➔ CTA.
3. Every scene MUST specify: scene_id, duration_sec, voiceover_text, kinetic_text_overlay, visual_graphics_description, camera_motion, transition_effect, sfx_cue, music_bed_level.
Return JSON format with keys: concept_title, total_duration_sec, style_theme, scenes (array).`;

  const userPrompt = `Winning Concept: ${JSON.stringify(winningConcept)}
Topic: "${topic}"

Generate the complete scene-by-scene technical storyboard blueprint. Return valid JSON only.`;

  return runAgentTask({
    role: "video",
    agentName: "StoryboardAgent",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => ({
      concept_title: winningConcept?.title || "The Evaporating Commission",
      total_duration_sec: 22,
      style_theme: "Dark Premium SaaS (Deep Slate #0D0E12 + Electric Purple #7A4BB8)",
      scenes: [
        {
          scene_id: "scene_01",
          duration_sec: 3.5,
          narrative_phase: "PROBLEM",
          voiceover_text: "If you referred a $100 sale on Amazon, your payout might be $1.60 instead of $4.00.",
          kinetic_text_overlay: "$100 SALE ➔ $1.60 PAYOUT?\nWHERE DID THE $2.40 GO?",
          visual_graphics_description: "3D animated $100 dollar bill crumbling into $1.60 coins under a glowing red spotlight",
          camera_motion: "Fast 1.25x zoom-in punch with subtle camera shake",
          transition_effect: "Color flash pulse + whip pan right",
          sfx_cue: "synth_thump.wav",
          music_bed_level: "-12dB sub-bass tension synth"
        },
        {
          scene_id: "scene_02",
          duration_sec: 4.5,
          narrative_phase: "TENSION",
          voiceover_text: "Amazon calculates commission on the order amount after discounts and excluded fees, not sticker price.",
          kinetic_text_overlay: "ORDER MATH EXPOSED:\nSticker Price - Discounts = Eligible Base",
          visual_graphics_description: "Animated math equation card with discount slider shrinking the eligible price bar",
          camera_motion: "Smooth downward tilt",
          transition_effect: "Crossfade blur",
          sfx_cue: "whoosh_fast.wav",
          music_bed_level: "-14dB rhythmic beat"
        },
        {
          scene_id: "scene_03",
          duration_sec: 6.0,
          narrative_phase: "DISCOVERY & PRODUCT",
          voiceover_text: "Plus, 2026 category rate cuts hit margins hard. AmzLoss audits your earnings CSV in 5 seconds.",
          kinetic_text_overlay: "AMZLOSS EARNINGS AUDIT\n100% Free • Browser-Only",
          visual_graphics_description: "Cinematic 3D render of AmzLoss Audit dashboard with scan line highlighting underpaid rows",
          camera_motion: "Horizontal orbit camera pan",
          transition_effect: "Light leak zoom transition",
          sfx_cue: "chime_success.wav",
          music_bed_level: "-12dB uplifting synth melody"
        },
        {
          scene_id: "scene_04",
          duration_sec: 5.5,
          narrative_phase: "PROOF & CTA",
          voiceover_text: "Stop guessing your payout. Run your free audit at AmzLoss.com today!",
          kinetic_text_overlay: "Audit Your Earnings Now\nAmzLoss.com",
          visual_graphics_description: "Glowing hero slate featuring AmzLoss logo and domain URL with pulse animation",
          camera_motion: "Slow pull-back reveal",
          transition_effect: "Fade to black open loop",
          sfx_cue: "riser_finish.wav",
          music_bed_level: "-10dB peak crescendo"
        }
      ]
    })
  });
}
