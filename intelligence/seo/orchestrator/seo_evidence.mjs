/* AmzLoss SEO Intelligence — Unified Evidence & Data Source Abstraction Layer
   Every data point flowing through the SEO engine is wrapped in a typed
   Evidence wrapper: { value, source, timestamp, available, confidence,
   geo, device }. This makes the engine auditable — no metric is ever
   silently fabricated. Unknown = DATA_UNAVAILABLE. */
export const DATA_UNAVAILABLE = Object.freeze({ available: false, value: null, source: null, timestamp: null, confidence: "NONE", geo: null, device: null });

export function ev(value, { source = null, timestamp = null, confidence = "MEDIUM", geo = null, device = null } = {}) {
  return { available: value !== null && value !== undefined && value !== "", value: value ?? null, source: source ? String(source) : null, timestamp: timestamp || new Date().toISOString(), confidence, geo: geo || null, device: device || null };
}
export function evN(value, opts = {}) { return ev(value, opts); }
export function evStr(value, opts = {}) { return ev(value, { confidence: "MEDIUM", ...opts }); }

/* ---------- Data Source Registry ---------- */
/* Plugins register their source name and loader here. The orchestrator
   queries each source in priority order and merges results. */
const SOURCE_REGISTRY = {};

export function registerSource(name, loader) {
  SOURCE_REGISTRY[String(name)] = loader;
}

export function listSources() { return Object.keys(SOURCE_REGISTRY); }

/* ---------- Standard Query Interface ---------- */
export async function querySources({ metric, params = {}, sources = null } = {}) {
  const targets = sources ? sources.filter(s => SOURCE_REGISTRY[s]) : Object.keys(SOURCE_REGISTRY);
  const results = [];
  for (const name of targets) {
    try {
      const loader = SOURCE_REGISTRY[name];
      const data = typeof loader === "function" ? await loader({ metric, ...params }) : null;
      if (data !== null && data !== undefined) results.push({ source: name, data });
    } catch (e) { /* source unavailable — not fatal */ }
  }
  return results;
}

export function reconcile(...evidences) {
  /* When two sources disagree, return the one with highest confidence.
     If equal confidence, prefer the more recent timestamp. */
  const valid = evidences.filter(e => e && e.available);
  if (!valid.length) return DATA_UNAVAILABLE;
  valid.sort((a, b) => {
    const conf = { HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
    const cd = (conf[b.confidence] || 0) - (conf[a.confidence] || 0);
    if (cd !== 0) return cd;
    if (b.timestamp && a.timestamp) return b.timestamp > a.timestamp ? 1 : -1;
    return 0;
  });
  return valid[0];
}

/* ---------- Evidence Wrappers for Standard SEO Data Types ---------- */
export function volume(value, src) { return evN(value, { source: src || "keyword_feed", confidence: value !== null ? "HIGH" : "LOW" }); }
export function difficulty(value, src) { return evN(value, { source: src || "keyword_feed", confidence: value !== null ? "HIGH" : "LOW" }); }
export function cpc(value, src) { return evN(value, { source: src || "keyword_feed", confidence: value !== null ? "MEDIUM" : "LOW" }); }
export function position(value, src, { geo = null, device = null } = {}) { return evN(value, { source: src || "rank_tracker", confidence: value !== null ? "HIGH" : "LOW", geo, device }); }
export function impressions(value, src) { return evN(value, { source: src || "search_console", confidence: value !== null ? "HIGH" : "LOW" }); }
export function clicks(value, src) { return evN(value, { source: src || "search_console", confidence: value !== null ? "HIGH" : "LOW" }); }
export function ctr(value, src) { return evN(value, { source: src || "search_console", confidence: value !== null ? "HIGH" : "LOW" }); }
export function sessions(value, src) { return evN(value, { source: src || "analytics", confidence: value !== null ? "HIGH" : "LOW" }); }
export function backlinks(value, src) { return evN(value, { source: src || "backlink_feed", confidence: value !== null ? "HIGH" : "LOW" }); }
export function referringDomains(value, src) { return evN(value, { source: src || "backlink_feed", confidence: value !== null ? "HIGH" : "LOW" }); }

/* ---------- Structured Evidence Record ---------- */
export class EvidenceRecord {
  constructor({ id, type, label }) {
    this.id = id || `ev-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    this.type = type || "UNKNOWN";
    this.label = label || "";
    this.facts = [];
    this.recommendation = null;
    this.action = null;
    this.confidence = "MEDIUM";
    this.created_at = new Date().toISOString();
  }
  addFact({ metric, value, source, timestamp, confidence, geo, device, note }) {
    this.facts.push({ metric, fact: ev(value, { source, timestamp, confidence, geo, device }), note: note || null });
    return this;
  }
  setRecommendation({ action, target_pages, target_keywords, reason, priority_score, confidence, approval_required }) {
    this.recommendation = { action, target_pages: target_pages || [], target_keywords: target_keywords || [], reason, priority_score: priority_score ?? null, confidence: confidence || "MEDIUM", approval_required: !!approval_required, created_at: new Date().toISOString() };
    this.action = action;
    this.confidence = confidence || this.confidence;
    return this;
  }
  toJSON() { return { ...this, facts: this.facts, _self: undefined }; }
}

/* ---------- Question Answering from Evidence ---------- */
export function answerFromEvidence(evidence) {
  return evidence.facts.map(f => ({ metric: f.metric, value: f.fact.available ? f.fact.value : "DATA_UNAVAILABLE", source: f.fact.source, confidence: f.fact.confidence, note: f.note }));
}