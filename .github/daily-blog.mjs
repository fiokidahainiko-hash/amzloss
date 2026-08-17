/* AmzLoss — daily morning blog automation.
   Runs via GitHub Actions on a cron. Each run:
     - Skips if a post was already published today.
     - If tool/config files changed since the last post, writes an "update"
       post about that change.
     - Otherwise rotates through the 8 tools, publishing a fresh tip post.
   Generates the blog HTML page, appends it to js/blog.js + sitemap.xml,
   then prints CHANGED=1 so the workflow commits and pushes. */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TOOLS } from "./blog-tools.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STATE_FILE = path.join(__dirname, "blog-state.json");
const BLOGS_DIR = path.join(ROOT, "blogs");
const BLOG_JS = path.join(ROOT, "js", "blog.js");
const SITEMAP = path.join(ROOT, "sitemap.xml");

const CAT_BY_TOOL = {
  calculator: "Tools", breakeven: "Tools", rates: "Amazon", audit: "Tools",
  networks: "Networks", links: "Link Building", submit: "Tools", directory: "Link Building"
};

const ICON_BY_TOOL = {
  calculator: "🧮", breakeven: "⚖️", rates: "📊", audit: "🔍",
  networks: "🌐", links: "🔗", submit: "📤", directory: "📚"
};

const TOOL_ORDER = ["calculator", "rates", "audit", "breakeven", "networks", "links", "submit", "directory"];

/* Tip content bank: 3 variants per tool. Body paragraphs reference the
   tool so the toolbar + CTA always match. */
