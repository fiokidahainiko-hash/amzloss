/* AmzLoss SEO Intelligence — Content Decay Detection 2.0
   Identifies content that is losing traffic/position over time.
   Requires historical data from GSC or rank tracking feed. */

import fs from "node:fs";
import { ev, DATA_UNAVAILABLE } from "./seo_evidence.mjs";

export function detectDecay({ historyWeeks = 8, minDecline = 0.1 } = {}) {
  const p = "C:/Users/DELL/amzloss/intelligence/seo/data/content_decay_history.json";
  if (!fs.existsSync(p)) return { available: false, decaying: [], message: "DATA_UNAVAILABLE — no historical data. Export GSC data to data/content_decay_history.json" };

  const data = JSON.parse(fs.readFileSync(p, "utf-8"));
  const weeks = data.weeks || [];
  if (weeks.length < 2) return { available: false, decaying: [], message: "DATA_UNAVAILABLE — insufficient historical data" };

  const decaying = [];
  for (const entry of data.queries || []) {
    const values = entry.history || [];
    if (values.length < 2) continue;
    const recent = values.slice(-Math.min(3, Math.ceil(values.length / 2)));
    const older = values.slice(0, Math.min(3, Math.ceil(values.length / 2)));
    const recentAvg = recent.reduce((s, v) => s + (v.impressions || v.position || 0), 0) / recent.length;
    const olderAvg = older.reduce((s, v) => s + (v.impressions || v.position || 0), 0) / older.length;
    if (olderAvg === 0) continue;
    const decline = 1 - recentAvg / olderAvg;
    if (decline >= minDecline) {
      decaying.push({
        query: entry.query,
        page: entry.page,
        decline_percent: Math.round(decline * 100),
        recent_avg: recentAvg,
        older_avg: olderAvg,
        trend: "DECLINING",
        severity: decline > 0.3 ? "CRITICAL" : decline > 0.2 ? "HIGH" : decline > 0.1 ? "MEDIUM" : "LOW"
      });
    }
  }
  return { available: true, decaying: decaying.sort((a, b) => b.decline_percent - a.decline_percent), dataWeeks: weeks.length };
}

export function decayActionPlan(decayResults) {
  if (!decayResults.available) return { actions: [], message: decayResults.message };
  return decayResults.decaying.map(d => {
    let action = "MONITOR";
    let reason = "Minor decline — monitor for another week";
    if (d.severity === "CRITICAL") { action = "REFRESH"; reason = "Critical decay (>30%) — immediate content refresh needed"; }
    else if (d.severity === "HIGH") { action = "UPDATE_AND_EXPAND"; reason = "High decline (20-30%) — expand and update content"; }
    else if (d.severity === "MEDIUM") { action = "ADD_SECTION"; reason = "Moderate decline (10-20%) — add relevant section"; }
    return { query: d.query, page: d.page, decline: d.decline_percent, action, reason, priority: d.severity };
  });
}