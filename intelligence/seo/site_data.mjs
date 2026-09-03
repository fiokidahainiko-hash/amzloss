/* AmzLoss SEO Intelligence — Site Data Loader (source of truth)
   Reads the REAL website: the existing site content audit report +
   the actual blogs/*.html files + tool pages. Produces the normalized
   dataset every SEO module consumes.

   Availability policy (spec): search volume, rankings, and external
   backlinks are NEVER fabricated. Those live in data/*.json feed files
   that operators fill from real tools. Everything else is derived
   deterministically from the real website files. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadJson, SEO_DIR } from "./io.mjs";
import { SITE_PAGES } from "../memory/retriever.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");
const BLOGS_DIR = path.join(ROOT, "blogs");
const AUDIT_PATH = path.join(__dirname, "..", "link_architecture", "reports", "site_content_audit.json");
const DATA_DIR = path.join(__dirname, "data");

export function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/* ---------- Real HTML extraction (mirrors site_audit.mjs) ---------- */

export function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return (m ? m[1].trim() : "") || (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ? stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)[1]) : "") || "Untitled";
}

export function extractH1(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? stripTags(m[1]) : "";
}

export function extractMetaDescription(html) {
  const m = html.match(/name=["']description["']\s+content=["'](.*?)["']/i) || html.match(/content=["'](.*?)["']\s+name=["']description["']/i);
  return m ? m[1] : "";
}

export function extractHeadings(html) {
  const h2 = [];
  const h3 = [];
  for (const m of html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)) h2.push(stripTags(m[1]));
  for (const m of html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)) h3.push(stripTags(m[1]));
  return { h2, h3 };
}

export function extractCanonical(html) {
  const m = html.match(/<link[^>]*rel=["']canonical["'][^>]*>/i);
  return m ? m[0] : "";
}

export function extractStructuredData(html) {
  const blocks = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      blocks.push(JSON.parse(m[1].trim()));
    } catch (e) {
      blocks.push({ parse_error: true, raw: m[1].slice(0, 100) });
    }
  }
  return blocks;
}

export function extractBodyLinks(html) {
  const bodyMatch = html.match(/<\/header>([\s\S]*?)<footer/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const links = [];
  for (const m of body.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1];
    const anchor = stripTags(m[2]);
    if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) continue;
    const slug = href.replace(/^\.\.\//, "").replace(/^\.\//, "").replace(/\.html$/, "");
    links.push({ href: slug, anchor });
  }
  return links;
}

export function extractWordCount(html) {
  return stripTags(html).split(/\s+/).filter(Boolean).length;
}

export function extractDates(html) {
  const result = { published: null, modified: null, raw: [] };
  const pat = /<(?:time|meta)[^>]*(?:datetime|content)=["']([^"']*(?:\d{4})[^"']*)["'][^>]*>/gi;
  let m;
  while ((m = pat.exec(html)) !== null) result.raw.push(m[1]);
  const textDate = html.match(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},\s+20\d\d/i);
  if (textDate) result.raw.push(textDate[0]);
  const modified = html.match(/updated?\s*:\s*/i);
  if (modified) result.modified = "latest-revision-block-present";
  return result;
}

/* ---------- Cluster pillars (canonical, mirrors site_audit) ---------- */

export const CLUSTER_PILLARS = {
  "Commission Rates": { pillar: "amazon-associates-commission-rates-2026", strategic_value: 0.9 },
  "Commission Cuts": { pillar: "amazon-2026-commission-cuts", strategic_value: 0.95 },
  "Earnings & Payout": { pillar: "amazon-affiliate-profit-per-sale-guide", strategic_value: 0.85 },
  "Calculator & Break-even": { pillar: "amazon-affiliate-commission-calculator-guide", strategic_value: 0.7 },
  "Earnings Audit": { pillar: "how-to-audit-amazon-earnings", strategic_value: 0.8 },
  "Link Building": { pillar: "amazon-affiliate-link-tools-guide", strategic_value: 0.7 },
  "Directory & IndexNow": { pillar: "directory-listing-seo-guide", strategic_value: 0.55 },
  "Affiliate Networks": { pillar: "affiliate-network-comparison", strategic_value: 0.75 },
  "Earnings Report": { pillar: "amazon-product-earnings-report-csv-explained", strategic_value: 0.8 },
  "Backlink Building": { pillar: "how-to-build-backlinks-for-affiliate-site", strategic_value: 0.85 }
};

/* ---------- Feed files (optional real external data) ---------- */

export function loadKeywordFeed() {
  return loadJson(path.join(DATA_DIR, "keyword_research_feed.json"), { keywords: [], note: "no keyword research feed provided" });
}

export function loadSERPSnapshot() {
  return loadJson(path.join(DATA_DIR, "serp_snapshot.json"), { queries: [], note: "no SERP snapshot feed provided" });
}

export function loadCompetitorFeed() {
  return loadJson(path.join(DATA_DIR, "competitor_feed.json"), { competitors: [], note: "no competitor feed provided" });
}

export function loadBacklinkFeed() {
  return loadJson(path.join(DATA_DIR, "backlink_feed.json"), { links: [], domains: [], note: "no backlink feed provided" });
}

