/* AmzLoss SEO Intelligence — Three Kings On-Page Optimization Audit
   Evaluates title tag, H1, and first paragraph for every LHF opportunity.

   Rules:
   - Keyword must appear naturally in all 3 locations (not forced)
   - No keyword stuffing
   - No generic openings (in today's digital world, etc.)
   - Direct question queries get immediate answers
   - Semantic relevance counts — exact match not required */

import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROVENANCE } from "./provenance.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DATA_DIR = path.join(__dirname, "../data/");

const BASE = "https://amzloss.com";
const USER_AGENT = "AmzLoss-ThreeKings/1.0";
const TIMEOUT_MS = 15000;

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": USER_AGENT } }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", c => { body += c; if (body.length > 300000) { body = body.slice(0, 300000); req.destroy(); } });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error("timeout")));
  });
}

function scoreKeywordPresence(keyword, text) {
  if (!text || !keyword) return { present: false, position: -1, exact: false, variant: false };
  const lowerText = text.toLowerCase();
  const lowerKw = keyword.toLowerCase();
  const words = lowerKw.split(/\s+/);
  const exactIdx = lowerText.indexOf(lowerKw);
  let variant = false;
  for (const w of words) {
    if (w.length >= 4 && lowerText.includes(w)) { variant = true; break; }
  }
  return {
    present: exactIdx !== -1 || variant,
    position: exactIdx !== -1 ? exactIdx : -1,
    exact: exactIdx !== -1,
    variant
  };
}

function scoreTitle(keyword, title) {
  const result = { current: title || "", keyword_present: false, keyword_position: -1, semantic_score: 0, status: "PASS", recommendation: null };
  if (!title) { result.status = "REVISE"; result.recommendation = "Page has no title — add one immediately."; return result; }
  const check = scoreKeywordPresence(keyword, title);
  result.keyword_present = check.present;
  result.keyword_position = check.position;

  if (!check.present) {
    result.status = "REVISE";
    result.semantic_score = 20;
    result.recommendation = `Target keyword "${keyword}" not found in title "${title}". Move keyword closer to the beginning.`;
    return result;
  }

  const lowerTitle = title.toLowerCase();
  const kwWords = keyword.toLowerCase().split(/\s+/);
  const titleWords = lowerTitle.split(/\s+/);
  let matchCount = 0;
  for (const w of kwWords) {
    if (titleWords.includes(w)) matchCount++;
  }
  result.semantic_score = Math.round((matchCount / kwWords.length) * 100);

  if (check.position > 55) {
    result.status = "REVISE";
    result.recommendation = `Keyword appears too late in title (char ${check.position}). Move it to the first 55 characters for maximum impact.`;
    return result;
  }
  if (title.length > 70) {
    result.status = "REVISE";
    result.recommendation = `Title is ${title.length} chars — trim to 60 or fewer. "${title.slice(0, 60)}..."`;
    return result;
  }
  result.status = "PASS";
  return result;
}

function scoreH1(keyword, h1, title) {
  const result = { current: h1 || "", keyword_present: false, semantic_alignment: 0, status: "PASS", recommendation: null };
  if (!h1) { result.status = "REVISE"; result.recommendation = "Page has no H1 — add one immediately."; return result; }
  const check = scoreKeywordPresence(keyword, h1);
  result.keyword_present = check.present;

  const lowerH1 = h1.toLowerCase();
  const lowerTitle = (title || "").toLowerCase();
  const sharedWords = lowerH1.split(/\s+/).filter(w => w.length > 3 && lowerTitle.includes(w));
  result.semantic_alignment = Math.round((sharedWords.length / Math.max(lowerH1.split(/\s+/).filter(w => w.length > 3).length, 1)) * 100);

  if (!check.present) {
    result.status = "REVISE";
    result.recommendation = `H1 does not contain keyword "${keyword}". Ensure H1 reflects the page's main topic.`;
    return result;
  }
  if (!check.exact && check.variant) {
    result.status = "REVISE";
    result.recommendation = `H1 contains only a keyword variant. Use the exact keyword "${keyword}" in the H1.`;
    return result;
  }
  result.status = "PASS";
  return result;
}

