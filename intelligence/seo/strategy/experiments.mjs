/* AmzLoss SEO Intelligence — SEO Experiments Log
   A controlled-experiment tracker (one-variable-at-a-time) so changes
   to the site are measured, not guessed. Records hypothesis, control
   variable, status, and results. Stored in SEO memory. */

import { recordExperiment, updateExperiment, getMemory } from "../io.mjs";

export function createExperiment({ title, hypothesis, control, variable, metric = "organic clicks", pages = [], expected_direction = "positive" }) {
  if (!title || !hypothesis) return { ok: false, error: "title and hypothesis required" };
  return {
    ok: true,
    experiment: recordExperiment({
      title, hypothesis, control, variable, metric, pages, expected_direction,
      status: "PLANNED",
      created_by: "seo-experiments"
    })
  };
}

export function updateExperimentStatus(id, { status, result_note = "" }) {
  const valid = ["PLANNED", "RUNNING", "PAUSED", "COMPLETED", "REJECTED"];
  if (!valid.includes(status)) return { ok: false, error: `status must be one of ${valid.join(", ")}` };
  const upd = updateExperiment(id, { status, result_note, status_updated_at: new Date().toISOString() });
  return upd;
}

export function listExperiments() {
  return {
    experiments: (getMemory().experiments || []).map(e => ({
      id: e.id,
      title: e.title,
      status: e.status,
      variable: e.variable,
      control: e.control,
      metric: e.metric,
      pages: e.pages,
      hypothesis: e.hypothesis?.slice?.(0, 160) || e.hypothesis
    })),
    total: (getMemory().experiments || []).length
  };
}