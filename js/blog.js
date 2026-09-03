/* AmzLoss Blog — data-driven article grid with category filter + search. */
(function () {
  "use strict";

  var POSTS = [
    { cat: "Networks", icon: "", title: "Amazon Associates vs ShareASale vs CJ Affiliate: Which Pays Best in 2026? | AMZLOSS", date: "Sep 2, 2026", read: "10 min", url: "blogs/affiliate-network-comparison-amazon-associates-shareasale-cj.html", desc: "Amazon Associates vs ShareASale vs CJ Affiliate: Which Pays Best in 2026?" },
    { cat: "Networks", icon: "", title: "Affiliate Network Comparison 2026", date: "Aug 16, 2026", read: "7 min", url: "blogs/affiliate-network-comparison.html", desc: "Affiliate Network Comparison 2026 — ShareASale, CJ, Impact, Awin & More" },
    { cat: "Amazon", icon: "", title: "2026 Amazon Commission Cuts: What They Mean", date: "Aug 10, 2026", read: "7 min", url: "blogs/amazon-2026-commission-cuts.html", desc: "What the 2026 Amazon Commission Cuts Mean for Affiliates" },
    { cat: "Tools", icon: "", title: "Break-Even or Commission Calculator: Which One Do You Need? | AMZLOSS", date: "Sep 2, 2026", read: "9 min", url: "blogs/amazon-affiliate-break-even-commission-calculator-comparison.html", desc: "Break-Even or Commission Calculator: Which One Do You Need?" },
    { cat: "Tools", icon: "", title: "Find Your Amazon Affiliate Break-Even Point (Free Calculator) | AMZLOSS", date: "Sep 2, 2026", read: "7 min", url: "blogs/amazon-affiliate-break-even-point-calculator.html", desc: "Find Your Amazon Affiliate Break-Even Point (Free Calculator)" },
    { cat: "Tools", icon: "", title: "Amazon Affiliate Break-Even Calculator Guide", date: "Aug 17, 2026", read: "7 min", url: "blogs/amazon-affiliate-breakeven-calculator-guide.html", desc: "Amazon Affiliate Break-Even Calculator Guide" },
    { cat: "Tools", icon: "", title: "Amazon Affiliate Commission Calculator Guide 2026", date: "Aug 17, 2026", read: "9 min", url: "blogs/amazon-affiliate-commission-calculator-guide.html", desc: "Amazon Affiliate Commission Calculator Guide 2026" },
    { cat: "Link Building", icon: "", title: "Amazon Affiliate Link Building: Complete 2026 Guide | AMZLOSS", date: "Sep 2, 2026", read: "7 min", url: "blogs/amazon-affiliate-link-building-guide-2026.html", desc: "Amazon Affiliate Link Building: Complete 2026 Guide" },
    { cat: "Link Building", icon: "", title: "Amazon Affiliate Link Tools: Format, Track, Test", date: "Aug 17, 2026", read: "7 min", url: "blogs/amazon-affiliate-link-tools-guide.html", desc: "Amazon Affiliate Link Tools: Format, Track, Test" },
    { cat: "Tools", icon: "", title: "Why Your Amazon Affiliate Profit Is Below Break-Even (and How to Fix It) | AMZLOSS", date: "Sep 2, 2026", read: "7 min", url: "blogs/amazon-affiliate-profit-below-break-even.html", desc: "Why Your Amazon Affiliate Profit Is Below Break-Even (and How to Fix It)" },
    { cat: "Amazon", icon: "", title: "Amazon Affiliate Profit per Sale: The Real Math", date: "Aug 17, 2026", read: "7 min", url: "blogs/amazon-affiliate-profit-per-sale-guide.html", desc: "Amazon Affiliate Profit per Sale: The Real Math" },
    { cat: "Tools", icon: "", title: "Break-Even Strategy for Low-Commission Products", date: "Aug 17, 2026", read: "7 min", url: "blogs/amazon-affiliate-revenue-break-even-strategy.html", desc: "Break-Even Strategy for Low-Commission Products" },
    { cat: "Amazon", icon: "", title: "Amazon Associates Claim Report: How to File", date: "Aug 17, 2026", read: "7 min", url: "blogs/amazon-associates-claim-report-guide.html", desc: "Amazon Associates Claim Report: How to File" },
    { cat: "Amazon", icon: "", title: "Amazon Associates Commission Rates 2026", date: "Aug 17, 2026", read: "9 min", url: "blogs/amazon-associates-commission-rates-2026.html", desc: "Amazon Associates Commission Rates 2026" },
    { cat: "Link Building", icon: "", title: "Deep Linking: Send Buyers Straight to the Product", date: "Aug 17, 2026", read: "7 min", url: "blogs/amazon-associates-deep-linking-guide.html", desc: "Deep Linking: Send Buyers Straight to the Product" },
    { cat: "Amazon", icon: "", title: "Amazon Associates Missing Commission", date: "Aug 16, 2026", read: "9 min", url: "blogs/amazon-associates-missing-commission.html", desc: "Amazon Associates Missing Commission: Why &amp; How to Check" },
    { cat: "Amazon", icon: "", title: "Amazon Associates Non-FTC Audit: 2026 Strategy & Calculation Guide | AMZLOSS", date: "Sep 1, 2026", read: "7 min", url: "blogs/amazon-associates-non-ftc-audit.html", desc: "Amazon Associates Non-FTC Audit: 2026 Strategy & Calculation Guide" },
    { cat: "Networks", icon: "", title: "Amazon Associates vs ShareASale vs CJ Affiliate: 2026 Strategy & Calculation Guide | AMZLOSS", date: "Sep 2, 2026", read: "7 min", url: "blogs/amazon-associates-vs-shareasale-vs-cj-affiliate.html", desc: "Amazon Associates vs ShareASale vs CJ Affiliate: 2026 Strategy & Calculation Guide" },
    { cat: "Amazon", icon: "", title: "Amazon Commission Cuts 2026: Impact on Every Category | AMZLOSS", date: "Sep 2, 2026", read: "9 min", url: "blogs/amazon-commission-cuts-2026-category-impact.html", desc: "Amazon Commission Cuts 2026: Impact on Every Category" },
    { cat: "Amazon", icon: "", title: "Amazon Commission Payout Verification: 2026 Strategy & Calculation Guide | AMZLOSS", date: "Aug 31, 2026", read: "9 min", url: "blogs/amazon-commission-payout-verification.html", desc: "Amazon Commission Payout Verification: 2026 Strategy & Calculation Guide" },
    { cat: "Amazon", icon: "", title: "Amazon Commission Rate Cuts 2026: 2026 Strategy & Calculation Guide | AMZLOSS", date: "Aug 31, 2026", read: "7 min", url: "blogs/amazon-commission-rate-cuts-2026.html", desc: "Amazon Commission Rate Cuts 2026: 2026 Strategy & Calculation Guide" },
    { cat: "Amazon", icon: "", title: "Amazon Commission Rates by Category (2026)", date: "Aug 17, 2026", read: "7 min", url: "blogs/amazon-commission-rates-by-category.html", desc: "Amazon Commission Rates by Category (2026)" },
    { cat: "Amazon", icon: "", title: "Amazon Earnings Report Analyzer: 2026 Strategy & Calculation Guide | AMZLOSS", date: "Aug 31, 2026", read: "7 min", url: "blogs/amazon-earnings-report-analyzer.html", desc: "Amazon Earnings Report Analyzer: 2026 Strategy & Calculation Guide" },
    { cat: "Amazon", icon: "", title: "Amazon Earnings Report Columns, Decoded", date: "Aug 17, 2026", read: "7 min", url: "blogs/amazon-earnings-report-columns-guide.html", desc: "Amazon Earnings Report Columns, Decoded" },
    { cat: "Amazon", icon: "", title: "Amazon Halo Commission Is Gone (April 14)", date: "Aug 15, 2026", read: "7 min", url: "blogs/amazon-halo-commission-gone.html", desc: "Amazon Halo Commission Is Gone (April 14): What It Costs You" },
    { cat: "Link Building", icon: "", title: "Amazon Links: Nofollow, Sponsored & the Rules", date: "Aug 17, 2026", read: "7 min", url: "blogs/amazon-links-nofollow-guide.html", desc: "Amazon Links: Nofollow, Sponsored & the Rules" },
    { cat: "Amazon", icon: "", title: "Amazon Product Earnings Report CSV Explained", date: "Aug 16, 2026", read: "7 min", url: "blogs/amazon-product-earnings-report-csv-explained.html", desc: "Amazon Product Earnings Report CSV Explained" },
    { cat: "Amazon", icon: "", title: "How to Catch Amazon Rate Changes Fast", date: "Aug 17, 2026", read: "7 min", url: "blogs/amazon-rate-change-alert-guide.html", desc: "How to Catch Amazon Rate Changes Fast" },
    { cat: "Amazon", icon: "", title: "Spotting underpaid commissions in your report (AmzLoss)", date: "Aug 18, 2026", read: "7 min", url: "blogs/amzloss-daily-audit-2026-08-18.html", desc: "Spotting underpaid Amazon commissions in your report (AmzLoss Daily)" },
    { cat: "Amazon", icon: "", title: "Every column in the Amazon earnings report, decoded", date: "Aug 19, 2026", read: "7 min", url: "blogs/amzloss-daily-audit-2026-08-19.html", desc: "Every column in the Amazon earnings report, decoded" },
    { cat: "Amazon", icon: "", title: "What to do when the audit finds a possible", date: "Aug 20, 2026", read: "7 min", url: "blogs/amzloss-daily-audit-2026-08-20.html", desc: "What to do when the audit finds a possible" },
    { cat: "Amazon", icon: "", title: "The difference between 'underpaid' and 'possible", date: "Aug 22, 2026", read: "7 min", url: "blogs/amzloss-daily-audit-2026-08-22.html", desc: "The difference between 'underpaid' and 'possible" },
    { cat: "Amazon", icon: "", title: "How returns and refunds hide real underpayments…", date: "Aug 25, 2026", read: "7 min", url: "blogs/amzloss-daily-audit-2026-08-25.html", desc: "How returns and refunds hide real underpayments…" },
    { cat: "Amazon", icon: "", title: "Auditing every order date, not just the latest…", date: "Aug 26, 2026", read: "7 min", url: "blogs/amzloss-daily-audit-2026-08-26.html", desc: "Auditing every order date, not just the latest…" },
    { cat: "Tools", icon: "", title: "Why your Amazon commission is lower than the price", date: "Aug 21, 2026", read: "7 min", url: "blogs/amzloss-daily-calculator-2026-08-21.html", desc: "Why your Amazon commission is lower than the price" },
    { cat: "Tools", icon: "", title: "The 4% trap: when a high-ticket item pays less", date: "Aug 23, 2026", read: "7 min", url: "blogs/amzloss-daily-calculator-2026-08-23.html", desc: "The 4% trap: when a high-ticket item pays less" },
    { cat: "Tools", icon: "", title: "Calculating 2026 Amazon commission in three steps", date: "Aug 24, 2026", read: "7 min", url: "blogs/amzloss-daily-calculator-2026-08-24.html", desc: "Calculating 2026 Amazon commission in three steps" },
    { cat: "Tools", icon: "", title: "Gift-wrap and delivery fees: the money you never…", date: "Aug 27, 2026", read: "7 min", url: "blogs/amzloss-daily-calculator-2026-08-27.html", desc: "Gift-wrap and delivery fees: the money you never…" },
    { cat: "Tools", icon: "", title: "How discounts quietly shrink your commission…", date: "Aug 28, 2026", read: "7 min", url: "blogs/amzloss-daily-calculator-2026-08-28.html", desc: "How discounts quietly shrink your commission…" },
    { cat: "Tools", icon: "", title: "What 'eligible order amount' actually means…", date: "Aug 29, 2026", read: "7 min", url: "blogs/amzloss-daily-calculator-2026-08-29.html", desc: "What 'eligible order amount' actually means…" },
    { cat: "Link Building", icon: "", title: "Best Link Building Tools for Amazon Affiliates: 2026 Comparison | AMZLOSS", date: "Sep 2, 2026", read: "7 min", url: "blogs/best-link-building-tools-amazon-affiliates-2026.html", desc: "Best Link Building Tools for Amazon Affiliates: 2026 Comparison" },
    { cat: "Amazon", icon: "", title: "How Much Do 2026 Amazon Commission Cuts Cost You? Calculate It | AMZLOSS", date: "Sep 2, 2026", read: "9 min", url: "blogs/calculate-amazon-commission-cuts-cost.html", desc: "How Much Do 2026 Amazon Commission Cuts Cost You? Calculate It" },
    { cat: "Link Building", icon: "", title: "Directory Listing SEO: Quality vs Spam", date: "Aug 17, 2026", read: "9 min", url: "blogs/directory-listing-seo-guide.html", desc: "Directory Listing SEO: Quality vs Spam" },
    { cat: "Link Building", icon: "", title: "Free Backlink Directories That Still Work (2026)", date: "Aug 17, 2026", read: "9 min", url: "blogs/free-backlink-directories-for-affiliates.html", desc: "Free Backlink Directories That Still Work (2026)" },
    { cat: "Amazon", icon: "", title: "How Much Do Amazon Affiliates Make? 2026 Math", date: "Aug 17, 2026", read: "7 min", url: "blogs/how-much-do-amazon-affiliates-make.html", desc: "How Much Do Amazon Affiliates Make? 2026 Math" },
    { cat: "Amazon", icon: "", title: "How to Audit Your Amazon Earnings", date: "Aug 10, 2026", read: "7 min", url: "blogs/how-to-audit-amazon-earnings.html", desc: "How to Audit Your Amazon Associates Earnings Report" },
    { cat: "Link Building", icon: "", title: "Backlinks for an Affiliate Site: 30-Day Plan", date: "Aug 17, 2026", read: "9 min", url: "blogs/how-to-build-backlinks-for-affiliate-site.html", desc: "Backlinks for an Affiliate Site: 30-Day Plan" },
    { cat: "Amazon", icon: "", title: "How to Check for Amazon Affiliate Underpayment", date: "Aug 16, 2026", read: "7 min", url: "blogs/how-to-check-amazon-affiliate-underpayment.html", desc: "How to Check for Amazon Affiliate Underpayment" },
    { cat: "Networks", icon: "", title: "How to Get Approved by Affiliate Networks", date: "Aug 17, 2026", read: "7 min", url: "blogs/how-to-get-approved-affiliate-networks.html", desc: "How to Get Approved by Affiliate Networks" },
    { cat: "SEO", icon: "", title: "How to Submit a URL to Search Engines (Free)", date: "Aug 17, 2026", read: "7 min", url: "blogs/how-to-submit-url-to-search-engines.html", desc: "How to Submit a URL to Search Engines (Free)" },
    { cat: "Amazon", icon: "", title: "How to Verify Your Amazon Affiliate Commission", date: "Aug 17, 2026", read: "9 min", url: "blogs/how-to-verify-amazon-affiliate-commission.html", desc: "How to Verify Your Amazon Affiliate Commission" },
    { cat: "SEO", icon: "", title: "IndexNow Setup: Get New Pages Indexed in Hours", date: "Aug 17, 2026", read: "7 min", url: "blogs/indexnow-setup-guide.html", desc: "IndexNow Setup: Get New Pages Indexed in Hours" },
    { cat: "Amazon", icon: "", title: "Missing Amazon Affiliate Commission? How to Check and Recover It | AMZLOSS", date: "Sep 2, 2026", read: "9 min", url: "blogs/missing-amazon-affiliate-commission-network.html", desc: "Missing Amazon Affiliate Commission? How to Check and Recover It" },
    { cat: "Amazon", icon: "", title: "How to Offset Amazon Commission Cuts with Other Income Streams | AMZLOSS", date: "Sep 2, 2026", read: "9 min", url: "blogs/offset-amazon-commission-cuts-diversified-income.html", desc: "How to Offset Amazon Commission Cuts with Other Income Streams" },
    { cat: "Tools", icon: "", title: "Which Price Point Pays? Break-Even Analysis", date: "Aug 17, 2026", read: "7 min", url: "blogs/price-points-breakeven-analysis.html", desc: "Which Price Point Pays? Break-Even Analysis" },
    { cat: "Networks", icon: "", title: "ShareASale vs CJ vs Impact: Which Pays Better?", date: "Aug 17, 2026", read: "7 min", url: "blogs/shareasale-vs-cj-vs-impact.html", desc: "ShareASale vs CJ vs Impact: Which Pays Better?" },
    { cat: "SEO", icon: "", title: "URL Submission Checklist: Get Indexed Faster", date: "Aug 17, 2026", read: "7 min", url: "blogs/url-submission-checklist.html", desc: "URL Submission Checklist: Get Indexed Faster" },
    { cat: "Amazon", icon: "", title: "Why Amazon Earnings Dropped But Clicks Didnt", date: "Aug 10, 2026", read: "7 min", url: "blogs/why-earnings-dropped-but-clicks-didnt.html", desc: "Why Your Earnings Dropped But Your Clicks Didn't" }
  ];

  function renderBlogGrid(posts) {
    var grid = document.getElementById('blog_grid');
    if (!grid) return;
    grid.innerHTML = '';
    posts.forEach(function(post) {
      var catClass = post.cat.toLowerCase().replace(/s+/g, '-');
      var card = document.createElement('a');
      card.href = post.url;
      card.className = 'blog-card ' + catClass;
      card.innerHTML = '<span class="blog-cat ' + catClass + '">' + post.cat + '</span>' +
        '<h3>' + post.title + '</h3>' +
        '<div class="blog-meta">' +
          '<span>' + post.date + '</span>' +
          '<span>' + post.read + '</span>' +
        '</div>' +
        '<p>' + post.desc + '</p>';
      grid.appendChild(card);
    });
  }

  function filterPosts(cat) {
    if (!cat || cat === 'All') renderBlogGrid(POSTS);
    else renderBlogGrid(POSTS.filter(function(p) { return p.cat === cat; }));
  }

  function searchPosts(q) {
    if (!q) renderBlogGrid(POSTS);
    else renderBlogGrid(POSTS.filter(function(p) {
      return p.title.toLowerCase().includes(q.toLowerCase()) ||
             p.desc.toLowerCase().includes(q.toLowerCase());
    }));
  }

  var catFilter = document.getElementById('cat-filter');
  if (catFilter) catFilter.addEventListener('change', function(e) { filterPosts(e.target.value); });

  var searchInput = document.getElementById('blog-search');
  if (searchInput) searchInput.addEventListener('input', function(e) { searchPosts(e.target.value); });

  renderBlogGrid(POSTS);
})();