const TIPS = {
  calculator: [
    {
      title: "Why your Amazon commission is lower than the price tag",
      desc: "Amazon pays on the order amount after discounts, not the list price. Here is the math and how the calculator makes it instant.",
      faq: "Why is my Amazon commission lower than expected?",
      faqAns: "Commission is calculated on the eligible order amount after discounts and gift-wrap fees are excluded, not the sticker price. Enter the discounted amount in the calculator to get the true figure."
    },
    {
      title: "The 4% trap: when a high-ticket item pays less than a cheap one",
      desc: "A big price doesn't always mean a big commission. Compare real earnings per sale with the free calculator.",
      faq: "Does a more expensive product always earn more commission?",
      faqAns: "No. Commission is rate × eligible amount, so a 10% rate on a $40 item beats a 4% rate on a $90 item. Always compare rate and price together."
    },
    {
      title: "Calculating 2026 Amazon commission in three steps",
      desc: "Rate, eligible amount, multiply — the full 2026 commission formula, with the calculator doing the work.",
      faq: "How do I calculate my Amazon commission in 2026?",
      faqAns: "Take the category rate for your marketplace, apply it to the eligible order amount, and multiply. The AmzLoss commission calculator applies the current 2026 rate automatically."
    }
  ],
  rates: [
    {
      title: "The 2026 Amazon rate table: which categories held up",
      desc: "Electronics, beauty, home and more — how 2026 commission cuts landed, and where the current table stands.",
      faq: "Which Amazon categories were cut most in 2026?",
      faqAns: "Luxury and several physical-goods categories saw the deepest cuts, some by up to half. The live rate table shows every category and marketplace as of today."
    },
    {
      title: "Why your Amazon rate table and dashboard disagree",
      desc: "Amazon's published rates and the rates actually applied can differ by order date. How to check both.",
      faq: "Why does my Amazon earnings report not match the published rate table?",
      faqAns: "Rates apply by order date, not report date. A change mid-month splits your earnings into two different rates. The rate table shows the exact rate for every date."
    },
    {
      title: "How often do Amazon commission rates change?",
      desc: "Amazon can adjust rates quietly and mid-quarter. Here is how to track every change without checking manually.",
      faq: "How often does Amazon update commission rates?",
      faqAns: "There is no fixed schedule — Amazon has changed them mid-year and mid-quarter. Subscribe to the AmzLoss rate-change alerts to catch every update automatically."
    }
  ],
  audit: [
    {
      title: "Spotting underpaid Amazon commissions in your report",
      desc: "Your Product Earnings Report can quietly underpay. How the free audit finds it line by line.",
      faq: "Can Amazon underpay my commission?",
      faqAns: "Yes — wrong category rates, missing order lines and stale rate tables all cause underpayment. The AmzLoss audit compares every line against the correct 2026 rate for its order date."
    },
    {
      title: "Every column in the Amazon earnings report, decoded",
      desc: "Order ID, category, rate, fees, commission — know what each column means before you audit.",
      faq: "What does each column in the Amazon Product Earnings Report mean?",
      faqAns: "The report lists order ID, category, product, rate, fees and commission per line. The audit maps each to the expected 2026 rate and flags any that don't match."
    },
    {
      title: "What to do when the audit finds a possible shortfall",
      desc: "A flagged line is not proof of error. Here is how to verify it, then claim it with Amazon support.",
      faq: "What should I do after the audit flags a line?",
      faqAns: "Cross-check the flagged item against your dashboard for that order date, then use the claim export to attach the evidence to an Amazon Associates support case."
    }
  ],
  breakeven: [
    {
      title: "Find the price point that actually pays your time",
      desc: "Not every product is worth promoting. The break-even calculator shows which price points pay.",
      faq: "What is a break-even price point for affiliate content?",
      faqAns: "It is the sale amount at which your expected commission covers the time and effort you put into the content. The break-even calculator finds it for any product and rate."
    },
    {
      title: "Cheap vs expensive products: where the margin really is",
      desc: "Low-ticket items convert more but pay less. Compare real margins before choosing what to promote.",
      faq: "Should I promote cheap or expensive products as an affiliate?",
      faqAns: "Expensive items earn more per sale but convert worse and have more returns. The break-even tool balances conversion, rate and returns to show your true margin."
    },
    {
      title: "Why 2026 commission cuts changed your break-even point",
      desc: "A rate cut moves your break-even upward. Recalculate now so you stop promoting losing products.",
      faq: "Do 2026 rate cuts change my break-even point?",
      faqAns: "Yes. Lower rates mean you need more sales or higher prices to cover the same effort. Re-run the break-even calculator after every rate change to stay profitable."
    }
  ],
  networks: [
    {
      title: "ShareASale vs CJ vs Impact in 2026: a quick reality check",
      desc: "Commission tiers, approval odds, payout thresholds — how the big networks compare today.",
      faq: "Which affiliate network pays the best in 2026?",
      faqAns: "It depends on your niche. ShareASale and Impact have strong SaaS and fashion programs; CJ excels in big retail brands. The network calculator compares real rates side by side."
    },
    {
      title: "Getting approved by affiliate networks: what they check",
      desc: "Networks review your traffic, content and niche before approval. Present a site that passes.",
      faq: "How do I get approved by CJ, ShareASale or Impact?",
      faqAns: "They check your site's content quality, traffic sources and niche relevance. Publish genuine reviews with real traffic, and apply with a clean, complete site."
    },
    {
      title: "Amazon vs the networks: when to diversify",
      desc: "Amazon is easy to join but pays thin rates. Here is when adding networks actually pays off.",
      faq: "Should I use Amazon Associates or affiliate networks?",
      faqAns: "Amazon is the easiest start but has thinner rates. Networks like ShareASale and CJ offer higher percentages for the right niches — compare the numbers before deciding."
    }
  ],
  links: [
    {
      title: "The one tracking tag mistake that loses you commissions",
      desc: "A missing or overwritten tag means unpaid clicks. Build clean links that keep your tag.",
      faq: "What happens if my Amazon affiliate link has no tag?",
      faqAns: "The click isn't credited to you, so the purchase earns nothing. Always append your tracking ID and strip old parameters — the link tools do both in one step."
    },
    {
      title: "rel=nofollow vs rel=sponsored: staying compliant in 2026",
      desc: "Amazon and the FTC require sponsored disclosure. Use the right attribute every time.",
      faq: "Do Amazon affiliate links need rel=nofollow or rel=sponsored?",
      faqAns: "Amazon's operating agreement and FTC guidance call for a sponsored disclosure. The link tools generate the compliant snippet automatically."
    },
    {
      title: "How to check whether a backlink is still live",
      desc: "Links disappear during redesigns and cleanups. A monthly check keeps your link equity intact.",
      faq: "How often should I check my backlinks?",
      faqAns: "At least monthly. Sites redesign and clean up silently — the free backlink checker scans a page's live HTML for your link so nothing disappears unnoticed."
    }
  ],
  submit: [
    {
      title: "Get new pages indexed in hours with IndexNow",
      desc: "Bing, Yandex, Seznam and Naver respond to IndexNow in minutes. Here is the setup.",
      faq: "Does IndexNow really index pages that fast?",
      faqAns: "Participating engines (Bing, Yandex, Seznam, Naver) typically crawl IndexNow-submitted URLs within minutes to a few hours, far faster than waiting on a crawl."
    },
    {
      title: "The free URL submission checklist for every new page",
      desc: "Meta, sitemap, IndexNow ping, internal links — a repeatable checklist that gets pages found.",
      faq: "What is the fastest free way to get a page indexed?",
      faqAns: "Submit it via IndexNow, add it to your sitemap, and link to it from an already-indexed page. The free submitter does the IndexNow ping automatically."
    },
    {
      title: "Which search-engine pings still work in 2026?",
      desc: "Most old ping services are dead. The honest list of what actually still gets your URL noticed.",
      faq: "Do old-style search engine pings still work?",
      faqAns: "Most retired services are gone. IndexNow and a proper sitemap are what actually work in 2026 — the URL submitter handles the IndexNow ping for you."
    }
  ],
  directory: [
    {
      title: "How directory backlinks still help in 2026",
      desc: "A relevant directory link is one small, natural signal. Why quality beats quantity.",
      faq: "Do directory backlinks still help SEO in 2026?",
      faqAns: "Relevant, curated directory links are still a natural signal — one of many. Spam directories can hurt; a quality directory with real editorial review is safe and useful."
    },
    {
      title: "What makes a directory listing rank (and what gets you removed)",
      desc: "Write a listing that converts, and keep the reciprocal link live or you'll be delisted.",
      faq: "Why would a site be removed from a directory?",
      faqAns: "Directories run link audits. If you stop linking back or your site goes dead, your listing is removed — that's exactly what the AmzLoss weekly audit does."
    },
    {
      title: "Link back first: how reciprocal links keep directories honest",
      desc: "The verification snippet proves your link is real. Why proof-first listings beat auto-submit farms.",
      faq: "Why do quality directories require me to link back first?",
      faqAns: "A verification snippet proves the site is real and keeps the directory free of link farms. You add the snippet, the directory verifies it's live, then you get listed."
    }
  ]
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch (e) { return {}; }
}
function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function gitChangedFilesSince(date) {
  try {
    const out = execSync('git log --since="' + date + ' 00:00:00" --name-only --pretty=format:', { cwd: ROOT, encoding: "utf8" });
    return out.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch (e) { return []; }
}

const WATCHED_PATHS = [
  "js/rates.js", "pricing.html", "js/paystack.js", "js/directory.js",
  "js/sponsors.js", "js/blog.js", "assets/css/style.css", "sitemap.xml"
];

function detectUpdateTopic(changedFiles) {
  const f = changedFiles.join("\n").toLowerCase();
  if (f.includes("pricing") || f.includes("paystack")) return "audit";
  if (f.includes("rates")) return "rates";
  if (f.includes("directory")) return "directory";
  if (f.includes("sponsors")) return "audit";
  if (f.includes("blog")) return "calculator";
  return "";
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70);
}

