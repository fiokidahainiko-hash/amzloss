/* AmzLoss — shared blog helpers: tool mapping + toolbar HTML.
   Used by the article toolbar inserter and the daily blog automation. */

export const TOOLS = {
  calculator: { href: "../calculator.html", label: "Amazon Commission Calculator", icon: "🧮", blurb: "calculate what any Amazon sale earns" },
  breakeven: { href: "../breakeven.html", label: "Break-Even Calculator", icon: "⚖️", blurb: "find the price point that actually pays" },
  rates: { href: "../rates.html", label: "Current Rate Table", icon: "📊", blurb: "see the live 2026 rates by category and market" },
  audit: { href: "../audit.html", label: "Earnings Audit", icon: "🔍", blurb: "check your Amazon earnings report for underpayment" },
  networks: { href: "../networks.html", label: "Network Calculator", icon: "🌐", blurb: "compare Amazon vs ShareASale, CJ, Impact & Awin" },
  links: { href: "../link-tools.html", label: "Link Tools", icon: "🔗", blurb: "build clean links, count backlinks and check them live" },
  submit: { href: "../submit.html", label: "URL Submitter", icon: "📤", blurb: "ping search engines and IndexNow for free" },
  directory: { href: "../directory.html", label: "Backlink Directory", icon: "📚", blurb: "get a free, relevant backlink" }
};

export const TOOL_NAMES = {
  calculator: "calculator", breakeven: "breakeven", rates: "rates", audit: "audit",
  networks: "networks", links: "links", submit: "submit", directory: "directory"
};

/* Map each blog filename to the tool it belongs to. */
export const POST_TOOL = {
  "amazon-2026-commission-cuts.html": "rates",
  "amazon-halo-commission-gone.html": "rates",
  "why-earnings-dropped-but-clicks-didnt.html": "audit",
  "amazon-associates-missing-commission.html": "audit",
  "amazon-product-earnings-report-csv-explained.html": "audit",
  "amazon-associates-commission-rates-2026.html": "rates",
  "amazon-commission-rates-by-category.html": "rates",
  "amazon-rate-change-alert-guide.html": "rates",
  "affiliate-network-comparison.html": "networks",
  "shareasale-vs-cj-vs-impact.html": "networks",
  "how-to-get-approved-affiliate-networks.html": "networks",
  "amazon-affiliate-link-tools-guide.html": "links",
  "amazon-links-nofollow-guide.html": "links",
  "amazon-associates-deep-linking-guide.html": "links",
  "free-backlink-directories-for-affiliates.html": "directory",
  "how-to-build-backlinks-for-affiliate-site.html": "directory",
  "directory-listing-seo-guide.html": "directory",
  "how-to-check-amazon-affiliate-underpayment.html": "audit",
  "how-to-audit-amazon-earnings.html": "audit",
  "how-to-verify-amazon-affiliate-commission.html": "audit",
  "amazon-associates-claim-report-guide.html": "audit",
  "amazon-earnings-report-columns-guide.html": "audit",
  "amazon-affiliate-commission-calculator-guide.html": "calculator",
  "how-much-do-amazon-affiliates-make.html": "calculator",
  "amazon-affiliate-profit-per-sale-guide.html": "calculator",
  "amazon-affiliate-breakeven-calculator-guide.html": "breakeven",
  "price-points-breakeven-analysis.html": "breakeven",
  "amazon-affiliate-revenue-break-even-strategy.html": "breakeven",
  "how-to-submit-url-to-search-engines.html": "submit",
  "url-submission-checklist.html": "submit",
  "indexnow-setup-guide.html": "submit"
};

export function toolbarHTML(toolKey) {
  const t = TOOLS[toolKey];
  if (!t) return "";
  return '<div class="tools-bar"><span class="tools-bar-icon">' + t.icon + '</span><span class="tools-bar-label">Free tool:</span><a href="' + t.href + '">' + t.label + '</a> — ' + t.blurb + '.</div>';
}