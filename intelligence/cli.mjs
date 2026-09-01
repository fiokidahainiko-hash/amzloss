#!/usr/bin/env node
/* AmzLoss AI Content Intelligence System — CLI Tool (v2.0.0) */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runBlogPipeline } from "./pipelines/blog_pipeline.mjs";
import { runTikTokPipeline } from "./pipelines/tiktok_pipeline.mjs";
import { runTopicClusterPipeline } from "./pipelines/topic_cluster_pipeline.mjs";
import { runInternalLinkingPipeline } from "./pipelines/internal_linking_pipeline.mjs";

import { runWebsiteDesignPipeline } from "./design/pipelines/website_design_pipeline.mjs";
import { runVideoProductionPipeline } from "./video/pipelines/video_production_pipeline.mjs";

import { loadJson, saveJson } from "./utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.join(__dirname, "config");
const MEMORY_DIR = path.join(__dirname, "memory");

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";
  const flags = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      flags[key] = value !== undefined ? value : true;
    }
  }
  return { command, flags };
}

async function main() {
  const { command, flags } = parseArgs();

  console.log(`\n🤖 AMZLOSS AI CONTENT INTELLIGENCE SYSTEM v2.0.0`);
  console.log(`==================================================`);

  switch (command) {
    case "blog": {
      const keyword = flags.keyword || "Amazon Commission Cuts 2026";
      const autoPublish = flags.publish === true || flags.publish === "true";
      console.log(`Running Blog Pipeline for keyword: "${keyword}"...`);
      const result = await runBlogPipeline({ keyword, autoPublish });
      console.log(`\nBLOG RESULT: "${result.article.title}" | Score: ${result.evaluation.overall_score}/100 | Published: ${result.published}`);
      break;
    }

    case "tiktok": {
      const topic = flags.topic || "4% Commission Trap";
      console.log(`Running TikTok Pipeline for topic: "${topic}"...`);
      const result = await runTikTokPipeline({ topic });
      console.log(`\nTIKTOK RESULT: Hook: "${result.script.chosen_hook}" | Score: ${result.evaluation.overall_score}/100`);
      break;
    }

    case "cluster": {
      const topic = flags.topic || "Amazon Affiliate Marketing";
      const action = flags.action || "recommend";
      console.log(`Running Topic Cluster for: "${topic}"...`);
      const result = await runTopicClusterPipeline({ topic, action });
      console.log(`\nCLUSTER RESULT: Pillar "${result.pillar_topic}" | Supporting Topics: ${result.supporting_topics.length}`);
      break;
    }

    case "linking": {
      console.log(`Running Site-Wide Internal Linking Audit...`);
      const result = await runInternalLinkingPipeline();
      console.log(`\nLINKING RESULT: Health Score: ${result.linking_health_score}/100 | Orphan Pages: ${result.orphan_pages.length}`);
      break;
    }

    // --- NEW UPGRADED COMMANDS ---

    case "design": {
      const page = flags.page || "Amazon Commission Calculator";
      console.log(`Running SaaS Web Design Pipeline for: "${page}"...`);
      const result = await runWebsiteDesignPipeline({ pageName: page });
      console.log(`\nDESIGN RESULT: UX Primary Action: "${result.ux_blueprint.primary_action}" | Design Critic Score: ${result.design_critic.overall_score}/100`);
      break;
    }

    case "video-pro": {
      const topic = flags.topic || "The Evaporating Commission";
      console.log(`Running High-End Video Production Pipeline for: "${topic}"...`);
      const result = await runVideoProductionPipeline({ topic });
      console.log(`\nVIDEO-PRO RESULT: Winner Concept: "${result.concept.title}" | Visuals: ${result.storyboard.style_theme}`);
      break;
    }

    // --- EXISTING COMMANDS (Unmodified) ---

    case "example": {
      const sub = flags.action || "list";
      const examplesPath = path.join(MEMORY_DIR, "approved_examples.json");
      const examples = loadJson(examplesPath, []);
      if (sub === "add") {
        examples.push({ id: `ex-${Date.now()}`, content_type: flags.type, status: flags.status, title: flags.title, score: flags.status === "approved" ? 92 : 62, reasoning: flags.reason });
        saveJson(examplesPath, examples);
        console.log(`✅ Example added: "${flags.title}" (${flags.status})`);
      } else {
        console.log(`\nAPPROVED / REJECTED EXAMPLES (${examples.length}):`);
        examples.forEach((ex, i) => console.log(`  ${i + 1}. [${ex.status.toUpperCase()}] ${ex.title} (${ex.content_type}) Score: ${ex.score}`));
      }
      break;
    }

    case "admin": {
      const adminPath = path.join(CONFIG_DIR, "admin_config.json");
      const adminConfig = loadJson(adminPath, {});
      if (flags["threshold-blog"]) adminConfig.quality_thresholds.blog.approved_min = parseInt(flags["threshold-blog"], 10);
      if (flags["threshold-design"]) adminConfig.quality_thresholds.design = { approved_min: parseInt(flags["threshold-design"], 10) };
      saveJson(adminPath, adminConfig);
      console.log(`\nADMIN CONFIG: ${JSON.stringify(adminConfig, null, 2)}`);
      break;
    }

    default: {
      console.log(`\nUSAGE:`);
      console.log(`  node intelligence/cli.mjs blog --keyword="..." [--publish=true]`);
      console.log(`  node intelligence/cli.mjs tiktok --topic="..."`);
      console.log(`  node intelligence/cli.mjs cluster --topic="..."`);
      console.log(`  node intelligence/cli.mjs linking`);
      console.log(`  node intelligence/cli.mjs design --page="Commission Calculator"`);
      console.log(`  node intelligence/cli.mjs video-pro --topic="The Evaporating Commission"`);
      console.log(`  node intelligence/cli.mjs example [--action=add --type=blog --status=approved ...]`);
      console.log(`  node intelligence/cli.mjs admin [--threshold-blog=85 --threshold-design=85]`);
      break;
    }
  }

  console.log(`==================================================\n`);
}

main().catch(err => { console.error(`❌ CLI Error:`, err); process.exit(1); });