function metaEsc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildPage(post) {
  const { slug, title, desc, keywords, faq, faqAns, tool, dateISO, dateDisplay, bodyHtml } = post;
  const url = "https://amzloss.com/blogs/" + slug + ".html";
  const t = TOOLS[tool];
  const bar = '<div class="tools-bar"><span class="tools-bar-icon">' + t.icon + "</span><span class=\"tools-bar-label\">Free tool:</span><a href=\"" + t.href + "\">" + t.label + "</a> — " + t.blurb + ".</div>";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="msvalidate.01" content="007E92F701F1F5163F3EE66C2650600A" />
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-LRXMHQECWQ"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-LRXMHQECWQ');
  
  </script>
  <!-- Google AdSense -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1294523315450009" crossorigin="anonymous"></script>
  <title>${metaEsc(title)} | AmzLoss</title>
  <meta name="description" content="${metaEsc(desc)}">
  <meta name="keywords" content="${metaEsc(keywords)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:site_name" content="AmzLoss">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${metaEsc(title)}">
  <meta property="og:description" content="${metaEsc(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="https://amzloss.com/assets/img/og-cover.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <link rel="icon" href="../assets/img/favicon.ico">
  <link rel="icon" type="image/png" sizes="48x48" href="../assets/img/favicon-48x48.png">
  <link rel="icon" type="image/svg+xml" href="../assets/img/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/img/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="../assets/img/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="../assets/img/apple-touch-icon.png">
  <link rel="manifest" href="../assets/img/site.webmanifest">
  <meta name="msapplication-TileColor" content="#4b286d">
  <meta name="theme-color" content="#4b286d">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": ${JSON.stringify(title)},
    "description": ${JSON.stringify(desc)},
    "image": "https://amzloss.com/assets/img/og-cover.png",
    "author": { "@type": "Organization", "name": "AmzLoss", "url": "https://amzloss.com/about.html" },
    "publisher": { "@type": "Organization", "name": "AmzLoss", "logo": "https://amzloss.com/assets/img/logo.svg" },
    "datePublished": "${dateISO}",
    "dateModified": "${dateISO}",
    "mainEntityOfPage": "${url}"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://amzloss.com/" },
      { "@type": "ListItem", "position": 2, "name": "Learn", "item": "https://amzloss.com/blogs.html" },
      { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(title)}, "item": "${url}" }
    ]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": ${JSON.stringify(faq)}, "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(faqAns)} } }
    ]
  }
  </script>
  </head>