export function loadTrafficFeed() {
  return loadJson(path.join(DATA_DIR, "traffic_feed.json"), { pages: [], note: "no traffic feed provided" });
}

/* ---------- Primary site dataset ---------- */

export function loadSiteData({ includeHTML = true } = {}) {
  const audit = loadJson(AUDIT_PATH, {});
  const auditArticles = Array.isArray(audit.phase1_inventory?.articles) ? audit.phase1_inventory.articles : [];

  const articles = [];
  const toolPages = SITE_PAGES.map(p => ({ ...p, slug: p.url.replace(".html", ""), isTool: true }));
  const unreadable = [];

  if (fs.existsSync(BLOGS_DIR)) {
    const files = fs.readdirSync(BLOGS_DIR).filter(f => f.endsWith(".html") && !/daily-(audit|calculator)/.test(f));
    for (const file of files) {
      const slug = file.replace(".html", "");
      let html = "";
      try {
        html = fs.readFileSync(path.join(BLOGS_DIR, file), "utf-8");
      } catch (e) {
        unreadable.push({ slug, error: e.message });
        continue;
      }
      const auditRow = auditArticles.find(a => a.slug === slug) || {};

      const bodyLinks = extractBodyLinks(html);
      const headings = extractHeadings(html);
      const wordCount = extractWordCount(html);
      const structuredData = extractStructuredData(html);

      articles.push({
        slug,
        file,
        url: auditRow.url || `https://amzloss.com/blogs/${file}`,
        title: extractTitle(html),
        h1: extractH1(html),
        meta_description: extractMetaDescription(html),
        headings,
        html,
        word_count: wordCount,
        body_links: bodyLinks,
        body_links_slugs: bodyLinks.map(l => l.href),
        internal_inbound: auditRow.internal_inbound ?? 0,
        internal_outbound: auditRow.internal_outbound ?? bodyLinks.length,
        seo_quality: auditRow.seo_quality ?? 0,
        seo_checks: auditRow.seo_checks ?? [],
        classification: auditRow.classification ?? { verdict: "KEEP", note: "not in audit" },
        importance: auditRow.importance ?? "LOW",
        primary_query: auditRow.primary_query || slug.replace(/-/g, " "),
        secondary_queries: auditRow.secondary_queries || [],
        entities: auditRow.entities || [],
        search_intent: auditRow.search_intent || "informational",
        topic_cluster: auditRow.topic_cluster || null,
        pillar: auditRow.pillar || null,
        orphan: auditRow.orphan ?? false,
        underlinked: auditRow.underlinked ?? false,
        content_type: auditRow.content_type || "editorial",
        cannibalization: auditRow.cannibalization || [],
        dates: extractDates(html),
        structured_data_types: structuredData.map(sd => sd["@type"] || "unknown"),
        has_canonical: /\?rel=['"]canonical['"]/.test(html) || /<link[^>]*rel=["']canonical["']/i.test(html),
        has_main: /<main/.test(html),
        has_faq: /<h2[^>]*>\s*(faq|common questions|frequently asked)/i.test(stripTags(html).replace(/<\/h2>/gi, " ")) || /ld\+json[\s\S]*faq/i.test(html),
        has_images: /<img/.test(html),
        has_jsonld: structuredData.length > 0,
        text_preview: stripTags(html).slice(0, 4000)
      });
    }
  } else {
    unreadable.push({ error: `blogs dir not found at ${BLOGS_DIR}` });
  }

  // Build cluster map from audit articles that have a cluster + canonical pillars
  const clusters = {};
  for (const a of articles) {
    if (a.topic_cluster) {
      if (!clusters[a.topic_cluster]) {
        const pillarConfig = CLUSTER_PILLARS[a.topic_cluster] || { pillar: a.pillar || null, strategic_value: 0.5 };
        clusters[a.topic_cluster] = {
          name: a.topic_cluster,
          pillar: pillarConfig.pillar,
          strategic_value: pillarConfig.strategic_value,
          articles: [],
          intents: new Set()
        };
      }
      clusters[a.topic_cluster].articles.push(a.slug);
      clusters[a.topic_cluster].intents.add(a.search_intent);
    }
  }
  for (const k of Object.keys(clusters)) {
    clusters[k].articles = clusters[k].articles;
    clusters[k].intents = [...clusters[k].intents];
  }

  const graphSummary = audit.phase2_relationship_graph || { nodes: articles.length, relationship_counts: {} };

  return {
    audit,
    articles,
    toolPages,
    clusters,
    clusterPillars: CLUSTER_PILLARS,
    graph: graphSummary,
    link_opportunities: audit.phase3_link_opportunities || [],
    network_summary: audit.phase4_network_summary || {},
    cannibalization_cases: audit.phase7_cannibalization || [],
    priority_queue: audit.phase8_priority_queue || [],
    top_20: audit.phase9_top_20 || [],
    unreadable
  };
}

export function articleBySlug(site, slug) {
  return site.articles.find(a => a.slug === slug) || site.toolPages.find(t => t.slug === slug);
}