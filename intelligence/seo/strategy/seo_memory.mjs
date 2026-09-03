/* AmzLoss SEO Intelligence — SEO Memory (session-aware log)
   Shows what the engine has recommended / approved / rejected /
   executed so recommendations are never blindly duplicated and every
   decision is auditable. Persists in intelligence/memory/seo_memory.json
   via the io store. */

import { getMemory, hasBeenRecommended, recordRecommendation } from "../io.mjs";

export function seoMemoryOverview() {
  const mem = getMemory();
  const recs = mem.recommendations || [];
  return {
    total_recommendations: recs.length,
    pending_approval: recs.filter(r => r.status === "PENDING_APPROVAL").length,
    approved: recs.filter(r => r.status === "APPROVED").length,
    rejected: recs.filter(r => r.status === "REJECTED").length,
    executed: recs.filter(r => r.status === "EXECUTED").length,
    backlinks: recs.filter(r => r.type === "OUTREACH").length,
    new_content: recs.filter(r => r.type === "NEW_URL" || r.type === "NEW_GAP").length,
    recent: recs.slice(-10).map(r => ({
      id: r.id, type: r.type, slug: r.slug || null, pages: r.pages || null,
      status: r.status, reason: (r.reason || r.proposed_change || "").slice(0, 120)
    })),
    experiments: (mem.experiments || []).length,
    feedback_entries: (mem.feedback_entries || []).length
  };
}

export function isDuplicated(slug, actionType = null) {
  return hasBeenRecommended(slug);
}

export function logRecommendation({ type, slug = null, pages = null, action = "", reason = "", approval_required = false, priority = null }) {
  return recordRecommendation({ type, slug, pages, action, reason, approval_required, priority });
}