function scoreOpening(keyword, firstSentence, firstParagraph, searchIntent) {
  const result = { first_sentence: firstSentence || "", first_paragraph: firstParagraph || "", keyword_present: false, intent_satisfied: false, generic_opening: false, status: "PASS", recommendation: null };
  const allText = (firstSentence + " " + (firstParagraph || "")).toLowerCase();
  const lowerKw = (keyword || "").toLowerCase();
  const kwWords = lowerKw.split(/\s+/);

  result.keyword_present = allText.includes(lowerKw) || kwWords.some(w => w.length >= 5 && allText.includes(w));

  const GENERIC_OPENINGS = [
    "in today's digital", "in this digital age", "in the world of", "in the ever-changing",
    "in recent years", "in this article", "in this post", "in this guide",
    "in today's world", "in this day and age", "in this comprehensive",
    "are you looking", "looking for a way", "if you're looking", "if you are looking",
    "do you want to", "want to learn", "want to know",
    "seo is important", "search engine optimization is", "affiliate marketing is",
    "it is important to", "it's important to", "let me tell you",
    "welcome to our", "welcome to this", "thanks for reading",
    "here at", "here at amzloss", "in this article we will",
    "we will explore", "we will discuss", "we will cover"
  ];
  const lowerSent = (firstSentence || "").toLowerCase().trim();
  result.generic_opening = GENERIC_OPENINGS.some(g => lowerSent.startsWith(g) || lowerSent.includes(g));

  const isQuestion = (keyword || "").trim().endsWith("?") ||
    ["how", "what", "why", "when", "where", "which", "who"].includes((keyword || "").split(/\s+/)[0]?.toLowerCase());
  const intentKeywords = {
    informational: ["how", "what", "why", "when", "where", "which", "best", "difference", "compare"],
    transactional: ["calculator", "audit", "check", "submit", "verify", "estimate", "build", "tool"],
    commercial: ["best", "top", "vs", "compare", "review", "alternative", "comparison"]
  };
  const kwLower = (keyword || "").toLowerCase();
  let detectedIntent = "informational";
  for (const [intent, triggers] of Object.entries(intentKeywords)) {
    if (triggers.some(t => kwLower.includes(t))) { detectedIntent = intent; break; }
  }

  result.intent_satisfied = result.keyword_present || (firstParagraph || "").length > 30;

  if (!result.keyword_present && !result.intent_satisfied) {
    result.status = "REVISE";
    result.recommendation = "First paragraph does not address the keyword or provide clear value. Rewrite to answer the query immediately.";
    return result;
  }

  if (isQuestion && result.keyword_present) {
    result.intent_satisfied = true;
  }

  if (result.generic_opening && !result.keyword_present) {
    result.status = "REVISE";
    result.recommendation = `Generic opening detected. Answer the user's question or state the topic immediately — no fluff.`;
    return result;
  }

  if (firstSentence && firstSentence.length > 0 && !result.keyword_present) {
    const kwShort = kwWords.find(w => w.length >= 5);
    if (!kwShort || !firstSentence.toLowerCase().includes(kwShort)) {
      result.status = "REVISE";
      result.recommendation = "First sentence doesn't address the keyword. Start with the answer or topic directly.";
      return result;
    }
  }

  result.status = "PASS";
  return result;
}

function extractPageContent(body) {
  const titleMatch = body.match(/<title>([^<]*)<\/title>/i);
  const h1Match = body.match(/<h1[^>]*>(.*?)<\/h1>/is);
  const title = titleMatch ? titleMatch[1].trim() : "";
  const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "";

  let firstParagraph = "";
  let firstSentence = "";
  const bodyMatch = body.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    const bodyText = bodyMatch[1];
    const pMatch = bodyText.match(/<p[^>]*>(.*?)<\/p>/is);
    if (pMatch) {
      const rawPara = pMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      firstParagraph = rawPara;
      const periodIdx = rawPara.indexOf(".");
      if (periodIdx > 5 && periodIdx < 300) {
        firstSentence = rawPara.slice(0, periodIdx + 1).trim();
      } else {
        firstSentence = rawPara.split(/[,;:\n]/)[0].trim();
      }
    }
  }

  return { title, h1, firstSentence, firstParagraph };
}

