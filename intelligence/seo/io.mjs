/* AmzLoss SEO Intelligence — IO & Memory Store
   Deterministic filesystem layer for the SEO engine.
   SEO memory records every recommendation/approval/execution so the
   engine's reasoning is auditable and never duplicated. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SEO_DIR = __dirname;
export const MEMORY_PATH = path.join(__dirname, "..", "memory", "seo_memory.json");
export const REPORT_DIR = path.join(__dirname, "reports");

export function loadJson(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.warn(`[SEO-IO] warn loading ${filePath}: ${e.message}`);
  }
  return fallback;
}

export function saveJson(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn(`[SEO-IO] warn saving ${filePath}: ${e.message}`);
  }
}

/* ---- SEO Memory ---- */

export function ensureMemory() {
  if (!fs.existsSync(MEMORY_PATH)) {
    saveJson(MEMORY_PATH, { recommendations: [], approvals: [], executed: [], experiments: [], feedback_entries: [], generated: new Date().toISOString() });
  }
  return loadJson(MEMORY_PATH, {});
}

export function recordRecommendation(entry) {
  const mem = ensureMemory();
  if (!mem.recommendations) mem.recommendations = [];
  entry.id = entry.id || `rec-${Date.now()}-${Math.floor(Math.random() * 999)}`;
  entry.recorded_at = new Date().toISOString();
  entry.status = entry.status || "RECOMMENDED";
  mem.recommendations.push(entry);
  saveJson(MEMORY_PATH, mem);
  return entry;
}

export function approveRecommendation(id, approval = {}) {
  const mem = ensureMemory();
  const rec = (mem.recommendations || []).find(r => r.id === id);
  if (!rec) return { ok: false, error: `No recommendation ${id}` };
  rec.status = "APPROVED";
  rec.approval = { approved_at: new Date().toISOString(), ...approval };
  if (!mem.approvals) mem.approvals = [];
  mem.approvals.push({ id, approved_at: new Date().toISOString(), ...approval });
  saveJson(MEMORY_PATH, mem);
  return { ok: true, recommendation: rec };
}

export function rejectRecommendation(id, reason = "") {
  const mem = ensureMemory();
  const rec = (mem.recommendations || []).find(r => r.id === id);
  if (!rec) return { ok: false, error: `No recommendation ${id}` };
  rec.status = "REJECTED";
  rec.rejection = { rejected_at: new Date().toISOString(), reason };
  saveJson(MEMORY_PATH, mem);
  return { ok: true, recommendation: rec };
}

export function markExecuted(id, result = {}) {
  const mem = ensureMemory();
  const rec = (mem.recommendations || []).find(r => r.id === id);
  if (!rec) return { ok: false, error: `No recommendation ${id}` };
  rec.status = "EXECUTED";
  rec.execution = { executed_at: new Date().toISOString(), ...result };
  if (!mem.executed) mem.executed = [];
  mem.executed.push({ id, executed_at: new Date().toISOString(), ...result });
  saveJson(MEMORY_PATH, mem);
  return { ok: true, recommendation: rec };
}

export function getMemory() {
  const mem = ensureMemory();
  return {
    recommendations: mem.recommendations || [],
    approvals: mem.approvals || [],
    executed: mem.executed || [],
    experiments: mem.experiments || [],
    feedback_entries: mem.feedback_entries || []
  };
}

export function hasBeenRecommended(slugOrAction) {
  return (getMemory().recommendations || []).some(r => (r.slug && r.slug === slugOrAction) || (r.pages && Array.isArray(r.pages) && r.pages.includes(slugOrAction)));
}

export function recordPerformanceFeedback(entry) {
  const mem = ensureMemory();
  if (!mem.feedback_entries) mem.feedback_entries = [];
  entry.id = entry.id || `fdbk-${Date.now()}-${Math.floor(Math.random() * 999)}`;
  entry.recorded_at = new Date().toISOString();
  mem.feedback_entries.push(entry);
  saveJson(MEMORY_PATH, mem);
  return entry;
}

export function recordExperiment(entry) {
  const mem = ensureMemory();
  if (!mem.experiments) mem.experiments = [];
  entry.id = entry.id || `exp-${Date.now()}-${Math.floor(Math.random() * 999)}`;
  entry.created_at = new Date().toISOString();
  mem.experiments.push(entry);
  saveJson(MEMORY_PATH, mem);
  return entry;
}

export function updateExperiment(id, patch) {
  const mem = ensureMemory();
  const exp = (mem.experiments || []).find(e => e.id === id);
  if (!exp) return { ok: false, error: `No experiment ${id}` };
  Object.assign(exp, patch, { updated_at: new Date().toISOString() });
  saveJson(MEMORY_PATH, mem);
  return { ok: true, experiment: exp };
}