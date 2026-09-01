/* AmzLoss Internal Link Architecture — Anchor Text Strategy Engine
   Generates multiple natural descriptive anchor variations.
   Avoids exact-match spam, keyword stuffing, generic phrases. */

const BANNED_ANCHORS = ["click here", "here", "this link", "read more", "learn more", "this page", "link"];

/**
 * Generate anchor text variations for a target page.
 */
export function generateAnchorVariations(targetTitle, targetKeyword, existingAnchors = []) {
  const used = new Set(existingAnchors.map(a => a.toLowerCase()));
  const variations = [
    targetKeyword,
    "current " + targetKeyword,
    "the " + targetKeyword,
    "check " + targetKeyword,
    targetKeyword.toLowerCase(),
    formatAsNaturalPhrase(targetTitle)
  ];

  const result = [];
  for (const anchor of variations) {
    const clean = anchor.trim();
    if (!clean || BANNED_ANCHORS.includes(clean.toLowerCase()) || used.has(clean.toLowerCase())) continue;
    result.push(clean);
  }

  if (result.length < 3) {
    result.push("the free " + targetKeyword + " tool", "AmzLoss " + targetKeyword, targetKeyword + " on AmzLoss");
  }

  return [...new Set(result)].slice(0, 6);
}

/**
 * Evaluate anchor quality (0-100).
 */
export function evaluateAnchorQuality(anchorText, targetTopic, existingAnchors = []) {
  let score = 70;
  const lower = anchorText.toLowerCase();
  const reasons = [];

  if (BANNED_ANCHORS.includes(lower)) { score -= 30; reasons.push("Generic anchor phrase"); }
  if (lower === targetTopic.toLowerCase()) { score += 10; reasons.push("Exact-match (use sparingly)"); }
  if (lower.includes(targetTopic.split(" ").slice(0, 2).join(" ").toLowerCase())) score += 5;
  if (anchorText.length > 60) { score -= 8; reasons.push("Too long"); }
  if (anchorText.length < 4) { score -= 12; reasons.push("Too short"); }
  const duplicates = existingAnchors.filter(a => a.toLowerCase() === lower).length;
  if (duplicates > 1) { score -= 15; reasons.push("Duplicate anchor"); }
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

function formatAsNaturalPhrase(title) {
  return title.replace(/[:\u2013|].*$/, "").replace(/:/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}