<body>
<div class="launch-bar">🎉 The full tool is <strong>free forever</strong> — rate table, calculators, full audit and export. Paid plans are optional extras (ad-free, priority help). <a href="../pricing.html">Learn more</a></div>
<header class="site-header"><div class="container nav">
  <a class="brand" href="../index.html"><img class="brand-logo" src="../assets/img/favicon.svg" alt="AmzLoss" width="30" height="30">AmzLoss</a>
  <nav class="nav-links" aria-label="Main navigation">      <div class="nav-item">
    <button class="nav-toggle" aria-haspopup="true">Amazon Tools<span class="chev">▾</span></button>
    <div class="dropdown">
      <a href="../calculator.html">Commission Calculator</a>
      <a href="../breakeven.html">Break-Even Calculator</a>
      <a href="../rates.html">Current Rates</a>
      <a href="../audit.html">Earnings Audit</a>
    </div>
  </div>
  <div class="nav-item">
    <button class="nav-toggle" aria-haspopup="true">More Tools<span class="chev">▾</span></button>
    <div class="dropdown">
      <a href="../networks.html">Network Calculator</a>
      <a href="../link-tools.html">Link Tools</a>
      <a href="../submit.html">URL Submitter</a>
      <a href="../directory.html">Backlink Directory</a>
    </div>
  </div>
  <a href="../pricing.html">Pricing</a>
  <a href="../blogs.html">Learn</a>
  <a href="../faq.html">FAQ</a>
  <a href="../about.html">About</a></nav>
  <div class="nav-cta"><a class="btn btn-primary" href="../audit.html">Audit my report</a></div>
</div></header>

<section class="section"><div class="container page-narrow">
  <p style="color:var(--muted);font-size:0.9rem;">${dateDisplay} · 6 min read</p>
  <h1>${metaEsc(title)}</h1>

  ${bar}

${bodyHtml}

  <div class="faq" style="margin-top:28px;">
    <details><summary>${metaEsc(faq)}</summary><p>${metaEsc(faqAns)}</p></details>
  </div>

  <div class="cta-band" style="padding:28px 26px;margin-top:28px;">
    <h2 style="font-size:1.3rem;margin:0 0 6px;">Try it free</h2>
    <p style="margin:0 0 16px;font-size:0.9rem;">Use the ${t.label} free, right now — no sign-up, works in your browser.</p>
    <a class="btn btn-primary" href="${t.href}">Open the ${t.label}</a>
  </div>
</div></section>

<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-col">
        <a class="brand" href="../index.html"><img class="brand-logo" src="../assets/img/favicon.svg" alt="AmzLoss" width="30" height="30">AmzLoss</a>
        <p style="color:var(--muted);max-width:280px;margin-top:10px;">The independent check on Amazon Associates payouts.</p>
      </div>
      <div class="footer-col">
        <h4>Tools</h4>
        <a href="../calculator.html">Commission Calculator</a>
        <a href="../audit.html">Earnings Audit</a>
        <a href="../rates.html">Current Rate Table</a>
        <a href="../networks.html">Network Calculator</a>
        <a href="../directory.html">Backlink Directory</a>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <a href="../about.html">About</a>
        <a href="../pricing.html">Pricing</a>
        <a href="../contact.html">Contact</a>
        <a href="../blogs.html">Learn</a>
        <a href="../faq.html">FAQ</a>
        <a href="../sponsor.html">Sponsor login</a>
      </div>
      <div class="footer-col">
        <h4>Legal</h4>
        <a href="../privacy.html">Privacy</a>
        <a href="../terms.html">Terms</a>
        <a href="../disclosure.html">Affiliate Disclosure</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 AmzLoss. All rights reserved.</span>
      <span>Contact: <a href="mailto:admin@amzloss.com">admin@amzloss.com</a></span>
      <span>Independent of Amazon or Amazon Associates.</span>
      <span><a href="../sitemap.html">Sitemap</a></span>
      <span><a href="../status.html">Status</a></span>
    </div>
  </div>
