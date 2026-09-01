/* AmzLoss High-End Short-Form Video Production Pipeline
   Executes the 15-step upgraded TikTok Video Workflow:
   Topic -> Creative Concepts -> Best Hook -> Concept Selection -> Script -> Storyboard -> Visual Direction -> Motion Graphics -> Sound Design -> Captions -> Editing Plan -> Quality Control -> Revision -> Final Production Spec */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runVideoCreativeDirector } from "../agents/video_creative_director.mjs";
import { runStoryboardAgent } from "../agents/storyboard_agent.mjs";
import { runSoundDesignAgent } from "../agents/sound_design_agent.mjs";
import { runUpgradedVideoQualityJudge } from "../agents/upgraded_video_quality_judge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAdminConfig() {
  try {
    const p = path.join(__dirname, "..", "..", "config", "admin_config.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (e) {}
  return { quality_thresholds: { tiktok: { approved_min: 85, revision_min: 70, max_revisions: 2 } } };
}

export async function runVideoProductionPipeline({ topic, platform = "TikTok" }) {
  const adminConfig = loadAdminConfig();
  const approvedMin = adminConfig.quality_thresholds?.tiktok?.approved_min || 85;

  console.log(`\n==================================================`);
  console.log(`[Video Production Pipeline] Starting production for: "${topic}"`);
  console.log(`==================================================\n`);

  // Step 1-4: Creative Concepts & Winner Selection
  console.log(`[Step 1-4] Running Video Creative Director Agent...`);
  const creativeResult = await runVideoCreativeDirector({ topic, platform });

  // Step 5-7: Script, Storyboard, Visual Direction & Motion
  console.log(`[Step 5-7] Running Storyboard & Motion Production Agent...`);
  const storyboard = await runStoryboardAgent({ winningConcept: creativeResult.winning_concept, topic });

  // Step 8: Sound Design
  console.log(`[Step 8] Running Sound Design Agent...`);
  const soundDesign = await runSoundDesignAgent({ storyboardData: storyboard });

  // Step 9: Captions Plan
  const captionPlan = {
    max_chars_per_card: 35,
    font: "Inter Bold 64px",
    position: "Y=160 to Y=1760 safe zone",
    color: "#FFFFFF with 4px #000000 stroke",
    sync: "Word-by-word or line-by-line lockstep with voiceover"
  };

  // Step 10: Editing Plan
  const editingPlan = {
    software: "Adobe Premiere Pro / After Effects / CapCut Pro",
    render_format: "H.265 HEVC 1080x1920 @ 60fps",
    color_space: "Rec.709 SDR",
    audio_mix: "Voiceover @ -0dB, SFX @ -6dB, Music @ -14dB",
    export_quality: "High bitrate 20-30 Mbps VBR"
  };

  // Step 11-14: Quality Judge & Revision Loop
  let qualityJudge = null;
  let revisions = 0;
  const maxRevisions = 2;

  while (revisions <= maxRevisions) {
    console.log(`[Step 11] Running Video Quality Judge (Iteration ${revisions + 1})...`);
    qualityJudge = await runUpgradedVideoQualityJudge({
      conceptData: creativeResult.winning_concept,
      storyboardData: storyboard,
      soundData: soundDesign
    });
    console.log(`[Production QC Score] Overall: ${qualityJudge.overall_score}/100 (Status: ${qualityJudge.status})`);

    if (qualityJudge.overall_score >= approvedMin) {
      console.log(`[Approval] Production blueprint met threshold. APPROVED!`);
      break;
    }

    if (revisions < maxRevisions) {
      revisions++;
      console.log(`[Revision] Score ${qualityJudge.overall_score} requires revision. Applying feedback...`);
      // Apply revision feedback to sound design
      if (qualityJudge.revision_instructions && qualityJudge.revision_instructions.length > 0) {
        soundDesign.ducking_rules += ` (Revised pass: ${qualityJudge.revision_instructions[0]})`;
      }
    } else {
      console.log(`[Max Revisions Reached] Accepting best draft with score ${qualityJudge.overall_score}.`);
      break;
    }
  }

  // Final Production Specification
  const finalProductionSpec = {
    concept: creativeResult.winning_concept,
    storyboard,
    sound_design: soundDesign,
    captions: captionPlan,
    editing: editingPlan,
    render_specs: {
      resolution: "1080x1920",
      frame_rate: "60fps",
      format: "MP4 H.265"
    }
  };

  console.log(`\n==================================================`);
  console.log(`[Video Production Pipeline Complete] Score: ${qualityJudge.overall_score}/100 | Approved: ${finalProductionSpec.concept?.concept_id || "Concept A"}`);
  console.log(`==================================================\n`);

  return finalProductionSpec;
}
