/* AmzLoss SEO Intelligence — Provenance & Data Quality Layer
   Every piece of data carries a provenance label through the entire system.
   Valid states: TEST | LIVE | IMPORTED | ESTIMATED | UNAVAILABLE

   The provenance label tells the user exactly how trustworthy a metric is:
   - TEST    = Sample data, not real, never presented as real
   - LIVE    = Connected real-time API source
   - IMPORTED = Validated import from a known provider
   - ESTIMATED = Modeled/calculated value (must be labeled)
   - UNAVAILABLE = No data source connected

   Rules:
   1. TEST data may NEVER be presented as LIVE or IMPORTED
   2. Every feed file has metadata tracking its provenance
   3. The provenance propagates through every calculation
   4. Reports must display provenance for every metric
   5. Sample/test feeds must be clearly labeled as TEST in all outputs */

import fs from "node:fs";

export const PROVENANCE = {
  TEST: "TEST",
  LIVE: "LIVE",
  IMPORTED: "IMPORTED",
  ESTIMATED: "ESTIMATED",
  UNAVAILABLE: "UNAVAILABLE"
};

export const SOURCE_PROVENANCE_MAP = {
  "google_search_console": PROVENANCE.IMPORTED,
  "google_analytics": PROVENANCE.IMPORTED,
  "ahrefs": PROVENANCE.IMPORTED,
  "semrush": PROVENANCE.IMPORTED,
  "se_ranking": PROVENANCE.IMPORTED,
  "serp_api": PROVENANCE.IMPORTED,
  "backlink_api": PROVENANCE.IMPORTED,
  "internal": PROVENANCE.LIVE,
  "keyword_feed": PROVENANCE.UNAVAILABLE,
  "gsc_sample": PROVENANCE.TEST,
  "sample_data": PROVENANCE.TEST
};

export function getProvenance(source) {
  return SOURCE_PROVENANCE_MAP[String(source)] || PROVENANCE.UNAVAILABLE;
}

export function isTestData(provenance) {
  return provenance === PROVENANCE.TEST;
}

export function isRealData(provenance) {
  return provenance === PROVENANCE.LIVE || provenance === PROVENANCE.IMPORTED;
}

export function isUnavailable(provenance) {
  return provenance === PROVENANCE.UNAVAILABLE;
}

/* ---------- Feed Registry ---------- */
/* Tracks metadata for every feed file: path, status, import time, date range */
const FEED_REGISTRY = {};

export const FEED_METADATA_FILE = "C:/Users/DELL/amzloss/intelligence/seo/data/feed_registry.json";

export function registerFeed({ key, path, provenance, description }) {
  FEED_REGISTRY[key] = {
    key,
    path,
    provenance: provenance || PROVENANCE.UNAVAILABLE,
    description: description || "",
    imported_at: null,
    date_range: null,
    property_url: null,
    rows: 0,
    validated: false
  };
}

export function setFeedMetadata(key, metadata) {
  if (!FEED_REGISTRY[key]) registerFeed({ key, path: metadata.path || "" });
  Object.assign(FEED_REGISTRY[key], metadata, { validated: true });
}

export function getFeedMetadata(key) {
  return FEED_REGISTRY[key] || null;
}

export function getFeedProvenance(key) {
  return FEED_REGISTRY[key]?.provenance || PROVENANCE.UNAVAILABLE;
}

export function loadFeedRegistry() {
  try {
    if (fs.existsSync(FEED_METADATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(FEED_METADATA_FILE, "utf-8"));
      for (const [key, val] of Object.entries(data)) FEED_REGISTRY[key] = val;
    }
  } catch (e) {}
  return FEED_REGISTRY;
}

export function saveFeedRegistry() {
  try {
    const dir = FEED_METADATA_FILE.replace(/[/\\][^/\\]+$/, "");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FEED_METADATA_FILE, JSON.stringify(FEED_REGISTRY, null, 2), "utf-8");
  } catch (e) {}
}

export function getAllFeeds() {
  loadFeedRegistry();
  return Object.values(FEED_REGISTRY);
}

