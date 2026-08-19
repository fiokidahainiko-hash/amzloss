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

/* Tip content bank: 12 variants per tool (96 total) — enough for ~3 months
   of unique daily rotation posts before the cycle repeats. */
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
    },
    {
      title: "Gift-wrap and delivery fees: the money you never earn",
      desc: "Amazon excludes gift-wrap and delivery from the commission base. Know exactly what counts.",
      faq: "Does gift wrap count toward my Amazon commission?",
      faqAns: "No. Gift-wrap charges and delivery fees are excluded from the eligible order amount, so they earn you nothing. The calculator removes them automatically."
    },
    {
      title: "How discounts quietly shrink your commission",
      desc: "A price drop changes your earnings — even when the rate stays the same. See the real impact.",
      faq: "Does a sale price lower my commission?",
      faqAns: "Yes. Commission is a percentage of the discounted price you actually referred, not the original list price. Run the discounted amount through the calculator to see what you earn."
    },
    {
      title: "What 'eligible order amount' actually means",
      desc: "The term appears everywhere in Amazon's rules. Here is the plain-language definition.",
      faq: "What counts as the eligible order amount?",
      faqAns: "It is the product price after discounts and after excluded fees like gift-wrap and delivery, before tax. Your rate applies to that figure, not the checkout total."
    },
    {
      title: "Converting clicks to commission: your real earnings per visitor",
      desc: "A calculator estimates per-sale earnings, but per-visitor earnings is the number that pays.",
      faq: "How do I turn clicks into an earnings estimate?",
      faqAns: "Multiply your commission per sale by your conversion rate (sales ÷ clicks). That gives earnings per visitor — the metric that actually grows your income."
    },
    {
      title: "Taxes: do they affect your commission calculation?",
      desc: "Amazon pays on the taxable or non-taxable amount depending on the marketplace. Keep your estimate honest.",
      faq: "Does VAT or sales tax change my Amazon commission?",
      faqAns: "In most marketplaces commission is based on the order amount excluding tax. The calculator's estimate assumes pre-tax pricing, matching how Amazon reports it."
    },
    {
      title: "One calculator, every marketplace: US, UK, DE and more",
      desc: "Rates differ by country. Check your marketplace before you calculate anything.",
      faq: "Are commission rates the same in every Amazon marketplace?",
      faqAns: "No. Each marketplace sets its own category rates, and 2026 cuts hit them unevenly. Pick your market first, then calculate."
    },
    {
      title: "Projecting monthly income from a single sale",
      desc: "Take one verified commission and scale it to a month of traffic — the math is simple.",
      faq: "How do I project monthly affiliate income?",
      faqAns: "Multiply your commission per sale by your expected monthly sales. If one sale earns $4 and you expect 300 sales, that is $1,200 — before returns and rate changes."
    },
    {
      title: "Why your calculator estimate and payouts can still differ",
      desc: "Estimates are only as good as their inputs. The three reasons a number won't match.",
      faq: "Why does my estimate not match my payout?",
      faqAns: "Returns, rate changes mid-month, and tracking windows all shift the real total. The calculator gives a clean baseline; the audit verifies what Amazon actually paid."
    },
    {
      title: "The commission-to-price sweet spot for affiliate content",
      desc: "Not every product deserves a post. Find the range where your commission justifies the effort.",
      faq: "What is a good commission-to-price ratio?",
      faqAns: "Aim for products where your commission is at least a few dollars per sale, or high volume at lower rates. The calculator shows the exact ratio for any product."
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
    },
    {
      title: "The highest-paying Amazon categories right now",
      desc: "Some categories still pay up to 10%. Know where the money is before you plan content.",
      faq: "Which Amazon categories pay the highest commission in 2026?",
      faqAns: "Categories like luxury beauty, digital, and certain specialty niches still top out near 10%. The live table lists the exact rate for every category today."
    },
    {
      title: "How to read Amazon's rate schedule without confusion",
      desc: "The official schedule is dense. Here is the fast way to find your category and market.",
      faq: "How do I find my rate on Amazon's official schedule?",
      faqAns: "Match your marketplace column with your product category row and read the percentage. The AmzLoss table formats the same data more clearly and keeps it up to date."
    },
    {
      title: "Rate changes are retroactive to the order date — here's the catch",
      desc: "A change announced today can apply to yesterday's orders. Verify the order-date rate, not today's.",
      faq: "When exactly does a new Amazon rate start?",
      faqAns: "New rates apply from the order date, so a change can be retroactive within a reporting period. Always check the rate for the order date, not the current date."
    },
    {
      title: "The 2026 commission cuts: what was spared",
      desc: "Not every category fell. See which niches kept their rates and why that matters for your next post.",
      faq: "Which Amazon categories kept their 2026 rates?",
      faqAns: "Some digital, luxury, and specialty categories held closer to their old rates. The rate table shows which markets and categories were spared, so you can plan around them."
    },
    {
      title: "Bounties vs percentage rates: two ways Amazon pays you",
      desc: "Bounties pay flat fees for sign-ups; rates pay percentages on sales. Use both in your planning.",
      faq: "What is the difference between a bounty and a commission rate?",
      faqAns: "A bounty is a fixed fee for a sign-up (like Audible at $5), while a rate is a percentage of a sale. Both can be layered — the table covers rates; bounties are a bonus."
    },
    {
      title: "Which market pays the best: comparing Amazon marketplaces",
      desc: "The same product can earn different rates in different countries. Check before you localize.",
      faq: "Should I promote the same product in multiple marketplaces?",
      faqAns: "Rates vary by marketplace, so compare them first. A category paying 4% in the US might pay more in the UK or DE — the table shows each market side by side."
    },
    {
      title: "Why electronics pays 4% (and what to do about it)",
      desc: "Low-margin categories earn thin rates. Here is how to keep them worthwhile.",
      faq: "Is promoting electronics still worth it with a 4% rate?",
      faqAns: "Yes, at high volume — but pair them with accessories, bounties and add-ons to lift your effective rate. The calculator shows your true earnings per order."
    },
    {
      title: "The rate table as a content strategy tool",
      desc: "Use the numbers to decide what to review next — not just what you earn today.",
      faq: "How do I use rates to choose what to promote?",
      faqAns: "Compare rate × typical price across niches. Favor categories where the combination produces meaningful commission, and skip ones where the math doesn't add up."
    },
    {
      title: "Rate alerts: catching a change the day it happens",
      desc: "Amazon doesn't email everyone. An alert the day of a change protects your next post.",
      faq: "How do I get notified when Amazon changes rates?",
      faqAns: "The AmzLoss rate-change alerts watch the published table and notify you when a category moves — so you can update content before the numbers drift."
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
    },
    {
      title: "The difference between 'underpaid' and 'possible irregularity'",
      desc: "Why the audit uses careful language, and why that honesty helps you.",
      faq: "Is a flagged line a confirmed underpayment?",
      faqAns: "No. It is a possible irregularity that clears a confidence threshold. Returns and ambiguous rows are separated out, so what remains is worth verifying — not guaranteed proof."
    },
    {
      title: "How returns and refunds hide real underpayments",
      desc: "Refunds muddy the numbers. Here is how the audit isolates them so they can't confuse the verdict.",
      faq: "How do returns affect my audit results?",
      faqAns: "Returns are excluded from the analysis so they can never be flagged against you. That keeps the audit focused on genuine underpayments in your paid lines."
    },
    {
      title: "Auditing every order date, not just the latest rate",
      desc: "Rates change by order date. The audit checks each line against the rate that applied on that day.",
      faq: "Why does the audit use order dates instead of today's rate?",
      faqAns: "Because your commission was earned under the rate in effect on the order date. Comparing against today's rate would be wrong — the audit matches each line to its own date."
    },
    {
      title: "The claim export: turning findings into a real recovery",
      desc: "The audit ends with a ready-to-send CSV. Here is how to use it with Amazon support.",
      faq: "How do I file a claim with the audit export?",
      faqAns: "Attach the claim CSV — flagged category, date, price and gap per line — to an Amazon Associates support case. Clear evidence makes the request easy to review."
    },
    {
      title: "How often should you run an earnings audit?",
      desc: "Monthly after each payout is the baseline. Here is the schedule that protects you without paranoia.",
      faq: "How often should I audit my Amazon earnings?",
      faqAns: "Once a month after your payout is enough for most publishers. Audit again right after any rate change announcement to catch a sudden shift early."
    },
    {
      title: "Your file never leaves the browser — here's the proof",
      desc: "Privacy is the point. What actually happens to your CSV during an audit.",
      faq: "Is my Amazon earnings file uploaded anywhere?",
      faqAns: "No. The audit runs entirely in your browser — the file never leaves your device, on any plan. There is no upload, storage, or server-side processing."
    },
    {
      title: "Why 'uncategorised' rows matter in your report",
      desc: "Rows Amazon didn't classify are separated, not hidden. Here is why that's the fair approach.",
      faq: "What are uncategorised rows in my earnings report?",
      faqAns: "Lines Amazon left without a clear category. The audit separates them so they can't be falsely flagged — but you can still review them manually if you wish."
    },
    {
      title: "Estimating your monthly shortfall in minutes",
      desc: "The audit totals possible underpayment automatically. One number that justifies a quick check.",
      faq: "How do I estimate my total possible underpayment?",
      faqAns: "The audit sums the gap across all flagged lines into an estimated shortfall. It is a starting point — verify each flagged item before acting."
    },
    {
      title: "Rate-change alerts meet the audit: a full safety net",
      desc: "Alerts catch the change; the audit checks you were paid right. Use them together.",
      faq: "How do alerts and the audit work together?",
      faqAns: "Alerts tell you the moment a rate moves, and the audit verifies every past line against the correct order-date rate. Together they cover the whole cycle."
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
    },
    {
      title: "Counting your hours: the cost side of break-even",
      desc: "Your time is the biggest cost. Put a number on it and the math gets honest.",
      faq: "How do I value my time in a break-even calculation?",
      faqAns: "Multiply the hours you spend on a post by a reasonable hourly rate, add any tools or review costs, and that is your cost — the break-even price is where commission covers it."
    },
    {
      title: "Conversion rate: the number most publishers guess wrong",
      desc: "A small conversion change swings break-even a lot. Use a realistic figure, not a dream.",
      faq: "What conversion rate should I use in break-even?",
      faqAns: "Use your own average (sales ÷ clicks) rather than a generic guess. If you don't have data, use a conservative 1–2% and adjust once you have real numbers."
    },
    {
      title: "High-volume low-margin: a break-even case study",
      desc: "Sometimes selling 100 cheap items beats selling 5 expensive ones. The math decides.",
      faq: "When does high volume beat high margin?",
      faqAns: "When your total commission at volume covers your effort and then some. Compare total commission at realistic volumes — not just per-sale numbers."
    },
    {
      title: "Returns are a hidden cost in break-even",
      desc: "Every return you earn is a refund of commission. Factor a returns rate in.",
      faq: "Do product returns affect my break-even?",
      faqAns: "Yes. A returned item reverses your commission, so build a returns rate into your estimate. High-return categories need a higher break-even price."
    },
    {
      title: "Break-even across seasons: planning a full year",
      desc: "Some products sell only in a season. Spread the math over twelve months.",
      faq: "How do seasonal products affect break-even?",
      faqAns: "A seasonal product must earn its year's worth of effort in one season, so its true break-even is higher than a year-round product at the same rate."
    },
    {
      title: "The break-even way to compare two products",
      desc: "Don't compare rates alone — compare the price points where each product pays.",
      faq: "How do I choose between two products?",
      faqAns: "Find each product's break-even price at your real conversion rate, then compare. The one that pays sooner at your traffic level is the better promotion."
    },
    {
      title: "When a 'nice' product is a losing promotion",
      desc: "A product you love can still lose money per hour of content. Let the numbers decide.",
      faq: "Can I lose money promoting a good product?",
      faqAns: "Yes, if the commission never covers your content time. Break-even keeps enthusiasm honest — love the product, but verify it pays."
    },
    {
      title: "Re-running break-even after every rate change",
      desc: "Rates move, and your profitable price points move with them. Keep a quarterly check.",
      faq: "When should I recalculate break-even?",
      faqAns: "After every rate change and at least quarterly. A rate that dropped 2% can quietly turn a profitable price point into a loss."
    },
    {
      title: "Break-even for low-commission categories",
      desc: "You can make 4% categories work — here is the strategy that makes them pay.",
      faq: "How do I make a low-rate category profitable?",
      faqAns: "Bundle add-ons, target higher order values, and push volume. The break-even calculator shows how many sales you need to cover your effort at any rate."
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
    },
    {
      title: "Payout thresholds: the hidden delay in every network",
      desc: "A $50 minimum payout changes your cash flow. Check it before you commit.",
      faq: "Why haven't I been paid by my network yet?",
      faqAns: "Most networks hold payment until you cross a threshold (often $20–$50) and pay on a schedule. Low early earnings can sit below the threshold for months."
    },
    {
      title: "Cookie windows: the metric most publishers ignore",
      desc: "A 30-day cookie can beat a 24-hour one even at a lower rate. Compare windows.",
      faq: "What is a cookie window and why does it matter?",
      faqAns: "It is how long after a click a purchase still counts toward you. Longer windows capture more of the 'buy later' behavior — a big deal for considered purchases."
    },
    {
      title: "Merchant approval: why some programs reject you",
      desc: "Merchants approve individually. Here is what makes a merchant say yes.",
      faq: "Why does a merchant reject my application?",
      faqAns: "Merchants check niche fit, traffic quality and content relevance. Align your site with the product and apply to programs that fit your audience."
    },
    {
      title: "Multi-network strategy: spreading risk without spreading thin",
      desc: "Amazon plus one or two networks is a strong mix. Here is how to pick them.",
      faq: "How many networks should I join?",
      faqAns: "Amazon plus one or two networks that fit your niche is usually enough. More adds admin without proportional earnings. Use the calculator to see which combination pays most."
    },
    {
      title: "How the network calculator compares programs fairly",
      desc: "Same product, same traffic, different programs. The tool normalizes the comparison.",
      faq: "How do I compare network programs fairly?",
      faqAns: "Compare the same product at the same expected volume across programs, including rate, threshold and cookie window. The network calculator does that comparison in one view."
    },
    {
      title: "CPS vs CPA vs CPC: the program types explained",
      desc: "Not every network pays per sale. Know what CPS, CPA and CPC mean before you join.",
      faq: "What is the difference between CPS, CPA and CPC?",
      faqAns: "CPS pays per sale, CPA pays per action (like a sign-up), and CPC pays per click. Each fits different content — the calculator handles sale-based programs by default."
    },
    {
      title: "Approval odds: which networks are friendliest to new sites?",
      desc: "New publishers face different odds per network. Set expectations honestly.",
      faq: "Which network is easiest for a brand-new site?",
      faqAns: "ShareASale is often the friendliest for new publishers, followed by Impact. CJ tends to be stricter. A site with real content and traffic improves your odds everywhere."
    },
    {
      title: "Diversifying beyond Amazon: a practical starting plan",
      desc: "You don't need five networks. Here is the smallest mix that protects your income.",
      faq: "What is a good first move beyond Amazon?",
      faqAns: "Join one network that fits your niche — ShareASale for SaaS/lifestyle, CJ for retail — and add programs one at a time. Test with the calculator before scaling."
    },
    {
      title: "Rejected by a merchant? Here is the recovery path",
      desc: "Rejection is not the end. Improve and reapply with a better pitch.",
      faq: "What do I do if a merchant rejects me?",
      faqAns: "Ask why, fix the issue (more content, better fit, clearer traffic), and reapply in a few weeks. Many merchants approve on a second, stronger application."
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
    },
    {
      title: "Deep linking: skip the homepage, land on the product",
      desc: "Sending buyers straight to the product converts better. Build deep links correctly.",
      faq: "Why should I deep link instead of linking to the homepage?",
      faqAns: "A product page matches intent, so conversion is higher. The link tools accept any Amazon product URL and add your tag correctly, keeping the deep link clean."
    },
    {
      title: "Stripping old tracking parameters: why it matters",
      desc: "Leftover parameters can break attribution. Clean links convert and attribute better.",
      faq: "Should I remove existing tracking parameters from a URL?",
      faqAns: "Yes. Old parameters can interfere with your tag or leak data. The link tools strip them and append only your tracking ID for a clean, reliable link."
    },
    {
      title: "Markdown vs HTML vs plain URLs for blog links",
      desc: "Every platform prefers a different format. Here is when each one works best.",
      faq: "Which link format should I use on my blog?",
      faqAns: "Markdown for content platforms, HTML for full control, and a plain URL when you just need a raw link. The link tools output all three at once."
    },
    {
      title: "The quarterly backlink maintenance routine",
      desc: "Keep your link equity healthy with a simple four-step quarterly check.",
      faq: "What is a good backlink maintenance routine?",
      faqAns: "Every quarter: check your directory listings still link back, re-run the backlink checker on key pages, refresh any broken links, and build one new quality link."
    },
    {
      title: "Nofollow links: still worth getting?",
      desc: "Not every link passes equity. Here is why nofollow links still have value.",
      faq: "Do nofollow backlinks help at all?",
      faqAns: "Yes — they bring referral traffic, brand visibility and a natural link profile. They just don't pass the same equity as follow links. Both have a place."
    },
    {
      title: "Amazon link formats: /dp/, /gp/ and product ASIN",
      desc: "Amazon serves links in different formats. Know which to use and when.",
      faq: "Which Amazon URL format is best for affiliates?",
      faqAns: "/dp/ASIN URLs are the cleanest and most stable. The link tools normalize whatever format you paste into a consistent affiliate link with your tag."
    },
    {
      title: "Localized links: matching the buyer's marketplace",
      desc: "Send UK buyers to amazon.co.uk and US buyers to amazon.com for better conversion.",
      faq: "Should I link to different Amazon marketplaces?",
      faqAns: "Yes — a buyer in the UK should land on amazon.co.uk. Match the marketplace to your audience to improve conversion and comply with the operating agreement."
    },
    {
      title: "Avoiding link shorteners on Amazon affiliate links",
      desc: "Shorteners can mask attribution and hurt trust. Here is when they're safe.",
      faq: "Is it safe to shorten Amazon affiliate links?",
      faqAns: "It can be, if the shortener preserves the tag and you disclose the link — but shorteners add a failure point and can look spammy. Clean direct links are safer."
    },
    {
      title: "Building a link checklist for every new post",
      desc: "A repeatable checklist catches tag, disclosure and format mistakes before you publish.",
      faq: "What should my pre-publish link checklist include?",
      faqAns: "Your tag is on every link, disclosure is present, links are deep (not homepage), and the format matches your platform. The link tools automate the tag and disclosure parts."
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
    },
    {
      title: "Sitemap vs IndexNow: why you need both",
      desc: "One covers Google, the other covers Bing and friends. Here is how they split the work.",
      faq: "Do I need both a sitemap and IndexNow?",
      faqAns: "Yes. Google discovers pages through your sitemap, while IndexNow pushes instantly to Bing, Yandex, Seznam and Naver. Together they cover every major engine."
    },
    {
      title: "Submitting to Google: the honest 2026 answer",
      desc: "Google retired its ping API. Here is exactly how Google finds new pages now.",
      faq: "How do I submit a URL to Google in 2026?",
      faqAns: "Add the page to your sitemap and submit the sitemap in Search Console. There is no instant ping — Google crawls on its own schedule, so sitemaps are the reliable route."
    },
    {
      title: "The IndexNow key file, explained simply",
      desc: "That random .txt file is your proof of ownership. Here is why engines require it.",
      faq: "What is the IndexNow key file for?",
      faqAns: "It proves you control the domain before engines trust your submissions. The file must live at yourdomain/key.txt — the submitter points you to the exact URL."
    },
    {
      title: "How to get your new blog post crawled tonight",
      desc: "Publish, ping IndexNow, link internally, then submit to search console. The order matters.",
      faq: "What is the fastest sequence after publishing a post?",
      faqAns: "Publish, add to your sitemap, run the IndexNow ping, then link from an already-indexed page. Speed the crawl, then let engines do their normal discovery too."
    },
    {
      title: "Indexing new pages without a backend",
      desc: "Static sites can't run server scripts — but IndexNow works perfectly anyway. Here is how.",
      faq: "Can a static site use IndexNow?",
      faqAns: "Yes. IndexNow is a simple HTTPS POST with a JSON payload and your key file — no server code required. The AmzLoss submitter fires it straight from your browser."
    },
    {
      title: "Why some pages never get indexed (and how to fix it)",
      desc: "Blocked robots, no internal links, or duplicate content. The usual culprits and the fixes.",
      faq: "Why is my page not appearing in search results?",
      faqAns: "Common causes: noindex tags, zero internal links, thin content, or a sitemap that wasn't resubmitted. Fix those, ping IndexNow, and resubmit the sitemap."
    },
    {
      title: "The safe frequency: how often to submit URLs",
      desc: "Over-submitting can waste crawl budget. Here is the cadence that works.",
      faq: "How often should I ping search engines?",
      faqAns: "Only when you publish or significantly update a page. Pinging every day with nothing new can be ignored or waste budget. The submitter makes each ping count."
    },
    {
      title: "After the ping: what to do while you wait for indexing",
      desc: "Indexing takes time. Use it to strengthen the page with links and internal navigation.",
      faq: "What should I do while waiting for my page to be indexed?",
      faqAns: "Add internal links from older pages, make sure the meta and content are solid, and check no noindex tag snuck in. Then wait — most pages index within days."
    },
    {
      title: "Tracking your indexed pages over time",
      desc: "A simple record of what you submitted tells you whether indexing is working.",
      faq: "How do I track whether my URLs got indexed?",
      faqAns: "Log each submitted URL and its date, then spot-check with a site: search or Search Console. If a page never appears, revisit the indexing checklist."
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
    },
    {
      title: "The verification snippet, decoded",
      desc: "That small HTML comment and link is your key to a backlink. Here is exactly what it does.",
      faq: "What does the directory verification snippet do?",
      faqAns: "It carries a unique code plus a link back to AmzLoss. The directory fetches your page, finds the code, verifies you're real, and then lists you with a backlink."
    },
    {
      title: "How the weekly backlink audit protects the directory",
      desc: "Every listed site is re-checked weekly. Here is what happens when a link disappears.",
      faq: "How does the weekly audit work?",
      faqAns: "Each Sunday the audit fetches every listed site and checks for the AmzLoss link. Sites that stopped linking back are removed and reported — keeping listings honest."
    },
    {
      title: "Choosing the right category for your listing",
      desc: "The category you pick affects both relevance and who finds you. Choose with intent.",
      faq: "Which category should I pick in the directory?",
      faqAns: "Pick the most accurate category for your content — relevance helps the backlink and helps visitors find you. The directory has categories for most niches."
    },
    {
      title: "Writing a description that earns clicks",
      desc: "Your description is your ad on the grid. Make it specific and useful.",
      faq: "How do I write a good directory description?",
      faqAns: "Say what the site does, for whom, and what they'll find in one or two sentences. Specific beats clever — visitors click when they know what they'll get."
    },
    {
      title: "Your listing's do-follow status, explained",
      desc: "Not all directory links are do-follow. Here is why AmzLoss listings pass value.",
      faq: "Are AmzLoss directory links do-follow?",
      faqAns: "Yes. Because every listing is human-reviewed and verified live before it appears, the directory can safely pass a do-follow link to listed sites."
    },
    {
      title: "Getting found: how visitors use the directory",
      desc: "People browse by category and search by keyword. Optimize for both.",
      faq: "How do visitors find a site in the directory?",
      faqAns: "They browse categories or search for a niche. A precise category and a description with real keywords help your site surface in both."
    },
    {
      title: "Social reach: your YouTube and TikTok follow buttons",
      desc: "Directory listings can now link to your channels. Why that grows your audience.",
      faq: "How do I add my social channels to the directory?",
      faqAns: "Add your YouTube and TikTok URLs when you submit or update your listing. A Follow button appears on your card, turning directory visitors into followers."
    },
    {
      title: "Why some submissions never get approved",
      desc: "The directory rejects spam, dead sites and wrong categories. Here is how to pass.",
      faq: "Why would my directory submission be rejected?",
      faqAns: "Mostly because the site is unreachable, the snippet never appears, or the description doesn't match. Submit a live site, paste the snippet, and verify — that's the whole process."
    },
    {
      title: "The directory as a growth loop, not just a link",
      desc: "A listing can drive clicks, backlinks and social follows at once. Use all three.",
      faq: "What is the biggest value of a directory listing?",
      faqAns: "Beyond the do-follow backlink, a listing sends relevant clicks and can grow your social followings. Add your channels and keep your snippet live to keep all three."
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

function truncateStr(s, n) {
  return String(s).length > n ? String(s).slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : String(s);
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
  <meta name="yandex-verification" content="ec735af32a102bbe" />
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
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${metaEsc(title)}">
  <meta name="twitter:description" content="${metaEsc(desc)}">
  <meta name="twitter:image" content="https://amzloss.com/assets/img/og-cover.png">
  <link rel="icon" type="image/x-icon" href="https://amzloss.com/assets/img/favicon.ico">
  <link rel="icon" type="image/png" sizes="48x48" href="https://amzloss.com/assets/img/favicon-48x48.png">
  <link rel="icon" type="image/svg+xml" href="https://amzloss.com/assets/img/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="https://amzloss.com/assets/img/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="https://amzloss.com/assets/img/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="https://amzloss.com/assets/img/apple-touch-icon.png">
  <link rel="manifest" href="https://amzloss.com/assets/img/site.webmanifest">
  <meta name="msapplication-TileColor" content="#4b286d">
  <meta name="theme-color" content="#4b286d">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/css/style.css">
  <script>
    try { var t = localStorage.getItem('amzloss_theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
  </script>
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
  <button class="theme-toggle" id="theme-toggle" type="button" title="Toggle dark mode" aria-label="Toggle dark mode">🌙</button>
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
    console.error("Already posted today; skipping.");
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
    mode = "update";
  } else {
    const idx = state.nextToolIndex || 0;
    tool = TOOL_ORDER[idx % TOOL_ORDER.length];
    nextState.nextToolIndex = idx + 1;
    mode = "tip";
  }
  const variant = state.variantIndex && state.variantIndex[tool] ? state.variantIndex[tool] : 0;
  const bank = TIPS[tool];
  tip = bank[variant % bank.length];
  nextState.variantIndex = { ...(state.variantIndex || {}), [tool]: variant + 1 };

  const toolName = tool.charAt(0).toUpperCase() + tool.slice(1);
  const slug = "amzloss-daily-" + slugify(toolName) + "-" + dateISO;
  const keywords = toolName + " tips, amzloss " + tool + " guide, amazon affiliate " + tool + " " + dateISO;

  const post = {
    slug,
    title: truncateStr(tip.title + " (AmzLoss)", 52),
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

  console.error("Published daily post: blogs/" + slug + ".html (mode=" + mode + ", tool=" + tool + ")");
  console.log("INDEXNOW_URL=https://amzloss.com/blogs/" + slug + ".html");
  console.log("CHANGED=1");
}

main();