export async function auditPage({ keyword, url, searchIntent }) {
  if (!url) return { status: "UNAVAILABLE", reason: "No URL provided", title: null, h1: null, opening: null, overall_status: "NEEDS_OPTIMIZATION" };
  const targetUrl = url.startsWith("http") ? url : `${BASE}/${url}`;
  try {
    const res = await get(targetUrl);
    if (res.status === 404 || res.status >= 500) {
      return { status: "PAGE_ERROR", http_status: res.status, title: null, h1: null, opening: null, overall_status: "NEEDS_OPTIMIZATION" };
    }
    const { title, h1, firstSentence, firstParagraph } = extractPageContent(res.body);
    const titleResult = scoreTitle(keyword, title);
    const h1Result = scoreH1(keyword, h1, title);
    const openingResult = scoreOpening(keyword, firstSentence, firstParagraph, searchIntent);

    const overallStatus =
      titleResult.status === "PASS" && h1Result.status === "PASS" && openingResult.status === "PASS"
        ? "PASS"
        : "NEEDS_OPTIMIZATION";

    return {
      status: "OK",
      three_kings_status: {
        title: titleResult.status,
        h1: h1Result.status,
        opening: openingResult.status
      },
      title: titleResult,
      h1: h1Result,
      opening: openingResult,
      overall_status: overallStatus
    };
  } catch (e) {
    return { status: "FETCH_ERROR", reason: e.message, title: null, h1: null, opening: null, overall_status: "NEEDS_OPTIMIZATION" };
  }
}

export function storeThreeKingsAudit(results, { query } = {}) {
  const report = {
    generated_at: new Date().toISOString(),
    source: "three_kings_audit",
    query: query || null,
    summary: threeKingsSummary(results),
    audits: results
  };
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, "three_kings_audit.json"), JSON.stringify(report, null, 2), "utf-8");
  return report;
}

export async function threeKingsAudit({ opportunities }) {
  const results = [];
  for (const opp of opportunities) {
    const audit = await auditPage({
      keyword: opp.query || opp.target_keyword,
      url: opp.current_url,
      searchIntent: opp.search_intent
    });
    results.push({
      query: opp.query,
      url: opp.current_url,
      page_slug: opp.page_slug,
      average_position: opp.average_position,
      opportunity_score: opp.opportunity_score,
      tier: opp.tier,
      three_kings_status: audit.three_kings_status,
      title_check: audit.title,
      h1_check: audit.h1,
      opening_check: audit.opening,
      overall_status: audit.overall_status
    });
  }
  return results;
}

export function threeKingsSummary(audits) {
  const passCount = audits.filter(a => a.overall_status === "PASS").length;
  const failCount = audits.filter(a => a.overall_status === "NEEDS_OPTIMIZATION").length;
  const byKing = {
    title: { pass: audits.filter(a => a.three_kings_status?.title === "PASS").length, fail: audits.filter(a => a.three_kings_status?.title === "REVISE").length },
    h1: { pass: audits.filter(a => a.three_kings_status?.h1 === "PASS").length, fail: audits.filter(a => a.three_kings_status?.h1 === "REVISE").length },
    opening: { pass: audits.filter(a => a.three_kings_status?.opening === "PASS").length, fail: audits.filter(a => a.three_kings_status?.opening === "PASS").length }
  };
  return {
    total_audited: audits.length,
    pass: passCount,
    needs_optimization: failCount,
    pass_rate_pct: audits.length > 0 ? Math.round(passCount / audits.length * 100) : 0,
    by_king: byKing,
    three_kings_status: failCount > 0 ? "NEEDS_OPTIMIZATION" : "PASS"
  };
}