/* ---------- GSC Feed Status (self-contained, no circular deps) ---------- */
const GSC_FEED_PATH = "C:/Users/DELL/amzloss/intelligence/seo/data/gsc_feed.json";

export function getGSCFeedStatus() {
  loadFeedRegistry();
  const meta = getFeedMetadata("gsc");
  if (!meta) return { status: "NO_FEED", provenance: PROVENANCE.UNAVAILABLE };

  try {
    if (!fs.existsSync(GSC_FEED_PATH)) return { status: "FILE_MISSING", provenance: PROVENANCE.UNAVAILABLE };
    const feed = JSON.parse(fs.readFileSync(GSC_FEED_PATH, "utf-8"));
    const feedMeta = feed.meta || {};
    const provenance = feedMeta.provenance || getProvenance(feedMeta.source);
    if (provenance === PROVENANCE.TEST) return { status: "TEST_DATA", provenance, meta: feedMeta };
    if (provenance === PROVENANCE.IMPORTED) return { status: "IMPORTED", provenance, meta: feedMeta };
    if (provenance === PROVENANCE.LIVE) return { status: "LIVE", provenance, meta: feedMeta };
    return { status: "UNKNOWN", provenance, meta: feedMeta };
  } catch (e) {
    return { status: "ERROR", provenance: PROVENANCE.UNAVAILABLE, error: e.message };
  }
}

/* ---------- Evidence with Provenance ---------- */
/* Extend the evidence wrapper to include provenance. Every evidence
   object now carries: { value, source, provenance, confidence, ... } */

export function evidenceWithProvenance(value, source, provenanceOverride) {
  const prov = provenanceOverride || getProvenance(source);
  return {
    value: value ?? null,
    source: source ? String(source) : null,
    provenance: prov,
    confidence: value !== null && value !== undefined ? "MEDIUM" : "NONE",
    available: value !== null && value !== undefined,
    timestamp: new Date().toISOString(),
    geo: null,
    device: null
  };
}

export function markUnavailable(source, reason = "No data source connected") {
  return {
    value: null,
    source: source ? String(source) : null,
    provenance: getProvenance(source),
    confidence: "NONE",
    available: false,
    timestamp: new Date().toISOString(),
    geo: null,
    device: null,
    reason
  };
}

export function reconcileWithProvenance(...evidences) {
  /* Reconcile using confidence, but preserve provenance of the winning source.
     Never upgrade TEST data to LIVE/IMPORTED provenance. */
  const valid = evidences.filter(e => e && e.available);
  if (!valid.length) return markUnavailable(null, "No available data");
  valid.sort((a, b) => {
    const conf = { HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
    const cd = (conf[b.confidence] || 0) - (conf[a.confidence] || 0);
    if (cd !== 0) return cd;
    if (b.timestamp && a.timestamp) return b.timestamp > a.timestamp ? 1 : -1;
    return 0;
  });
  const winner = valid[0];
  /* Provenance stays with the winner — never promote TEST to LIVE */
  return { ...winner };
}

/* ---------- Provenance-Aware Value Extractors ---------- */
export function extractValue(evidence) {
  if (!evidence) return null;
  if (evidence.available === false) return null;
  return evidence.value ?? null;
}

export function extractProvenance(evidence) {
  if (!evidence) return PROVENANCE.UNAVAILABLE;
  return evidence.provenance || PROVENANCE.UNAVAILABLE;
}

export function labelValue(value, provenance) {
  if (value === null || value === undefined) return "DATA_UNAVAILABLE";
  return value;
}

export function describeEvidence(evidence) {
  if (!evidence) return "No evidence";
  const prov = evidence.provenance || PROVENANCE.UNAVAILABLE;
  const status = prov === PROVENANCE.TEST ? `⚠️ [${prov}] ` :
                 prov === PROVENANCE.UNAVAILABLE ? `❌ [${prov}] ` :
                 prov === PROVENANCE.LIVE ? `✅ [${prov}] ` :
                 prov === PROVENANCE.IMPORTED ? `📥 [${prov}] ` :
                 prov === PROVENANCE.ESTIMATED ? `📊 [${prov}] ` : "";
  const val = evidence.available ? evidence.value : "DATA_UNAVAILABLE";
  return `${status}${val}`;
}