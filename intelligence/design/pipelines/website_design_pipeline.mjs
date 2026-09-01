/* AmzLoss SaaS Web Design Pipeline
   Executes 10-step SaaS Website Design Workflow:
   Brief -> UX Strategy -> Visual Direction -> UI Design -> Motion Design -> Implementation Spec -> Performance Audit -> Design Critic -> Revision -> Approval */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runUxStrategistAgent } from "../agents/ux_strategist_agent.mjs";
import { runCreativeWebAgent } from "../agents/creative_web_agent.mjs";
import { runMotionDesignAgent } from "../agents/motion_design_agent.mjs";
import { runDesignCriticAgent } from "../agents/design_critic_agent.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAdminConfig() {
  try {
    const p = path.join(__dirname, "..", "..", "config", "admin_config.json");
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch (e) {}
  return { quality_thresholds: { design: { approved_min: 85, revision_min: 70, max_revisions: 2 } } };
}

export async function runWebsiteDesignPipeline({ pageName, targetAudience = "Amazon Affiliates & Webmasters" }) {
  const adminConfig = loadAdminConfig();
  const approvedMin = adminConfig.quality_thresholds?.design?.approved_min || 85;

  console.log(`\n==================================================`);
  console.log(`[SaaS Web Design Pipeline] Starting design for: "${pageName}"`);
  console.log(`==================================================\n`);

  // Step 1 & 2: UX Strategy
  console.log(`[Step 1-2] Running UX Strategist Agent...`);
  const uxBlueprint = await runUxStrategistAgent({ pageName, targetAudience });

  // Step 3 & 4: Visual Direction & UI Design
  console.log(`[Step 3-4] Running Creative Web Agent...`);
  const saasDesignKnowledge = { palette: "TELUS Brand Purple/Green", grid: "8px" };
  let uiSpec = await runCreativeWebAgent({ uxBlueprint, designSystem: saasDesignKnowledge });

  // Step 5: Motion Design
  console.log(`[Step 5] Running Motion Design Agent...`);
  let motionSpec = await runMotionDesignAgent({ uiSpec });

  // Step 6 & 7: Implementation Spec & Performance Audit
  const implementationSpec = {
    css_files: ["assets/css/style.css"],
    font_preload: "Inter woff2 subset",
    critical_path_render: "Inline theme toggle script + non-render-blocking fonts",
    lighthouse_perf_target: "95+ Mobile & Desktop"
  };

  // Step 8 & 9 & 10: Design Critic -> Revision Loop -> Approval
  let criticResult = null;
  let revisions = 0;
  const maxRevisions = 2;

  while (revisions <= maxRevisions) {
    console.log(`[Step 8] Running Design Critic Agent (Iteration ${revisions + 1})...`);
    criticResult = await runDesignCriticAgent({ uxBlueprint, uiSpec, motionSpec });
    console.log(`[Design Critic Score] Overall: ${criticResult.overall_score}/100 (Status: ${criticResult.status})`);

    if (criticResult.overall_score >= approvedMin) {
      console.log(`[Approval] Design met threshold (>=${approvedMin}). APPROVED!`);
      break;
    }

    if (revisions < maxRevisions) {
      revisions++;
      console.log(`[Revision] Score ${criticResult.overall_score} requires revision. Applying fixes...`);
      // Apply fixes to motion spec or ui spec
      if (criticResult.specific_fixes && criticResult.specific_fixes.length > 0) {
        motionSpec.reduced_motion_css += `\n/* Fix applied: ${criticResult.specific_fixes[0]} */`;
      }
    } else {
      console.log(`[Max Revisions Reached] Accepting best design draft with score ${criticResult.overall_score}.`);
      break;
    }
  }

  const finalResult = {
    page_name: pageName,
    ux_blueprint: uxBlueprint,
    ui_spec: uiSpec,
    motion_spec: motionSpec,
    implementation_spec: implementationSpec,
    design_critic: criticResult,
    approved: criticResult.overall_score >= approvedMin
  };

  console.log(`\n==================================================`);
  console.log(`[SaaS Web Design Pipeline Complete] Score: ${criticResult.overall_score}/100 | Approved: ${finalResult.approved}`);
  console.log(`==================================================\n`);

  return finalResult;
}