</footer>

<script src="../js/nav.js"></script><script>if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("../sw.js").catch(function(){})});}</script>
</body>
</html>
`;
}

function makeBody(tool, tip, mode, dateDisplay) {
  const t = TOOLS[tool];
  const isUpdate = mode === "update";
  const head = isUpdate
    ? "<p>Here's what changed on AmzLoss, and what it means for you. It's part of our regular site updates — all tools stay free, so these changes are improvements, not paywalls.</p>"
    : "<p>Every serious affiliate publisher checks their numbers regularly. This post is part of a daily series from AmzLoss — one practical tip per tool, every morning. Today: <strong>" + tip.title + ".</strong></p>";
  return head + "\n\n  <h2>" + tip.title + "</h2>\n  <p>" + tip.desc + "</p>\n\n  <p>The quick answer: " + tip.faqAns + "</p>\n\n  <p>To apply this yourself, open the free " + t.label + " — it runs entirely in your browser, needs no sign-up, and shows you the exact numbers for your situation. Bookmark it and check back whenever Amazon publishes a change.</p>";
}

function main() {
  const dateISO = todayStr();
  const state = readState();
  if (state.lastDate === dateISO) {
    console.log("Already posted today; skipping.");
    console.log("CHANGED=0");
    return;
  }

  const dateObj = new Date(dateISO + "T00:00:00Z");
  const dateDisplay = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

  const changed = gitChangedFilesSince(state.lastDate || "2000-01-01");
  const watchChanged = changed.filter((c) => WATCHED_PATHS.some((w) => c.includes(w)));

  let tool, tip, mode;
  let nextState = { ...state, lastDate: dateISO };
  if (watchChanged.length) {
    const updateTool = detectUpdateTopic(watchChanged) || "audit";
    tool = updateTool;
    tip = TIPS[tool][0];
    mode = "update";
  } else {
    const idx = state.nextToolIndex || 0;
    tool = TOOL_ORDER[idx % TOOL_ORDER.length];
    const variant = state.variantIndex && state.variantIndex[tool] ? state.variantIndex[tool] : 0;
    const bank = TIPS[tool];
    tip = bank[variant % bank.length];
    mode = "tip";
    nextState.variantIndex = { ...(state.variantIndex || {}), [tool]: variant + 1 };
    nextState.nextToolIndex = idx + 1;
  }

  const toolName = tool.charAt(0).toUpperCase() + tool.slice(1);
  const slug = "amzloss-daily-" + slugify(toolName) + "-" + dateISO;
  const keywords = toolName + " tips, amzloss " + tool + " guide, amazon affiliate " + tool + " " + dateISO;

  const post = {
    slug,
    title: tip.title + " (AmzLoss Daily)",
    desc: tip.desc,
    keywords,
    faq: tip.faq,
    faqAns: tip.faqAns,
    tool,
    dateISO,
    dateDisplay,
    bodyHtml: makeBody(tool, tip, mode, dateDisplay)
  };

  const html = buildPage(post);
  fs.writeFileSync(path.join(BLOGS_DIR, slug + ".html"), html);

  // Append to js/blog.js POSTS (insert as newest at top of its category block is complex; prepend to array).
  let blogJs = fs.readFileSync(BLOG_JS, "utf8");
  const newEntry = '    { cat: "' + CAT_BY_TOOL[tool] + '", icon: "' + ICON_BY_TOOL[tool] + '", title: ' + JSON.stringify(post.title) + ', date: "' + dateDisplay + '", read: "6 min", url: "blogs/' + slug + '.html", desc: ' + JSON.stringify(tip.desc) + " },";
  const insertIdx = blogJs.indexOf("var POSTS = [") + "var POSTS = [".length;
  blogJs = blogJs.slice(0, insertIdx) + "\n" + newEntry + blogJs.slice(insertIdx);
  fs.writeFileSync(BLOG_JS, blogJs);

  // Append to sitemap.xml before </urlset>.
  let sitemap = fs.readFileSync(SITEMAP, "utf8");
  const urlEntry = '  <url>\n    <loc>https://amzloss.com/blogs/' + slug + '.html</loc>\n    <lastmod>' + dateISO + '</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n';
  sitemap = sitemap.replace("</urlset>", urlEntry + "</urlset>");
  fs.writeFileSync(SITEMAP, sitemap);

  writeState(nextState);

  console.log("Published daily post: blogs/" + slug + ".html (mode=" + mode + ", tool=" + tool + ")");
  console.log("CHANGED=1");
}

main();