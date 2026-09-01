/* AmzLoss Editorial Content Network — Editorial Hub & Collection Identifier
   Identifies opportunities for hub/collection pages across multiple types:
   topic, problem, tool, beginner, comparison, resource, seasonal.
   A hub organizes a group of related articles/tools and links to the most
   important supporting pages; supporting pages link back contextually. */

import { HUB_TYPES } from "./relationship_graph.mjs";

/**
 * Identify potential hub pages for a set of content nodes.
 * @param {Array} pages - content nodes {slug,title,category,keywords,importanceClass,role,cluster}
 * @returns {Array} detected hub opportunities
 */
export function identifyHubs(pages) {
  const byCategory = {};
  for (const p of pages) {
    const cat = p.category || "General";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  }

  const hubs = [];
  for (const [category, members] of Object.entries(byCategory)) {
    if (members.length < 3) continue;

    const hasTool = members.some(m => m.role === "tool" || /calculator|audit|checker/.test(m.slug || ""));
    const hasComparison = /compar|versus|vs|alternative|network/.test(members.map(m => m.title).join(" ").toLowerCase());

    // Determine hub type
    let hubType = "topic";
    if (hasTool && members.length >= 5) hubType = "tool";
    else if (hasComparison) hubType = "comparison";
    else if (/beginner|guide|get started/.test(members.map(m => m.title).join(" ").toLowerCase())) hubType = "beginner";

    const mostImportant = [...members].sort((a, b) => (b.importanceClass === "CRITICAL" ? 3 : b.importanceClass === "HIGH" ? 2 : 1) - (a.importanceClass === "CRITICAL" ? 3 : a.importanceClass === "HIGH" ? 2 : 1));

    hubs.push({
      hub_slug: generateHubSlug(category, hubType),
      hub_title: generateHubTitle(category, hubType),
      hub_type: hubType,
      category,
      member_count: members.length,
      listed_members: mostImportant.slice(0, 10).map(m => m.slug),
      recommended_link_targets: members.sort((a, b) => rankMember(b) - rankMember(a)).slice(0, 8).map(m => m.slug),
      rationale: `A ${hubType} hub for "${category}" would organize ${members.length} related pages into a coherent collection and support both users and internal-link architecture.`
    });
  }
  return hubs;
}

/**
 * Detect a specific hub type for a given topic/cluster.
 */
export function detectHubForCluster(clusterPages, pillar) {
  const categories = new Set(clusterPages.map(p => (p.category || "General")));
  return {
    pillar: pillar?.slug || null,
    candidate_hubs: identifyHubs([...clusterPages, ...(pillar ? [pillar] : [])]),
    hub_types_possible: Array.from(new Set(identifyHubs([...clusterPages, ...(pillar ? [pillar] : [])]).map(h => h.hub_type)))
  };
}

/* --- helpers --- */

function generateHubSlug(category, hubType) {
  const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const map = {
    topic: `${slug}-guide`,
    tool: `${slug}-tools`,
    problem: `${slug}-resources`,
    beginner: `${slug}-for-beginners`,
    comparison: `${slug}-platforms-compared`,
    resource: `${slug}-resources`
  };
  return map[hubType] || `${slug}-hub`;
}

function generateHubTitle(category, hubType) {
  const map = {
    topic: `${category} Guide`,
    tool: `${category} Tools & Calculators`,
    problem: `${category} Solutions`,
    beginner: `${category} for Beginners`,
    comparison: `${category} Compared`,
    resource: `${category} Resources`
  };
  return map[hubType] || `${category} Hub`;
}

function rankMember(m) {
  const importance = m.importanceClass === "CRITICAL" ? 100 : m.importanceClass === "HIGH" ? 80 : m.importanceClass === "MEDIUM" ? 50 : 20;
  const roleBonus = m.role === "tool" ? 15 : m.role === "pillar" ? 12 : 0;
  return importance + roleBonus;
}
