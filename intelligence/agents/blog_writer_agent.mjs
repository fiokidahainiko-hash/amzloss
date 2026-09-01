/* AmzLoss Specialized AI Agent: Blog Writer Agent
   Responsible for: Creating articles following the SEO strategy and brand voice, producing useful human-first content. */

import { runAgentTask } from "./agent_runner.mjs";
import { getBlogContext } from "../memory/retriever.mjs";

export async function runBlogWriterAgent({ researchData, brief }) {
  const keyword = researchData?.primary_keyword || brief?.title || "Amazon Affiliate Strategy";
  const category = researchData?.target_category || brief?.category || "Tools";
  const context = getBlogContext({ topic: keyword, keyword, category });

  const systemPrompt = `You are the Blog Writer Agent for AmzLoss.
Write high-quality, human-first, authoritative blog posts for Amazon affiliates and webmasters.

STRICT BRAND RULES:
- Tone: Independent, analytical, direct, webmaster-focused.
- BANNED INTRO PHRASES: Do NOT use "In today's fast-paced digital landscape", "In conclusion", "Whether you are a beginner...", "Delve into".
- Short paragraphs (2-4 sentences max).
- Bold key takeaways and mathematical formulas.
- Include structured sections: Title, Category Kicker, TL;DR Summary, Core Explanation, Practical Example/Math, FAQ section (3 Q&As), Call to Action.
- Return JSON object with keys: title, slug, category, meta_description, keywords, tldr_points (array), content_html, faq (array of {question, answer}).`;

  const userPrompt = `SEO Research Data: ${JSON.stringify(researchData)}
Brief Info: ${JSON.stringify(brief)}
Brand & Style Context: ${JSON.stringify(context.brand_standards)}

Generate the complete article JSON object following all brand voice and structure guidelines.`;

  return runAgentTask({
    role: "writing",
    agentName: "BlogWriterAgent",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => {
      const slug = (brief?.slug || keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
      const title = researchData?.recommended_title || brief?.title || `${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: 2026 Strategy Guide`;
      return {
        title,
        slug,
        category,
        meta_description: `Learn how to analyze ${keyword} for Amazon Associates in 2026. Calculate exact earnings, audit report discrepancies, and protect your margins.`,
        keywords: [keyword, `${keyword} 2026`, "amazon affiliate earnings", "commission audit"],
        tldr_points: [
          `Amazon commission is calculated on the eligible order amount after discounts, not sticker price.`,
          `2026 category rate changes directly impact net earnings per referred sale.`,
          `Auditing your earnings report CSV helps catch misclassified category rates.`
        ],
        content_html: `<section class="intro">
<p class="lead">Amazon Associates payouts depend on the eligible order amount after discounts and excluded fees. If your earnings dropped despite steady traffic, understanding how ${keyword} works is essential to recovering lost revenue.</p>
</section>

<section>
<h2>Understanding ${keyword} in 2026</h2>
<p>Every referred sale on Amazon is subject to the operating agreement's category rate table. When a customer uses a coupon, promotional code, or receives discounted pricing, your commission percentage applies to the reduced total—not the original list price.</p>
<p>To calculate your true return on traffic, you must combine category rate, average discount percentage, and conversion rate.</p>
</section>

<section>
<h2>The Mathematical Formula</h2>
<p>Use this core equation when evaluating your product earnings reports:</p>
<p><strong>Net Commission = (Sticker Price - Discounts - Excluded Fees) × Category Rate</strong></p>
<p>For example, a $100 product in Home (3% rate) with a 20% promotional discount yields an eligible amount of $80. Your commission is $80 × 0.03 = $2.40, rather than $3.00.</p>
</section>

<section>
<h2>How to Audit Your Reports for Discrepancies</h2>
<ol>
<li>Download your monthly Earnings Report CSV from Amazon Associates Central.</li>
<li>Filter by column <code>Direct Earnings</code> vs <code>Indirect Earnings</code>.</li>
<li>Compare the reported rate against the official 2026 Category Rate Table.</li>
<li>Use the free <a href="../audit.html">AmzLoss Earnings Audit tool</a> to process the file in your browser without uploading data to an external server.</li>
</ol>
</section>`,
        faq: [
          {
            question: `How does ${keyword} affect my monthly Amazon payout?`,
            answer: `It determines the baseline eligible order amount on which category percentage rates are applied. Excluded fees like delivery or gift wrap earn zero commission.`
          },
          {
            question: `Can I verify if Amazon underpaid a specific transaction?`,
            answer: `Yes. Export your Product Earnings CSV report and check the category rate assigned to each ASIN against the current 2026 rate table.`
          },
          {
            question: `Is the AmzLoss audit tool completely private?`,
            answer: `Yes. AmzLoss parses CSV files entirely inside your browser using JavaScript. No report data or tracking IDs are uploaded to any server.`
          }
        ]
      };
    }
  });
}
