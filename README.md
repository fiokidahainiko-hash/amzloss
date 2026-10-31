# AmzLoss — Amazon Associates Earnings Auditor

Find out how much Amazon's commission cuts actually cost **your** account, and get alerts before the next one.

- **Free tier:** the FULL tool — rate table, calculator, full earnings audit, claim export, rate-change alerts — ad-supported.
- **Paid tier ($2.99/week, $7.99/mo, or $59/yr):** the same features, completely ad-free.
- **Privacy-first:** the audit runs 100% in the browser. No earnings data is ever uploaded or stored.
- **Payments:** Paystack (already approved for AmzLoss).

---

## Project structure

```
amzloss/
├── index.html          # Homepage (full SEO)
├── calculator.html     # Free commission calculator (client-side)
├── audit.html          # THE product — CSV earnings audit (client-side)
├── pricing.html        # Free + 3 paid plans, Paystack checkout
├── rates.html          # Current rate table (SEO magnet)
├── blogs.html          # Learn / blog index
├── about.html          # About page
├── contact.html        # Contact page (admin@amzloss.com)
├── privacy.html        # Privacy & data promise
├── terms.html          # Terms of service
├── disclosure.html     # Affiliate disclosure
├── robots.txt          # SEO: crawl rules + sitemap link
├── sitemap.xml         # SEO: all URLs
├── llms.txt            # AI/LLM accessibility
├── 404.html            # Custom 404
├── assets/css/style.css
├── assets/img/         # logo.svg, favicon.svg, og-cover.svg, Paystack proofs
└── js/rates.js         # Rate dataset (keep updated)
└── js/paystack.js      # Paystack checkout (fill in keys/plan codes)
```

---

## Setup checklist (do these in order)

### 1. GitHub repo + free hosting (Netlify)

