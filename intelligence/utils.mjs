import fs from "node:fs";

export function loadJson(p, fallback = {}) {
  try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8")); } catch (e) { console.warn("loadJson: failed to read", p, e.message); }
  return fallback;
}

export function saveJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}
