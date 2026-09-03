/* AmzLoss SEO Intelligence — Link Prospecting Engine 2.0
   Generates link acquisition targets from competitor backlinks, resource gaps,
   and broken link opportunities. Never fabricates prospect data. */

export function linkProspecting({
  competitors = [],
  backlinkFeed = null,
  brokenLinks = [],
  resourceGaps = [],
  amzlossPages = [],
  minDR = 30,
  maxProspects = 50
} = {}) {
  const prospects = [];
  const seenDomains = new Set();

  function addProspect(p) {
    const domain = p.domain || p.url;
    if (seenDomains.has(domain)) return;
    seenDomains.add(domain);
    prospects.push(p);
  }

  /* Competitor backlink analysis */
  for (const comp of competitors) {
    if (!comp.backlinks) continue;
    for (const link of comp.backlinks.slice(0, 30)) {
      if ((link.dr || 0) < minDR) continue;
      addProspect({
        type: "competitor_reference",
        url: link.source_url,
        domain: link.domain,
        source_domain_rating: link.dr,
        anchor_text: link.anchor,
        target_page: link.target_url,
        reason: `Competitor ${comp.domain} has a link from ${link.domain} (DR: ${link.dr})`,
        priority: link.dr > 70 ? "HIGH" : link.dr > 50 ? "MEDIUM" : "LOW"
      });
    }
  }

  /* Resource gap link prospects */
  for (const gap of resourceGaps) {
    if (!gap.target_url) continue;
    addProspect({
      type: "resource_gap",
      url: gap.target_url,
      domain: gap.domain,
      target_page: gap.target_page,
      reason: gap.reason || `Resource gap: "${gap.topic}" on ${gap.domain}`,
      priority: "MEDIUM"
    });
  }

  /* Broken link opportunities */
  for (const bl of brokenLinks) {
    if (!bl.replacing_with) continue;
    addProspect({
      type: "broken_link_replacement",
      url: bl.page_with_broken_link,
      domain: bl.domain,
      broken_url: bl.broken_url,
      replacing_with: bl.replacing_with,
      reason: `Replace broken link to ${bl.broken_url} with AMZLOSS content`,
      priority: bl.dr > 50 ? "HIGH" : "MEDIUM"
    });
  }

  /* Guest post / resource page prospects */
  for (const comp of competitors) {
    for (const ref of (comp.guest_post_opportunities || []).slice(0, 5)) {
      addProspect({
        type: "guest_post",
        url: ref.url,
        domain: ref.domain,
        da: ref.da,
        reason: `Guest post opportunity on ${ref.domain}`,
        priority: ref.da > 40 ? "HIGH" : "MEDIUM"
      });
    }
  }

  const sorted = prospects
    .sort((a, b) => { const p = { HIGH: 0, MEDIUM: 1, LOW: 2 }; return (p[a.priority] || 2) - (p[b.priority] || 2); })
    .slice(0, maxProspects);

  return sorted;
}

export function outreachSequence(prospects) {
  return prospects.map((p, i) => ({
    sequence_id: i + 1,
    type: p.type,
    url: p.url,
    priority: p.priority,
    email_template: buildTemplate(p),
    status: "pending"
  }));
}

function buildTemplate(p) {
  if (p.type === "broken_link_replacement") return `Hi, I noticed the link to ${p.broken_url} on ${p.url} is broken. We have a comprehensive resource that would be a great replacement: ${p.replacing_with}.`;
  if (p.type === "resource_gap") return `Hi, I came across your page on ${p.domain} and noticed you reference "${p.target_page}". We have an up-to-date resource that might be valuable for your readers.`;
  return `Hi, I found your site through ${p.reason}. We have related content that your audience might find useful.`;
}