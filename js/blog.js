/* AmzLoss Blog — data-driven article grid with category filter + search. */
(function () {
  "use strict";

  var POSTS = [
    { cat: "Tools", icon: "🧮", title: "What 'eligible order amount' actually means…", date: "Aug 29, 2026", read: "6 min", url: "blogs/amzloss-daily-calculator-2026-08-29.html", desc: "The term appears everywhere in Amazon's rules. Here is the plain-language definition." },
    { cat: "Tools", icon: "🧮", title: "How discounts quietly shrink your commission…", date: "Aug 28, 2026", read: "6 min", url: "blogs/amzloss-daily-calculator-2026-08-28.html", desc: "A price drop changes your earnings — even when the rate stays the same. See the real impact." },
    { cat: "Tools", icon: "🧮", title: "Gift-wrap and delivery fees: the money you never…", date: "Aug 27, 2026", read: "6 min", url: "blogs/amzloss-daily-calculator-2026-08-27.html", desc: "Amazon excludes gift-wrap and delivery from the commission base. Know exactly what counts." },
    { cat: "Tools", icon: "🔍", title: "Auditing every order date, not just the latest…", date: "Aug 26, 2026", read: "6 min", url: "blogs/amzloss-daily-audit-2026-08-26.html", desc: "Rates change by order date. The audit checks each line against the rate that applied on that day." },
    { cat: "Tools", icon: "🔍", title: "How returns and refunds hide real underpayments…", date: "Aug 25, 2026", read: "6 min", url: "blogs/amzloss-daily-audit-2026-08-25.html", desc: "Refunds muddy the numbers. Here is how the audit isolates them so they can't confuse the verdict." },
    { cat: "Tools", icon: "", title: "Calculating 2026 Amazon commission in three steps", date: "Aug 24, 2026", read: "6 min", url: "blogs/amzloss-daily-calculator-2026-08-24.html", desc: "Rate, eligible amount, multiply — the full 2026 commission formula, with the calculator doing the work." },
    { cat: "Tools", icon: "", title: "The 4% trap: when a high-ticket item pays less", date: "Aug 23, 2026", read: "6 min", url: "blogs/amzloss-daily-calculator-2026-08-23.html", desc: "A big price doesn't always mean a big commission. Compare real earnings per sale with the free calculator." },
    { cat: "Tools", icon: "", title: "The difference between 'underpaid' and 'possible", date: "Aug 22, 2026", read: "6 min", url: "blogs/amzloss-daily-audit-2026-08-22.html", desc: "Why the audit uses careful language, and why that honesty helps you." },
    { cat: "Tools", icon: "", title: "Why your Amazon commission is lower than the price", date: "Aug 21, 2026", read: "6 min", url: "blogs/amzloss-daily-calculator-2026-08-21.html", desc: "Amazon pays on the order amount after discounts, not the list price. Here is the math and how the calculator makes it instant." },
    { cat: "Tools", icon: "", title: "What to do when the audit finds a possible", date: "Aug 20, 2026", read: "6 min", url: "blogs/amzloss-daily-audit-2026-08-20.html", desc: "A flagged line is not proof of error. Here is how to verify it, then claim it with Amazon support." },
    { cat: "Tools", icon: "", title: "Every column in the Amazon earnings report, decoded", date: "Aug 19, 2026", read: "6 min", url: "blogs/amzloss-daily-audit-2026-08-19.html", desc: "Order ID, category, rate, fees, commission — know what each column means before you audit." },
    { cat: "Tools", icon: "", title: "Spotting underpaid Amazon commissions in your report (AmzLoss Daily)", date: "Aug 18, 2026", read: "6 min", url: "blogs/amzloss-daily-audit-2026-08-18.html", desc: "Your Product Earnings Report can quietly underpay. How the free audit finds it line by line." },
    { cat: "Amazon", icon: "", title: "Amazon Associates Commission Rates 2026", date: "Jul 31, 2026", read: "8 min", url: "blogs/amazon-associates-commission-rates-2026.html", desc: "The full 2026 rate picture by category — which were cut, which held, and where rates stand today." },
    { cat: "Amazon", icon: "", title: "Amazon Halo Commission Is Gone (April 14)", date: "Jul 30, 2026", read: "6 min", url: "blogs/amazon-halo-commission-gone.html", desc: "Amazon now pays only on the exact product you link. What changed and how to check its impact on your report." },
    { cat: "Amazon", icon: "", title: "Amazon Associates Missing Commission: Why & How to Check", date: "Jul 29, 2026", read: "9 min", url: "blogs/amazon-associates-missing-commission.html", desc: "Eight reasons commission can go missing — cookies, returns, the halo change, paid ads — and how to verify each." },
    { cat: "Amazon", icon: "", title: "Amazon Product Earnings Report CSV Explained", date: "Jul 28, 2026", read: "8 min", url: "blogs/amazon-product-earnings-report-csv-explained.html", desc: "Every column decoded — order ID, category, rate, fees, commission — and how to spot underpaid lines." },
    { cat: "Networks", icon: "", title: "Affiliate Network Comparison 2026", date: "Jul 27, 2026", read: "9 min", url: "blogs/affiliate-network-comparison.html", desc: "ShareASale, CJ, Impact, Awin, Rakuten & eBay — commissions, approval odds, thresholds, and how they stack up against Amazon." },
    { cat: "Tools", icon: "", title: "How to Check for Amazon Affiliate Underpayment", date: "Jul 26, 2026", read: "6 min", url: "blogs/how-to-check-amazon-affiliate-underpayment.html", desc: "Export, compare each line against the 2026 rates, and total the shortfall in minutes." },
    { cat: "Amazon", icon: "", title: "Amazon Commission Rates by Category (2026)", date: "Jul 25, 2026", read: "7 min", url: "blogs/amazon-commission-rates-by-category.html", desc: "Category-by-category breakdown — electronics, luxury, beauty, home — with current percentages and what they mean for your content." },
    { cat: "Amazon", icon: "", title: "How to Catch Amazon Rate Changes Fast", date: "Jul 24, 2026", read: "7 min", url: "blogs/amazon-rate-change-alert-guide.html", desc: "Amazon can change rates quietly. How to detect a cut, quantify the damage, and check you were paid right." },
    { cat: "Networks", icon: "", title: "ShareASale vs CJ vs Impact: Which Pays Better?", date: "Jul 23, 2026", read: "8 min", url: "blogs/shareasale-vs-cj-vs-impact.html", desc: "Head-to-head on commission tiers, approval odds, payout thresholds, and fit vs Amazon for affiliate publishers." },
    { cat: "Networks", icon: "", title: "How to Get Approved by Affiliate Networks", date: "Jul 22, 2026", read: "7 min", url: "blogs/how-to-get-approved-affiliate-networks.html", desc: "What CJ, ShareASale, Impact and Awin look for, how to present a site that gets accepted, and what to do if you're rejected." },
    { cat: "Amazon", icon: "", title: "What the 2026 Amazon Commission Cuts Mean for Affiliates", date: "Jul 21, 2026", read: "8 min", url: "blogs/amazon-2026-commission-cuts.html", desc: "Which categories were cut, by how much, and how to quantify the hit on your own account." },
    { cat: "Amazon", icon: "", title: "Why Your Amazon Affiliate Earnings Dropped But Clicks Didn't", date: "Jul 20, 2026", read: "7 min", url: "blogs/why-earnings-dropped-but-clicks-didnt.html", desc: "Seasonal dips vs. rate cuts vs. tracking issues — how to tell them apart in 15 minutes." },
    { cat: "Tools", icon: "", title: "How to Audit Your Amazon Associates Earnings Report", date: "Jul 19, 2026", read: "7 min", url: "blogs/how-to-audit-amazon-earnings.html", desc: "Step-by-step walkthrough of an audit using your own CSV — no data ever leaves your browser." },
    { cat: "Link Building", icon: "", title: "Amazon Affiliate Link Tools: Format, Track, Test", date: "Jul 18, 2026", read: "7 min", url: "blogs/amazon-affiliate-link-tools-guide.html", desc: "Build clean, tracked Amazon affiliate links, spot bad links before they cost you, and use the free link tools." },
    { cat: "Link Building", icon: "", title: "Amazon Links: Nofollow, Sponsored & the Rules", date: "Jul 17, 2026", read: "6 min", url: "blogs/amazon-links-nofollow-guide.html", desc: "When Amazon affiliate links must be rel=nofollow or rel=sponsored, disclosure rules, and how to stay compliant in 2026." },
    { cat: "Link Building", icon: "", title: "Deep Linking: Send Buyers Straight to the Product", date: "Jul 16, 2026", read: "6 min", url: "blogs/amazon-associates-deep-linking-guide.html", desc: "Deep linking to product pages instead of the homepage — higher conversion, and how to build deep links correctly." },
    { cat: "Link Building", icon: "", title: "Free Backlink Directories That Still Work (2026)", date: "Jul 15, 2026", read: "7 min", url: "blogs/free-backlink-directories-for-affiliates.html", desc: "Which free directories pass value in 2026, how the AmzLoss directory helps, and which link directories to skip." },
    { cat: "Link Building", icon: "", title: "Backlinks for an Affiliate Site: 30-Day Plan", date: "Jul 14, 2026", read: "8 min", url: "blogs/how-to-build-backlinks-for-affiliate-site.html", desc: "A month-by-month backlink plan for affiliate publishers — directories, guest posts, roundups, and link-worthy content." },
    { cat: "Link Building", icon: "", title: "Directory Listing SEO: Quality vs Spam", date: "Jul 13, 2026", read: "7 min", url: "blogs/directory-listing-seo-guide.html", desc: "How to choose quality directories, write a listing that ranks, and avoid spammy link schemes that get sites penalized." },
    { cat: "Tools", icon: "", title: "How to Verify Your Amazon Affiliate Commission", date: "Jul 12, 2026", read: "7 min", url: "blogs/how-to-verify-amazon-affiliate-commission.html", desc: "Check every paid line against the correct 2026 rate using the earnings audit, and understand exactly what you're owed." },
    { cat: "Tools", icon: "", title: "Amazon Associates Claim Report: How to File", date: "Jul 11, 2026", read: "7 min", url: "blogs/amazon-associates-claim-report-guide.html", desc: "When and how to file an underpayment claim with Amazon Associates — evidence, wording, and what to expect." },
    { cat: "Tools", icon: "", title: "Amazon Earnings Report Columns, Decoded", date: "Jul 10, 2026", read: "8 min", url: "blogs/amazon-earnings-report-columns-guide.html", desc: "Every column in the Product Earnings Report CSV — order ID, category, rate, fees, commission — and how to spot anomalies." },
    { cat: "Tools", icon: "", title: "Amazon Affiliate Commission Calculator Guide 2026", date: "Jul 9, 2026", read: "7 min", url: "blogs/amazon-affiliate-commission-calculator-guide.html", desc: "How to calculate what an Amazon Associates sale earns in 2026 — category rates, the commission-cut math, and the free calculator." },
    { cat: "Tools", icon: "", title: "How Much Do Amazon Affiliates Make? 2026 Math", date: "Jul 8, 2026", read: "8 min", url: "blogs/how-much-do-amazon-affiliates-make.html", desc: "Realistic income ranges by traffic level and product mix — and why the averages you see online mislead you." },
    { cat: "Tools", icon: "", title: "Amazon Affiliate Profit per Sale: The Real Math", date: "Jul 7, 2026", read: "7 min", url: "blogs/amazon-affiliate-profit-per-sale-guide.html", desc: "Net vs gross commission, discounts, returns, and how to estimate your real profit per sale in 2026." },
    { cat: "Tools", icon: "", title: "Amazon Affiliate Break-Even Calculator Guide", date: "Jul 6, 2026", read: "7 min", url: "blogs/amazon-affiliate-breakeven-calculator-guide.html", desc: "Find which products and price points actually justify your content time in 2026 with the break-even calculator." },
    { cat: "Tools", icon: "", title: "Which Price Point Pays? Break-Even Analysis", date: "Jul 5, 2026", read: "7 min", url: "blogs/price-points-breakeven-analysis.html", desc: "Comparing cheap vs expensive products — conversion, commission rate, returns, and effort — to find price points that pay." },
    { cat: "Tools", icon: "", title: "Break-Even Strategy for Low-Commission Products", date: "Jul 4, 2026", read: "7 min", url: "blogs/amazon-affiliate-revenue-break-even-strategy.html", desc: "A practical strategy for promoting low-rate products profitably — volume, bundles, and content that converts." },
    { cat: "Tools", icon: "", title: "How to Submit a URL to Search Engines (Free)", date: "Jul 3, 2026", read: "7 min", url: "blogs/how-to-submit-url-to-search-engines.html", desc: "Free ways to get new pages indexed — Google Search Console, IndexNow, and ping services, and which ones actually work." },
    { cat: "Tools", icon: "", title: "URL Submission Checklist: Get Indexed Faster", date: "Jul 2, 2026", read: "6 min", url: "blogs/url-submission-checklist.html", desc: "A repeatable checklist for every new page — title/meta, sitemap, IndexNow ping, internal links — so Google finds it fast." },
    { cat: "Tools", icon: "", title: "IndexNow Setup: Get New Pages Indexed in Hours", date: "Jul 1, 2026", read: "7 min", url: "blogs/indexnow-setup-guide.html", desc: "Step-by-step IndexNow setup — generate a key, host the key file, submit URLs — and how the free submitter automates it." }

  ];

  var grid = document.getElementById("blog_grid");
  var empty = document.getElementById("blog_empty");
  var search = document.getElementById("blog_search");
  var catsWrap = document.getElementById("blog_cats");
  if (!grid) return;

  var activeCat = "all";
  var query = "";

  function render() {
    var q = query.toLowerCase();
    var list = POSTS.filter(function (p) {
      var inCat = activeCat === "all" || p.cat === activeCat;
      var inSearch = !q || (p.title + " " + p.desc + " " + p.cat).toLowerCase().indexOf(q) !== -1;
      return inCat && inSearch;
    });
    grid.innerHTML = "";
    if (!list.length) {
      empty.style.display = "";
      return;
    }
    empty.style.display = "none";
    list.forEach(function (p) {
      var a = document.createElement("a");
      a.className = "card blog-card";
      a.href = p.url;
      a.style.cssText = "color:inherit;text-decoration:none;";
      a.innerHTML =
        '<div class="blog-meta"><span class="blog-cat">' + p.cat + "</span><span class=\"blog-date\">" + p.date + "  " + p.read + "</span></div>" +
        '<div class="icon">' + p.icon + "</div>" +
        "<h3>" + p.title + "</h3>" +
        "<p>" + p.desc + "</p>" +
        '<p style="color:var(--accent);font-weight:700;margin-top:12px;">Read article →</p>';
      grid.appendChild(a);
    });
  }

  if (catsWrap) {
    catsWrap.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-cat]");
      if (!btn) return;
      activeCat = btn.dataset.cat;
      catsWrap.querySelectorAll("button[data-cat]").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      render();
    });
  }
  if (search) {
    search.addEventListener("input", function () {
      query = search.value;
      render();
    });
  }

  render();
})();