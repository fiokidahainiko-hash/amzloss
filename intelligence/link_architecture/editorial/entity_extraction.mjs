/* AmzLoss Editorial Content Network — Entity Extraction & Entity-Based Relationships
   Identifies important entities (organizations, concepts, products, tools) shared
   between articles. Two articles sharing important entities are strongly related
   even when keywords differ. Complements keyword matching. */

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "how",
  "what", "why", "can", "get", "use", "used", "when", "will", "have", "has", "about",
  "into", "them", "their", "there", "they", "were", "which", "while", "would", "amazon's"
]);

const KNOWN_ENTITIES = [
  "Amazon Associates", "Amazon", "Commission", "Earnings", "Calculator",
  "Affiliate", "SEO", "Rates", "CSV", "Revenue", "Payout", "Tracking",
  "Backlink", "Audit", "Category", "Discount", "Prime", "Fulfillment",
  "Referral", "Traffic", "Keyword", "Ranking", "Conversion", "Commission Cut"
];

/**
 * Extract entities from page title + keywords + content.
 */
export function extractEntities(page) {
  const text = [
    page.title || "", (page.keywords || []).join(" "), (page.content || "").slice(0, 1500)
  ].join(" ").toLowerCase();

  const found = [];
  for (const entity of KNOWN_ENTITIES) {
    if (text.includes(entity.toLowerCase())) found.push(entity);
  }

  // Also extract common multi-word concepts from title
  const titleWords = (page.title || "").toLowerCase().split(/[\s\u2013|,.:]+/)
    .filter(w => w.length > 4 && !STOPWORDS.has(w));

  const entities = [...new Set([...found, ...titleWords.map(w => capitalize(w))])];
  return entities.slice(0, 12);
}

/**
 * Compute entity overlap (0-100) between two pages.
 * Shared important entities indicate a strong semantic relationship.
 */
export function entityOverlap(pageA, pageB) {
  const entitiesA = extractEntities(pageA);
  const entitiesB = extractEntities(pageB);
  if (entitiesA.length === 0 || entitiesB.length === 0) return 0;
  const setA = new Set(entitiesA.map(e => e.toLowerCase()));
  const setB = new Set(entitiesB.map(e => e.toLowerCase()));
  let shared = 0;
  for (const e of setA) if (setB.has(e)) shared++;
  return Math.round((shared / Math.min(entitiesA.length, setB.size)) * 100);
}

/**
 * Produce an entity-based relationship summary between two pages.
 */
export function entityRelationship(pageA, pageB) {
  const shared = extractEntities(pageA).filter(e =>
    extractEntities(pageB).includes(e)
  );
  return {
    shared_entities: shared,
    overlap_score: entityOverlap(pageA, pageB),
    strong_relationship: shared.length >= 2
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
