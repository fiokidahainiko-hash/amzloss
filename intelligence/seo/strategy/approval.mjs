/* AmzLoss SEO Intelligence — Approval Gates
   Human-in-the-loop gate for every DESTRUCTIVE or IRREVERSIBLE action
   (spec): new URL, merge, redirect, delete, canonical change, robots
   change, outreach. Non-destructive on-page/link edits pass through
   without a gate.

   The engine *recommends*; humans *approve*. This module makes that
   contract explicit and auditable via SEO memory. */

import { APPROVAL_GATED_ACTIONS } from "../config.mjs";
import { recordRecommendation, approveRecommendation, rejectRecommendation, getMemory } from "../io.mjs";

export function requiresApproval(actionType) {
  return APPROVAL_GATED_ACTIONS.includes(actionType);
}

export function gateStatus(actionType) {
  return {
    action_type: actionType,
    approval_required: requiresApproval(actionType),
    policy: requiresApproval(actionType)
      ? `Human approval required before ${actionType} — irreversible/destructive change.`
      : "Non-destructive; may proceed after review."
  };
}

export function submitForApproval({ actionType, pages = [], slug = null, reason = "", proposed_change = "" }) {
  if (!requiresApproval(actionType)) {
    return { ok: false, gate: "not_required", note: `${actionType} is not approval-gated.` };
  }
  const rec = recordRecommendation({
    type: actionType,
    slug,
    pages,
    reason,
    proposed_change,
    approval_required: true,
    status: "PENDING_APPROVAL",
    gate: gateStatus(actionType)
  });
  return { ok: true, requirement_id: rec.id, recommendation: rec, gate: rec.gate };
}

export function approveGate(id, approver = "human") {
  const res = approveRecommendation(id, { by: approver, method: "CLI_APPROVE" });
  return res.ok ? { ok: true, id, status: "APPROVED", recommendation: res.recommendation } : res;
}

export function rejectGate(id, reason = "") {
  const res = rejectRecommendation(id, reason);
  return res.ok ? { ok: true, id, status: "REJECTED", reason } : res;
}

export function pendingApprovals() {
  const mem = getMemory();
  return (mem.recommendations || []).filter(r => r.status === "PENDING_APPROVAL" && r.approval_required);
}

export const GATE_TYPES = APPROVAL_GATED_ACTIONS;