1. Create a **GitHub account** if you don't have one (github.com).
2. Click **New repository** → name it `amzloss` → make it **Public** (free).
3. Create a **Netlify account** (netlify.com — free tier is fine).
4. Netlify → **Add new site → Import from GitHub** → select the `amzloss` repo.
5. Deploy settings: **Build command: none** (it's a static site), **Publish directory: leave blank** (root).
6. Netlify gives you a free URL like `https://amzloss.netlify.app`. Push the files from this folder to the repo (see below) and Netlify auto-deploys.

**Uploading this folder to GitHub** (once, from a terminal in this folder):

```powershell
git init
git add .
git commit -m "Initial AmzLoss site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/amzloss.git
git push -u origin main
```

Then, whenever you change a file:

```powershell
git add .
git commit -m "description of change"
git push
```

Netlify redeploys automatically on each push.

### 2. Domain (you already own amzloss.com ✅)

- In Netlify: **Domain management → Add a domain → amzloss.com** → follow the DNS instructions (point nameservers to Netlify, or add the CNAME/A records they give you).
- Also add **amzloss.com → www** redirect (Netlify does this in the same dashboard).
- **Important after connecting:** all pages already use `https://amzloss.com/...` in their canonical tags and sitemap — so once DNS resolves, your SEO points at the right place automatically.

### 3. Payments — link Paystack (you're already approved ✅)

**On your site** the Paystack integration is already wired up via `js/paystack.js` + the `inline.js` script tag on `pricing.html`. You only need to paste 4 values from your Paystack dashboard. Do this in order:

**Step 1 — Get your public key**
1. Login to your **Paystack dashboard** (dashboard.paystack.com).
2. Go to **Settings → API Keys & Webhooks**.
3. Copy your **Public key** (it starts with `pk_live_`). Never copy the secret key (`sk_live_`) — it must stay private.

**Step 2 — Create 3 plans** (these power the recurring billing)
1. In the dashboard go to **Plans → Add plan**.
2. Create these three plans (name them exactly so it's easy to identify):
   - **AmzLoss Weekly** → amount `$2.99`, interval **weekly**
   - **AmzLoss Monthly** → amount `$7.99`, interval **monthly**
   - **AmzLoss Yearly** → amount `$59.00`, interval **yearly**
3. After each plan is created, copy its **Plan code** (it looks like `PLN_xxxxxxxx`).

**Step 3 — Put the values into the site**
Open `js/paystack.js` and replace the placeholders:

```js
publicKey: 'pk_live_xxxxxxxxxxxxxxxxx',   // from Step 1
plans: {
  weekly:  'PLN_xxxxxxxx',                 // from Step 2
  monthly: 'PLN_xxxxxxxx',
  yearly:  'PLN_xxxxxxxx'
},
currency: 'USD',                           // or 'NGN'
```

**Step 4 — Test it**
1. Before going live, you can test with your `pk_test_` key against the Paystack test environment (the dashboard has a "Test mode" toggle).
2. Deploy the site, open `pricing.html`, enter an email, click a **Subscribe** button, and complete a payment.
3. In your Paystack dashboard under **Customers / Transactions** you should see the subscription created.

**Notes**
- Paystack settles payouts to your Nigerian bank account. If you price in USD, Paystack handles the currency side; your payout lands in NGN at the settlement rate.
- The free trial/refund flow is manual by design: users email `admin@amzloss.com`, and you can issue refunds inside the Paystack dashboard (Transactions → find the charge → Refund).
- Pricing in USD is recommended because your buyers are mostly US/EU affiliates. If you want local NGN pricing instead, change the amounts in the plans and the `amountsCents` values in `js/paystack.js` (NGN amounts are in kobo).

### 4. Email + trial (Mailchimp)

1. Create a **Mailchimp** account (free tier: 500 contacts).
2. Create an **Audience** (list).
3. Build an **audience signup form** and get the embedded-form code.
4. Paste it into `pricing.html` in place of the placeholder email form (or keep both — the form currently just shows a confirmation message).
5. Use Mailchimp's free "automation" to send a welcome/trial-link email to new signups.

### 5. Ads on the free tier (Google AdSense)

1. Create an **AdSense** account (adsense.google.com) and apply with your domain.
2. While you wait for approval, the ad slots in `calculator.html` and `rates.html` show placeholder labels — replace them with real AdSense `<script>` snippets once approved:

```html
<!-- inside the .ad-slot div -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXX"
     data-ad-slot="YYYY" data-ad-format="auto" data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
```

**Rules we follow for a non-spammy feel:** ads only on the free plan, clearly labelled, never between input and result. The important tools (calculator + audit) carry a bit more ad inventory, but still max ~2 slots per page, no pop-ups, and zero ads on the paid plan.

### 6. Keep the rate data current

Amazon changes rates without notice. Update `js/rates.js` (the `current` value per category) whenever you see a change. This file powers both the calculator and the rate table, and the audit uses it as its expected-rate baseline.

### 7. SEO & AI check before going live

- `robots.txt`, `sitemap.xml`, and `llms.txt` are already in the repo root — they deploy as-is.
- `sitemap.xml` references `https://amzloss.com/...` — once DNS resolves, submit it in **Google Search Console** and **Bing Webmaster Tools**.
- Every page has title/description/canonical/Open Graph/JSON-LD already.
- Replace `og-cover.svg` with a real `og-cover.png` (1200×630) later for richer social shares — or keep the SVG; it works on most platforms.

---

## The audit engine (how the math avoids false positives)

`audit.html` runs entirely in the browser:

1. **Parse** the CSV with a quoted-field-aware parser; auto-detect the header row.
2. **Separate** returns/refunds (negative values) and uncategorised rows — excluded so they can never be flagged against you.
3. **Compute expected commission** = current published rate × item price × quantity.
4. **Flag** only when `gap ≥ $5` **AND** `gap/expected ≥ 15%` — a **possible irregularity**, never a "confirmed" claim.
5. **Output** summary, worst categories, and flagged line items.

---

## TODO / next steps

- [ ] **Paystack:** copy public key + create 3 plans → paste into `js/paystack.js` (see section 3)
- [ ] Create GitHub repo + push this folder
- [ ] Create Netlify account + deploy
- [ ] Connect amzloss.com to Netlify (DNS)
- [ ] Submit sitemap.xml to Google Search Console + Bing
- [ ] Mailchimp audience + embed form
- [ ] AdSense application + swap ad slots
- [ ] Replace logo with your own PNG (drop in `assets/img/logo.svg` spot)
- [ ] Review the Paystack proof screenshots for personal info before they go public
