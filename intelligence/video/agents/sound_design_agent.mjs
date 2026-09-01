/* AmzLoss Specialized Agent: Sound Design Agent
   Generates sound design audio cue sheet for short-form video production. */

import { runAgentTask } from "../../agents/agent_runner.mjs";

export async function runSoundDesignAgent({ storyboardData }) {
  const systemPrompt = `You are the Sound Designer for AmzLoss Video Production.
Your job is to generate a precise audio cue sheet matching visual events, kinetic text popups, and transitions.
RULES:
1. Specify exact time offsets (in seconds) for each SFX event.
2. Mix levels: Voiceover -0dB, SFX -6dB, Music Bed -14dB.
3. Recommend ambient sound style.
Return JSON format with keys: ambient_bed_style, ducking_rules, audio_cues (array of { time_sec, sfx_name, cue_type, peak_level_db, visual_sync_event }).`;

  const userPrompt = `Storyboard Data: ${JSON.stringify(storyboardData)}

Generate the complete Sound Design Cue Sheet. Return valid JSON only.`;

  return runAgentTask({
    role: "video",
    agentName: "SoundDesignAgent",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => ({
      ambient_bed_style: "Modern Tech Electronic Synth (120 BPM) with subtle bass pulse",
      ducking_rules: "Compressor side-chained to voiceover track with -12dB attenuation, 50ms attack, 200ms release.",
      audio_cues: [
        { time_sec: 0.0, sfx_name: "synth_thump.wav", cue_type: "sub_impact", peak_level_db: -6, visual_sync_event: "Red alert card appearance" },
        { time_sec: 2.5, sfx_name: "whoosh_fast.wav", cue_type: "transition_swish", peak_level_db: -8, visual_sync_event: "Whip pan to math card" },
        { time_sec: 8.0, sfx_name: "chime_success.wav", cue_type: "solution_chime", peak_level_db: -6, visual_sync_event: "AmzLoss Dashboard reveal" },
        { time_sec: 14.5, sfx_name: "ui_click_soft.wav", cue_type: "ui_feedback", peak_level_db: -10, visual_sync_event: "Audit button click demo" },
        { time_sec: 16.5, sfx_name: "riser_finish.wav", cue_type: "cta_crescendo", peak_level_db: -4, visual_sync_event: "Final logo & domain slate" }
      ]
    })
  });
}
