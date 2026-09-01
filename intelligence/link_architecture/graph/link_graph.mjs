/* AmzLoss Internal Link Architecture — Internal Link Equity Graph & Edge Map
   Builds a directional graph (pages as nodes, internal links as edges).
   Each edge carries anchor text, context, position, relevance, link-type classification. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCH_DIR = path.join(__dirname, "..");
const STATE_DIR = path.join(ARCH_DIR, "state");
const GRAPH_PATH = path.join(STATE_DIR, "internal_link_graph.json");

export const LINK_TYPES = ["contextual", "navigational", "footer", "sidebar", "template"];
export const POSITIONS = ["intro", "body", "conclusion", "sidebar", "footer", "header", "cta_band"];

export function loadLinkGraph(fallback = { nodes: [], edges: [] }) {
  try {
    if (fs.existsSync(GRAPH_PATH)) return JSON.parse(fs.readFileSync(GRAPH_PATH, "utf-8"));
  } catch (e) {}
  return fallback;
}

export function saveLinkGraph(graph) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2), "utf-8");
}

/**
 * Build link graph from HTML content of all site pages.
 * Returns { nodes: [...], edges: [...] }
 */
export function buildLinkGraph(allPageHtmlMap) {
  const nodes = new Map();
  const edges = [];

  for (const [slug, content] of allPageHtmlMap) {
    if (!nodes.has(slug)) {
      nodes.set(slug, {
        slug,
        inboundCount: 0,
        outboundCount: 0,
        contextualInbound: 0,
        contextualOutbound: 0
      });
    }
    // Find href links to other site pages
    const linkRegex = /href=["']([^"']+?)["']/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const href = match[1];
      const targetSlug = normalizeSlug(href);
      if (!targetSlug || targetSlug === slug) continue;

      // Ensure target node exists
      if (!nodes.has(targetSlug)) {
        nodes.set(targetSlug, {
          slug: targetSlug,
          inboundCount: 0,
          outboundCount: 0,
          contextualInbound: 0,
          contextualOutbound: 0
        });
      }

      // Determine link position based on context
      const posBefore = content.substring(Math.max(0, match.index - 300), match.index);
      const position = guessLinkPosition(posBefore, content.substring(match.index, Math.min(content.length, match.index + 200)));
      const isContextual = position === "body" || position === "intro" || position === "conclusion";

      // Try to extract anchor text from <a> content after href
      const anchorMatch = content.substring(match.index, Math.min(content.length, match.index + 300)).match(/<a[^>]*>([^<]+)<\/a>/i);
      const anchorText = anchorMatch ? anchorMatch[1].trim() : "";
      const linkType = guessLinkType(href, position);

      edges.push({
        source: slug,
        target: targetSlug,
        anchorText,
        position,
        linkType,
        isContextual,
        relevanceScore: isContextual ? 80 : (linkType === "navigational" ? 60 : 40)
      });

      nodes.get(slug).outboundCount++;
      nodes.get(targetSlug).inboundCount++;
      if (isContextual) {
        nodes.get(slug).contextualOutbound++;
        nodes.get(targetSlug).contextualInbound++;
      }
    }
  }

  return { nodes: Array.from(nodes.values()), edges };
}

/**
 * Save graph to state
 */
export function persistGraph(graph) {
  saveLinkGraph(graph);
  return graph;
}

/**
 * Load graph or return empty
 */
export function getGraph() {
  return loadLinkGraph();
}

/**
 * Build the adjacency list for analysis
 */
export function adjacencyList(graph) {
  const inbound = {};
  const outbound = {};
  for (const edge of graph.edges) {
    if (!inbound[edge.target]) inbound[edge.target] = [];
    if (!outbound[edge.source]) outbound[edge.source] = [];
    inbound[edge.target].push(edge);
    outbound[edge.source].push(edge);
  }
  return { inbound, outbound };
}

/* --- helpers --- */

function normalizeSlug(href) {
  if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return null;
  return href
    .replace(/^\.\.\//, "")
    .replace(/^\.\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\.html$/, "");
}

function guessLinkPosition(before, after) {
  if (before.includes("<footer") || before.includes("site-footer") || after.includes("</footer")) return "footer";
  if (before.includes("nav-links") || before.includes("nav-toggle") || before.includes("dropdown")) return "header";
  if (before.includes("sidebar")) return "sidebar";
  if (before.includes("cta-band")) return "cta_band";
  const text = before.slice(-200).toLowerCase();
  if (text.includes("<h2") || text.includes("<p>") || text.includes("<li>")) return "body";
  if (before.length < 100) return "intro";
  return "body";
}

function guessLinkType(href, position) {
  if (position === "header") return "navigational";
  if (position === "footer") return "navigational";
  if (position === "sidebar") return "sidebar";
  if (href.includes("/blogs/")) return "contextual";
  return "contextual";
}
