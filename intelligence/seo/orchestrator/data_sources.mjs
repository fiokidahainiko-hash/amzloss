/* AmzLoss SEO Intelligence — Data Source Abstraction Layer
   Standard interface for plugging in SEO data providers without
   rewriting the engine. Supports: GSC, Analytics, Ahrefs, Semrush,
   SE Ranking, SERP providers, backlink providers. Multiple sources
   can exist per metric; conflicts are recorded, not silently resolved. */

import { ev, DATA_UNAVAILABLE, reconcile } from "./seo_evidence.mjs";

const ADAPTERS = {};

export function registerAdapter(category, name, loader) {
  if (!ADAPTERS[category]) ADAPTERS[category] = {};
  ADAPTERS[category][name] = loader;
}

export function listAdapters(category) { return ADAPTERS[category] ? Object.keys(ADAPTERS[category]) : []; }

export async function queryAdapters(category, params = {}) {
  const adapters = ADAPTERS[category] || {};
  const results = [];
  for (const [name, loader] of Object.entries(adapters)) {
    try {
      const data = await loader(params);
      if (data !== null && data !== undefined) results.push({ adapter: name, data, timestamp: new Date().toISOString() });
    } catch (e) { /* unavailable */ }
  }
  return results;
}

export async function getMetric(category, metricName, params = {}) {
  const results = await queryAdapters(category, { metric: metricName, ...params });
  if (!results.length) return DATA_UNAVAILABLE;
  const valid = results.filter(r => r.data?.available !== false);
  if (!valid.length) return DATA_UNAVAILABLE;
  return reconcile(...valid.map(r => r.data));
}

/* ---------- Built-in Adapter: Local JSON Feed (for GSC/Analytics exports) ---------- */
export function registerLocalFeedAdapter(feedName, filePath) {
  registerAdapter("local", feedName, async ({ metric, ...params }) => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    if (!fs.existsSync(filePath)) return DATA_UNAVAILABLE;
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return { available: true, value: data[metric] ?? data, source: `local:${feedName}` };
  });
}

/* ---------- Built-in Adapter: Search Console (API-ready stub) ---------- */
export function registerGscAdapter(apiClient) {
  registerAdapter("gsc", "google_search_console", async ({ metric, ...params }) => {
    if (!apiClient) return DATA_UNAVAILABLE;
    /* Implement: apiClient.query({ metric, ...params }) */
    return DATA_UNAVAILABLE;
  });
}

/* ---------- Built-in Adapter: Analytics (API-ready stub) ---------- */
export function registerAnalyticsAdapter(apiClient) {
  registerAdapter("analytics", "google_analytics", async ({ metric, ...params }) => {
    if (!apiClient) return DATA_UNAVAILABLE;
    return DATA_UNAVAILABLE;
  });
}

/* ---------- Built-in Adapter: Ahrefs (API-ready stub) ---------- */
export function registerAhrefsAdapter(apiClient) {
  registerAdapter("keywords", "ahrefs", async ({ metric, ...params }) => {
    if (!apiClient) return DATA_UNAVAILABLE;
    return DATA_UNAVAILABLE;
  });
  registerAdapter("backlinks", "ahrefs", async ({ metric, ...params }) => {
    if (!apiClient) return DATA_UNAVAILABLE;
    return DATA_UNAVAILABLE;
  });
  registerAdapter("competitors", "ahrefs", async ({ metric, ...params }) => {
    if (!apiClient) return DATA_UNAVAILABLE;
    return DATA_UNAVAILABLE;
  });
}

/* ---------- Built-in Adapter: Semrush (API-ready stub) ---------- */
export function registerSemrushAdapter(apiClient) {
  registerAdapter("keywords", "semrush", async ({ metric, ...params }) => {
    if (!apiClient) return DATA_UNAVAILABLE;
    return DATA_UNAVAILABLE;
  });
  registerAdapter("competitors", "semrush", async ({ metric, ...params }) => {
    if (!apiClient) return DATA_UNAVAILABLE;
    return DATA_UNAVAILABLE;
  });
}

/* ---------- Conflict Resolution ---------- */
export function resolveConflict(metric, sources) {
  const valid = sources.filter(s => s.data?.available !== false);
  if (valid.length <= 1) return valid[0]?.data || DATA_UNAVAILABLE;
  return reconcile(...valid.map(s => s.data));
}