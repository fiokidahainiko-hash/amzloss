/* AmzLoss SEO Intelligence — Article Blueprint Engine
   Produces a data-driven content brief for a proposed gap: primary
   query, intent definition, target cluster, who it links to (and who
   links to it), entity coverage checklist, FAQ seeds, differentiation
   notes, and the original-value mandate.

   All fields derive from real site data + provided feeds. No invented
   volume or ranking claims. */

import { classifyIntent, clusterIntentCoverage } from "../keyword/search_intent.mjs";
import { matchKeywordToArticle } from "../keyword/keyword_intelligence.mjs";
import { entityCoverageMap, STRATEGIC_ENTITIES } from "../topics/entity_coverage.mjs";
import { clusterAuthorityScore } from "../topics/topical_authority.mjs";

export function articleBlueprint(site, { title = "", slug = "", intent = null, cluster = null, notes = "" } = {}) {
  const topic = title || slug.replace(/-/g, " ");
  const intentInfo = classifyIntent(topic);
  const targetIntent = intent || intentInfo.intent;
  const targetCluster = cluster || findClusterForTopic(site, topic);

  const intentDef = classifyIntent(topic).definition;
  const coverage = clusterIntentCoverage(site, targetCluster);
  const entities = entityCoverageMap(site);
  const authority = clusterAuthorityScore(site, targetCluster);
  const competitors = entityCoverageMap(site).strategic_entities.filter(e => e.coverage_status === "THIN" || e.coverage_status === "ABSENT").slice(0, 6);

  // Related pages that should link to the new blueprint page
  const linkSources = site.articles.filter(a => a.topic_cluster === targetCluster && a.slug !== slug);

  // Gaps in entity coverage this page should fill
  const thinEntities = entities.thin.map(e => e.entity);

  // Human-approved publishing checkpoint
  const gating = {
    requires_approval: true,
    reason: "New content creation is an approval-gated action (NEW_CONTENT)."
  };

  return {
    blueprint_id: `bp-${slug || slugify(topic)}`,
    title: title || "",
    primary_query: topic,
    slug: slug || slugify(topic),
    intent: targetIntent,
    intent_definition: intentDef,
    cluster: targetCluster,
    cluster_authority: authority.score,
    cluster_tier: authority.tier,
    covered_intents_in_cluster: coverage.covered_intents,
    links_to_add: site.articles
      .filter(a => (a.topic_cluster || null) === targetCluster && a.pillar)
      .map(a => ({ source: a.slug, target: a.pillar || null })),
    entities_to_cover: STRATEGIC_ENTITIES.filter(e => {
      const c = entities.strategic_entities.find(x => x.entity === e);
      return c && (c.coverage_status === "THIN" || c.coverage_status === "ABSENT");
    }).slice(0, 8),
    thin_entities_in_play: thinEntities,
    faq_seeds: faqSeeds(targetCluster, topic),
    original_value_mandate: "Must contain original analysis: exact rate tables, runnable formula, or first-hand audit result. No scraping of competitor text.",
    internal_link_targets: linkSources.slice(0, 6),
    related_pillar: site.clusters[targetCluster]?.pillar ? site.articles.find(a => a.slug === site.clusters[targetCluster].pillar) : null,
    approval_gate: gating,
    editorial_notes: notes
  };
}

function faqSeeds(cluster, topic) {
  const q = [];
  if (topic) q.push(`Does ${topic} affect my Amazon Associates earnings?`);
  q.push(`How do I calculate ${topic.replace(/^how do i |^how to /i, "")}?`);
  q.push(`What changed in 2026?`);
  return q.slice(0, 3);
}

function findClusterForTopic(site, topic) {
  const t = topic.toLowerCase();
  for (const name of Object.keys(site.clusters)) {
    if (t.includes(name.toLowerCase().split(/[&/]/)[0].trim())) return name;
  }
  return Object.keys(site.clusters)[0] || null;
}

function slugify(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

/* Blueprint batch for all genuine gaps. */
export function blueprintsForGaps(site, gaps) {
  return gaps.map(g => articleBlueprint(site, { title: g.topic, cluster: g.cluster, intent: g.intent }));
}