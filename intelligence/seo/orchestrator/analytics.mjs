/* AmzLoss SEO Intelligence — Analytics / Conversion Layer
   Connects SEO to business outcomes. Never fabricates data. */

import fs from "node:fs";
import { ev, evN, DATA_UNAVAILABLE } from "./seo_evidence.mjs";
import { registerLocalFeedAdapter } from "./data_sources.mjs";

const ANALYTICS_FEED_PATH = "C:/Users/DELL/amzloss/intelligence/seo/data/analytics_feed.json";

registerLocalFeedAdapter("analytics", ANALYTICS_FEED_PATH);

export function loadAnalyticsFeed() {
  if (!fs.existsSync(ANALYTICS_FEED_PATH)) return { landing_pages: [], conversions: [], events: [] };
  return JSON.parse(fs.readFileSync(ANALYTICS_FEED_PATH, "utf-8"));
}

export function landingPagePerformance() {
  const feed = loadAnalyticsFeed();
  return (feed.landing_pages || []).map(p => ({
    url: p.url,
    sessions: evN(p.sessions, { source: "analytics" }),
    engaged_sessions: evN(p.engaged_sessions, { source: "analytics" }),
    avg_engagement_time: evN(p.avg_engagement_time, { source: "analytics" }),
    conversions: evN(p.conversions, { source: "analytics" }),
    conversion_rate: p.conversions && p.sessions ? evN(p.conversions / p.sessions, { source: "analytics" }) : DATA_UNAVAILABLE,
    revenue: evN(p.revenue, { source: "analytics" })
  }));
}

export function toolUsage() {
  const feed = loadAnalyticsFeed();
  return (feed.events || [])
    .filter(e => e.event_name === "tool_use" || e.event_name === "calculator_use")
    .map(e => ({ tool: e.tool || e.page, uses: evN(e.count, { source: "analytics" }) }));
}

export function affiliateClicks() {
  const feed = loadAnalyticsFeed();
  return (feed.events || [])
    .filter(e => e.event_name === "affiliate_click" || e.event_name === "outbound_click")
    .map(e => ({ destination: e.destination, clicks: evN(e.count, { source: "analytics" }) }));
}

export function emailSignups() {
  const feed = loadAnalyticsFeed();
  return (feed.events || [])
    .filter(e => e.event_name === "email_signup")
    .map(e => ({ page: e.page, signups: evN(e.count, { source: "analytics" }) }));
}

export function trafficValueByQuery() { return []; }

export function conversionValueByKeyword() { return []; }

export function analyticsSummary() {
  const pages = landingPagePerformance();
  const totalSessions = pages.filter(p => p.sessions.available).reduce((s, p) => s + p.sessions.value, 0);
  const totalConversions = pages.filter(p => p.conversions.available).reduce((s, p) => s + p.conversions.value, 0);
  const totalRevenue = pages.filter(p => p.revenue.available).reduce((s, p) => s + p.revenue.value, 0);
  return {
    feed_available: pages.length > 0,
    total_sessions: totalSessions,
    total_conversions: totalConversions,
    total_revenue: totalRevenue,
    conversion_rate: totalSessions ? totalConversions / totalSessions : 0,
    top_converting_pages: pages
      .filter(p => p.conversion_rate.available)
      .sort((a, b) => b.conversion_rate.value - a.conversion_rate.value)
      .slice(0, 10)
  };
}