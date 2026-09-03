/* AmzLoss SEO Intelligence — SEO Command Center
   Unified entry point that dispatches all SEO commands to the right
   sub-system. Acts as the facade over the entire SEO engine. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSiteData } from "../site_data.mjs";
import { SEORouter } from "./seo_router.mjs";
import { gscSummary, strikingDistanceKeywords, ctrOpportunities, hiddenOpportunities, pageQueryMismatches, getGscProvenance } from "./gsc.mjs";
import { rankSummary } from "./rank_tracking.mjs";
import { analyticsSummary } from "./analytics.mjs";
import { generateContentRoadmap } from "./content_roadmap.mjs";
import { computeAuthorityFlow } from "./authority_flow.mjs";
import { detectDecay, decayActionPlan } from "./content_decay.mjs";
import { analyzeSerpIntent } from "./serp_intent.mjs";
import { keywordOpportunityScore } from "./keyword_scoring.mjs";
import { competitorKeywordGap } from "../competition/keyword_gap.mjs";
import { linkProspecting } from "./link_prospecting.mjs";
import { importGSCFeed, getGSCFeedStatus } from "./gsc_import.mjs";
import { generateGSCCReport, formatGSCCReport, getGSCReport as getReport } from "./gsc_report.mjs";
import { PROVENANCE } from "./provenance.mjs";

export class SEOCommandCenter {
  constructor() {
    this.router = new SEORouter();
  }

  async execute({ command, args = {}, dataFeeds = {} } = {}) {
    switch (command) {
      case "dashboard": return this.dashboard();
      case "full-report": return this.fullReport();
      case "roadmap": return this.roadmap(args);
      case "keywords": return this.keywordReport(args);
      case "research": return this.keywordResearch(args);
      case "rankings": return this.rankingsReport();
      case "gsc": return this.gscReport(args);
      case "gsc-import": return this.gscImport(args);
      case "competition": return this.competitionReport(args);
      case "authority": return this.authorityReport();
      case "decay": return this.decayReport(args);
      case "backlinks": return this.backlinkReport();
      case "prospects": return this.prospectReport(args);
      case "next-actions": return this.nextActions();
      default: return this.router.route(command, args);
    }
  }

  dashboard() {
    return {
      title: "AMZLOSS SEO Command Center",
      timestamp: new Date().toISOString(),
      data_health: {
gsc: gscSummary(),
      rankings: rankSummary(),
      analytics: analyticsSummary(),
      decay: detectDecay(),
      provenance: {
        gsc: getGscProvenance(),
        ranks: PROVENANCE.UNAVAILABLE,
        analytics: PROVENANCE.UNAVAILABLE,
        backlinks: PROVENANCE.UNAVAILABLE
      }
      },
      quick_stats: {
        total_keywords: rankSummary().ranked_keywords || "DATA_UNAVAILABLE",
        page_one_keywords: rankSummary().page_one || "DATA_UNAVAILABLE",
        avg_position: Math.round(rankSummary().avg_position || 0),
        gsc_impressions: gscSummary().total_impressions || "DATA_UNAVAILABLE",
        gsc_ctr: gscSummary().avg_ctr ? Math.round(gscSummary().avg_ctr * 100) + "%" : "DATA_UNAVAILABLE",
        decaying_pages: detectDecay().decaying?.length || 0,
        striking_distance: gscSummary().striking_distance || "DATA_UNAVAILABLE"
      },
      available_commands: ["roadmap", "keywords", "research", "rankings", "gsc", "competition", "authority", "decay", "backlinks", "prospects", "next-actions", "full-report"]
    };
  }

  fullReport() {
    const dashboard = this.dashboard();
    const site = loadSiteData();
    return { ...dashboard, site_summary: { articles: (site.articles || []).length, clusters: Object.keys(site.clusters || {}).length, pages: (site.pages || []).length } };
  }

  roadmap(args = {}) {
    const site = loadSiteData();
    const roadmap = generateContentRoadmap({ keywords: site.articles.map(a => ({ keyword: a.slug })), constraints: args.constraints || {} });
    return { roadmap, stats: { total_items: Object.values(roadmap).flat().length } };
  }

  keywordReport(args = {}) {
    const site = loadSiteData();
    const scored = site.articles.map(a => keywordOpportunityScore({ keyword: a.slug, intent: a.intent }));
    scored.sort((a, b) => b.opportunity_score - a.opportunity_score);
    return { keywords: scored, top_opportunities: scored.slice(0, 20) };
  }

  keywordResearch(args = {}) {
    const site = loadSiteData();
    if (!args.keyword) return { error: "keyword is required" };
    const analysis = analyzeSerpIntent({ keyword: args.keyword });
    const score = keywordOpportunityScore({ keyword: args.keyword, intent: analysis.dominant_intent });
    return { keyword: args.keyword, serp_analysis: analysis, opportunity: score };
  }

  rankingsReport() {
    const summary = rankSummary();
    const gsc = gscSummary();
    return { summary, gsc_summary: gsc };
  }

  gscReport(args = {}) {
    const { report, status } = getReport();
    return { report, status };
  }

  gscImport(args = {}) {
    return importGSCFeed({ feedPath: args.path, propertyUrl: args.property });
  }

  competitionReport(args = {}) {
    const site = loadSiteData();
    const comps = (args.competitors || []).map(c => ({ domain: c, tracked_keywords: c.keywords || [], backlinks: c.backlinks || [] }));
    const gaps = competitorKeywordGap({ amzlossKeywords: site.articles.map(a => ({ keyword: a.slug, position: a.position })), competitors: comps });
    return { gaps: gaps.slice(0, 30), summary: { create: gaps.filter(g => g.classification === "CREATE").length, optimize: gaps.filter(g => g.classification === "OPTIMIZE").length, expand: gaps.filter(g => g.classification === "EXPAND").length } };
  }

  authorityReport() {
    const site = loadSiteData();
    const links = (site.links || []).map(l => ({ from: l.from, to: l.to }));
    const flow = computeAuthorityFlow({ pages: site.articles, links });
    return flow;
  }

  decayReport(args = {}) {
    const decay = detectDecay(args);
    return { ...decay, action_plan: decayActionPlan ? decayActionPlan(decay) : { actions: [], message: decay.message } };
  }

  backlinkReport() {
    const p = "C:/Users/DELL/amzloss/intelligence/seo/data/backlink_feed.json";
    if (!fs.existsSync(p)) return { available: false, message: "DATA_UNAVAILABLE — no backlink feed. Add backlink_feed.json to data/" };
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    return { available: true, total_links: data.links?.length || 0, total_domains: data.domains?.length || 0, new_this_week: data.new_this_week || 0 };
  }

  prospectReport(args = {}) {
    const competitors = args.competitors || [];
    const prospects = linkProspecting({ competitors });
    return { prospects: prospects.slice(0, args.limit || 30), total: prospects.length };
  }

  nextActions() {
    const site = loadSiteData();
    const gsc = gscSummary();
    const decay = detectDecay();
    const actions = [];

    const sd = (gsc.striking_distance || 0) > 0;
    if (sd) actions.push({ action: "OPTIMIZE_STRIKING_DISTANCE", count: gsc.striking_distance, reason: "Keywords in positions 4-20 need quick wins" });

    if (decay.decaying?.length > 0) actions.push({ action: "REFRESH_DECAYING_CONTENT", count: decay.decaying.length, reason: "Pages are losing traffic" });

    if (gsc.ctr_opportunities > 0) actions.push({ action: "IMPROVE_CTR", count: gsc.ctr_opportunities, reason: "Low CTR despite impressions" });

    return { next_actions: actions, generated_at: new Date().toISOString() };
  }
}