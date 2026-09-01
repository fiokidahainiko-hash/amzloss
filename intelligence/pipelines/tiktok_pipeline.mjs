/* AmzLoss Content Intelligence — TikTok Pipeline
   Executes the 11-step TikTok Workflow:
   Topic Research -> Intent -> Hooks -> Hook selection -> Script -> Scene breakdown -> Visual directions -> Caption/Overlay -> TikTok SEO -> Quality evaluation -> Revision -> Final Script */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runTikTokStrategist } from "../agents/tiktok_strategist.mjs";
import { runTikTokScriptWriter } from "../agents/tiktok_script_writer.mjs";
import { runVideoDirector } from "../agents/video_director.mjs";
import { runVideoQualityJudge } from "../agents/video_quality_judge.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAdminConfig() {
  try {
    const configPath = path.join(__dirname, "..", "config", "admin_config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    }
  } catch (e) {}
  return { quality_thresholds: { tiktok: { approved_min: 85, revision_min: 70, max_revisions: 2 } } };
}

export async function runTikTokPipeline({ topic, targetAudience = "Amazon Affiliates" }) {
  const adminConfig = loadAdminConfig();
  const thresholds = adminConfig.quality_thresholds.tiktok;

  console.log(`\n==================================================`);
  console.log(`[TikTok Pipeline] Starting run for: "${topic}"`);
  console.log(`==================================================\n`);

  // Step 1-4: Strategy & Hook Selection
  console.log(`[Step 1-4] Running TikTok Strategist...`);
  const strategy = await runTikTokStrategist({ topic, targetAudience });

  // Step 5: Script Generation
  console.log(`[Step 5] Running TikTok Script Writer...`);
  let script = await runTikTokScriptWriter({ strategyData: strategy, topic });

  // Step 6-9: Scene Breakdown, Visual Directions, Caption Plan & TikTok SEO
  console.log(`[Step 6-9] Running Video Director...`);
  let directorBlueprint = await runVideoDirector({ scriptData: script });

  // Step 10-11: Quality Evaluation & Revision Loop
  let evaluation = null;
  let revisions = 0;
  const maxRevisions = thresholds.max_revisions || 2;

  while (revisions <= maxRevisions) {
    console.log(`[Step 10] Running Video Quality Judge (Iteration ${revisions + 1})...`);
    evaluation = await runVideoQualityJudge({ scriptData: script, directorData: directorBlueprint });
    console.log(`[TikTok Quality Score] Score: ${evaluation.overall_score}/100 (Status: ${evaluation.status})`);

    if (evaluation.overall_score >= thresholds.approved_min) {
      console.log(`[Approval] Script met threshold (>=${thresholds.approved_min}). APPROVED!`);
      break;
    }

    if (evaluation.overall_score >= thresholds.revision_min && revisions < maxRevisions) {
      revisions++;
      console.log(`[Revision] Score ${evaluation.overall_score} requires revision. Applying feedback...`);
      // Re-run script writer with revision feedback
      script = await runTikTokScriptWriter({
        strategyData: { ...strategy, revision_instructions: evaluation.revision_instructions },
        topic
      });
      directorBlueprint = await runVideoDirector({ scriptData: script });
    } else {
      if (evaluation.overall_score < thresholds.revision_min) {
        console.warn(`[Quality Warning] Score ${evaluation.overall_score} below threshold (${thresholds.revision_min}). Regenerating...`);
        script = await runTikTokScriptWriter({ strategyData: strategy, topic });
        directorBlueprint = await runVideoDirector({ scriptData: script });
        revisions++;
      } else {
        console.log(`[Max Revisions Reached] Accepting script with score ${evaluation.overall_score}.`);
        break;
      }
    }
  }

  const finalResult = {
    topic,
    strategy,
    script,
    director_blueprint: directorBlueprint,
    evaluation,
    approved: evaluation.overall_score >= thresholds.approved_min
  };

  console.log(`\n==================================================`);
  console.log(`[TikTok Pipeline Complete] Score: ${evaluation.overall_score}/100 | Approved: ${finalResult.approved}`);
  console.log(`==================================================\n`);

  return finalResult;
}
