/* AmzLoss SEO Intelligence & Topical Authority Engine — Configuration
   Single place for all thresholds and policy constants. Every threshold
   here is configurable and every score uses these constants so behaviour
   stays explainable and consistent. */

export const SEARCH_INTENT_TYPES = ["informational", "commercial", "transactional", "how-to", "problem"];

/* Priority-score thresholds (per spec): 90-100 publish, 80-89 minor,
   70-79 revision, <70 reject. */
export const CONTENT_VERDICT = {
  PUBLISH: { min: 90, label: "PUBLISH" },
  MINOR: { min: 80, label: "MINOR_IMPROVEMENT" },
  REVISE: { min: 70, label: "REVISION" },
  REJECT: { min: 0, label: "REJECT" }
};

export function verdictForScore(score) {
  if (score >= CONTENT_VERDICT.PUBLISH.min) return CONTENT_VERDICT.PUBLISH.label;
  if (score >= CONTENT_VERDICT.MINOR.min) return CONTENT_VERDICT.MINOR.label;
  if (score >= CONTENT_VERDICT.REVISE.min) return CONTENT_VERDICT.REVISE.label;
  return CONTENT_VERDICT.REJECT.label;
}

/* Weighting model for the 0-100 explainable priority score.
   Components sum to 1.0. Each is optional-powered: unavailable signals
   renormalise so the final score is always comparable. */
export const PRIORITY_WEIGHTS = {
  business_importance: 0.22,
  seo_quality: 0.18,
  cluster_strategic_value: 0.18,
  gap_intent_coverage: 0.12,
  link_support: 0.10,
  technical_health: 0.08,
  freshness: 0.06,
  backlink_asset_potential: 0.06
};

/* Authority scoring thresholds for topic clusters. */
export const AUTHORITY_TIERS = {
  LEADING: 80,
  GROWING: 60,
  EMERGING: 40,
  DORMANT: 0
};

export function authorityTier(score) {
  if (score >= AUTHORITY_TIERS.LEADING) return "LEADING";
  if (score >= AUTHORITY_TIERS.GROWING) return "GROWING";
  if (score >= AUTHORITY_TIERS.EMERGING) return "EMERGING";
  return "DORMANT";
}

/* Content-decay thresholds. */
export const DECAY = {
  MIN_WORDS: 600,
  STALE_DAYS: 365,
  ORPHAN_PENALTY: 25,
  MIN_INBOUND: 1,
  DESIRED_INBOUND: 2
};

/* Linkable-asset / backlink feasibility. */
export const BACKLINK = {
  MIN_SEO_QUALITY: 60,
  MIN_INBOUND: 1,
  STRONG_INBOUND: 3,
  STRATEGIC_CLUSTERS: ["Earnings & Payout", "Commission Cuts", "Earnings Audit"]
};

/* Approval-gated actions (spec: human approval before destructive change). */
export const APPROVAL_GATED_ACTIONS = ["NEW_URL", "MERGE", "REDIRECT", "DELETE", "CANONICAL", "ROBOTS", "OUTREACH", "META_REWRITE"];

/* Technical SEO checks mirror the site audit so numbers stay consistent. */
export const TECHNICAL_CHECKS = [
  "Title length (30-65ch)",
  "H1 matches topic/title",
  "Meta description present & >=70ch",
  "Heading structure (>=3 H2/H3)",
  "Sufficient word count (>=800)",
  "Useful introduction",
  "Internal links present (>=2)",
  "Semantic/entity coverage (>=4 entities)",
  "Images present",
  "Canonical tag",
  "Semantic <main> landmark",
  "Links to core tools",
  "FAQ section present",
  "Structured data (JSON-LD)",
  "No manipulative anchor/link phrasing"
];