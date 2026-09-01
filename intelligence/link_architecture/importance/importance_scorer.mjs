/* AmzLoss Internal Link Architecture — Page Importance Model
   Computes an INTERNAL IMPORTANCE SCORE (0-100) for every indexable page.

   IMPORTANT: This is an internal strategic model, NOT Google PageRank.
   It uses only first-party/site data (crawl depth, in/outbound links, role,
   pillar position, traffic/perf when available, cluster importance).
   Google's exact ranking algorithms are not exposed and are not modelled here. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCH_DIR = path.join(__dirname, "..");
const STATE_DIR = path.join(ARCH_DIR, "state");
const STATE_PATH = path.join(STATE_DIR, "internal_authority_state.json");

export const IMPORTANCE_CLASSES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "ORPHAN"];
export const PAGE_ROLES = ["pillar", "supporting", "tool", "money", "utility", "index", "orphan"];

export function loadAuthorityState(fallback = {}) {
  try {
    if (fs.existsSync(STATE_PATH)) return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
  } catch (e) {}
  return fallback;
}

export function saveAuthorityState(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Classify a page importance class from its importance score.
 */
export function classifyImportance(score) {
  if (score >= 85) return "CRITICAL";
  if (score >= 65) return "HIGH";
  if (score >= 40) return "MEDIUM";
  if (score >= 20) return "LOW";
  return "ORPHAN";
}

/**
 * Compute Internal Importance Score for a page.
 * WEIGHTS are deliberately simple, transparent, and based on first-party data.
 */
export function computeImportanceScore(page) {
  const w = {
    inboundLinks: 1.6,     // relevant contextual inbound links
    outboundLinks: 0.4,    // relevant outbound links (mild signal)
    crawlDepth: 1.2,       // shallower = more important (inverted below)
    role: 2.0,             // pillar/tool > supporting > utility
    clusterImportance: 1.0,
    traffic: 0.8,          // only if data available
    performance: 0.8,      // SC clicks/impressions if available
    backlinks: 0.6,        // third-party if available
    businessImportance: 1.0,
    contentQuality: 1.0,
    orphanPenalty: 1.5     // applied when classified orphan
  };

  let score = 0;
  score += Math.min(10, page.inboundLinks || 0) * w.inboundLinks * 2;      // scale to ~0-32
  score += Math.min(8, (page.outboundLinks || 0)) * w.outboundLinks * 2;   // ~0-6.4
  score += Math.max(0, 5 - (page.crawlDepth || 5)) * w.crawlDepth * 4;    // depth 0->20, depth 5->0
  score += (page.roleScore || 0) * w.role;                                 // 0-10 * 2
  score += (page.clusterImportance || 5) * w.clusterImportance;            // 0-10
  score += (page.trafficScore || 0) * w.traffic;                           // 0-10 * 0.8
  score += (page.performanceScore || 0) * w.performance;                   // 0-10 * 0.8
  score += (page.backlinkScore || 0) * w.backlinks;                        // 0-10 * 0.6
  score += (page.businessImportance || 3) * w.businessImportance;          // 0-10
  score += (page.contentQuality || 7) * w.contentQuality;                  // 0-10
  if (page.isOrphan) score -= w.orphanPenalty * 12;                        // heavy penalty

  // Normalize to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Compute an overall role-based roleScore for internal model.
 */
export function roleScoreFor(page) {
  const role = (page.role || "supporting").toLowerCase();
  const roleBase = {
    pillar: 10, tool: 9, money: 9, index: 8, utility: 5, supporting: 6, orphan: 1
  };
  return roleBase[role] ?? 6;
}

/**
 * Enrich a page entry with derived popularity metrics.
 */
export function scorePage(page) {
  const enriched = {
    ...page,
    roleScore: roleScoreFor(page),
    importanceScore: 0,
    importanceClass: "MEDIUM"
  };
  enriched.importanceScore = computeImportanceScore(enriched);
  enriched.importanceClass = classifyImportance(enriched.importanceScore);
  return enriched;
}
