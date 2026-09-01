/* AmzLoss AI Content Intelligence System (v2.2.0) — Main Programmatic Exports */

import { runSeoResearchAgent } from "./agents/seo_research_agent.mjs";
import { runTopicClusterAgent } from "./agents/topic_cluster_agent.mjs";
import { runBlogWriterAgent } from "./agents/blog_writer_agent.mjs";
import { runInternalLinkingAgent } from "./agents/internal_linking_agent.mjs";
import { runBlogSeoAuditor } from "./agents/blog_seo_auditor.mjs";
import { runTikTokStrategist } from "./agents/tiktok_strategist.mjs";
import { runTikTokScriptWriter } from "./agents/tiktok_script_writer.mjs";
import { runVideoDirector } from "./agents/video_director.mjs";
import { runVideoQualityJudge } from "./agents/video_quality_judge.mjs";

import { runBlogPipeline, publishArticleToSite } from "./pipelines/blog_pipeline.mjs";
import { runTopicClusterPipeline } from "./pipelines/topic_cluster_pipeline.mjs";
import { runInternalLinkingPipeline } from "./pipelines/internal_linking_pipeline.mjs";
import { runTikTokPipeline } from "./pipelines/tiktok_pipeline.mjs";

import { runUxStrategistAgent } from "./design/agents/ux_strategist_agent.mjs";
import { runCreativeWebAgent } from "./design/agents/creative_web_agent.mjs";
import { runMotionDesignAgent } from "./design/agents/motion_design_agent.mjs";
import { runDesignCriticAgent } from "./design/agents/design_critic_agent.mjs";
import { runWebsiteDesignPipeline } from "./design/pipelines/website_design_pipeline.mjs";

import { runVideoCreativeDirector } from "./video/agents/video_creative_director.mjs";
import { runStoryboardAgent } from "./video/agents/storyboard_agent.mjs";
import { runSoundDesignAgent } from "./video/agents/sound_design_agent.mjs";
import { runUpgradedVideoQualityJudge } from "./video/agents/upgraded_video_quality_judge.mjs";
import { runVideoProductionPipeline } from "./video/pipelines/video_production_pipeline.mjs";

import { getBlogContext, getTikTokContext, getLinkingContext, getDesignContext, getVideoContext, SITE_PAGES } from "./memory/retriever.mjs";

// v2.1.0: Authority-Aware Internal Link Architecture
import {
  scorePage, classifyImportance, computeImportanceScore,
  buildLinkGraph, persistGraph, getGraph, adjacencyList as linkAdjacencyList,
  computeCrawlDepths, crawlDepthReport, flagDeepPages,
  generateAnchorVariations, evaluateAnchorQuality,
  evaluateClusterCompleteness, buildAuthorityFlowReport,
  findLinkToThisPage, findLinkFromThisPage,
  runNewArticleWorkflow, runAuthorityLinkingPipeline,
  // v2.2.0: Editorial Content Network
  RELATIONSHIP_TYPES, RELATIONSHIP_MEANING, inferRelationshipType, relationshipBetween,
  buildContentRelationshipGraph, createRelationshipEdge, semanticNeighbors, HUB_TYPES, CONTENT_ROLES,
  extractEntities, entityOverlap, entityRelationship,
  identifyHubs, detectHubForCluster,
  readerNextStepCandidates, readerPreviousStepCandidates, decideBidirectionality,
  scoreLinkRecommendation, rankRecommendations, isStrongOpportunity,
  buildTopicCoverageMap,
  evaluateEditorialClusterCompleteness,
  buildContentNetworkHealth,
  whyThisArticleExists, scanExistingArticlesForInboundLinks,
  buildEditorialCollections, buildRelatedContentModules,
  runEditorialContentNetworkPipeline
} from "./link_architecture/index.mjs";

export {
  runSeoResearchAgent, runTopicClusterAgent, runBlogWriterAgent, runInternalLinkingAgent, runBlogSeoAuditor,
  runTikTokStrategist, runTikTokScriptWriter, runVideoDirector, runVideoQualityJudge,
  runBlogPipeline, publishArticleToSite, runTopicClusterPipeline, runInternalLinkingPipeline, runTikTokPipeline,

  runUxStrategistAgent, runCreativeWebAgent, runMotionDesignAgent, runDesignCriticAgent, runWebsiteDesignPipeline,
  runVideoCreativeDirector, runStoryboardAgent, runSoundDesignAgent, runUpgradedVideoQualityJudge, runVideoProductionPipeline,

  getBlogContext, getTikTokContext, getLinkingContext, getDesignContext, getVideoContext, SITE_PAGES,

  // v2.1.0: Authority-Aware Internal Link Architecture
  scorePage, classifyImportance, computeImportanceScore,
  buildLinkGraph, persistGraph, getGraph, linkAdjacencyList,
  computeCrawlDepths, crawlDepthReport, flagDeepPages,
  generateAnchorVariations, evaluateAnchorQuality,
  evaluateClusterCompleteness, buildAuthorityFlowReport,
  findLinkToThisPage, findLinkFromThisPage,
  runNewArticleWorkflow, runAuthorityLinkingPipeline,

  // v2.2.0: Editorial Content Network
  RELATIONSHIP_TYPES, RELATIONSHIP_MEANING, inferRelationshipType, relationshipBetween,
  buildContentRelationshipGraph, createRelationshipEdge, semanticNeighbors, HUB_TYPES, CONTENT_ROLES,
  extractEntities, entityOverlap, entityRelationship,
  identifyHubs, detectHubForCluster,
  readerNextStepCandidates, readerPreviousStepCandidates, decideBidirectionality,
  scoreLinkRecommendation, rankRecommendations, isStrongOpportunity,
  buildTopicCoverageMap,
  evaluateEditorialClusterCompleteness,
  buildContentNetworkHealth,
  whyThisArticleExists, scanExistingArticlesForInboundLinks,
  buildEditorialCollections, buildRelatedContentModules,
  runEditorialContentNetworkPipeline
};
