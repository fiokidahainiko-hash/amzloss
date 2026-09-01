/* AmzLoss Editorial Content Network — Editorial Collections & Related-Content Modules
   Creates collection/list pages that provide genuine user value, and builds
   "Continue Learning" / "Related Tools" / "Complete the Guide" modules
   generated from the relationship graph (not random recent posts). */

import { semanticNeighbors } from "./relationship_graph.mjs";

/**
 * Create editorial collections from a topic's content.
 * A collection only created when it provides genuine user value (>=3 members).
 */
export function buildEditorialCollections(topic, clusterPages, pillar) {
  const collections = [];

  const tools = clusterPages.filter(p => p.role === "tool" || /calculator|audit|checker|analyzer/.test(p.slug || ""));
  if (tools.length >= 3) {
    collections.push({
      type: "tool_collection",
      title: `${topic} Tools and Calculators`,
      slug: slugify(`${topic}-tools-and-calculators`),
      members: tools.map(p => p.slug),
      value: `Curates ${tools.length} calculators/audit tools that people working on ${topic} regularly need.`,
      linked_from_members: true,
      relationshipType: "MEMBER_OF_COLLECTION"
    });
  }

  const guides = clusterPages.filter(p => /guide|how to|strategy|beginner|deep/.test((p.title || "").toLowerCase()));
  if (guides.length >= 3) {
    collections.push({
      type: "guide_collection",
      title: `Complete ${topic} Guide`,
      slug: slugify(`complete-${topic}-guide`),
      members: guides.map(p => p.slug),
      value: `A sequential set of guides that teaches ${topic} from introduction to advanced.`,
      linked_from_members: false,
      relationshipType: "PART_OF_TRAIL"
    });
  }

  if (clusterPages.length >= 5 && pillar) {
    collections.push({
      type: "hub_collection",
      title: `${topic} Resource Hub`,
      slug: slugify(`${topic}-resource-hub`),
      members: clusterPages.slice(0, 10).map(p => p.slug),
      value: `Central hub linking all ${topic} supporting content and tools.`,
      linked_from_members: true,
      relationshipType: "MEMBER_OF_COLLECTION"
    });
  }

  return collections;
}

/**
 * Build "Related Content Modules" at the end of an article, generated from the
 * semantic relationship graph (NOT random recent posts).
 */
export function buildRelatedContentModules(pageSlug, graph, pages) {
  const neighbors = semanticNeighbors(graph, pageSlug);
  const byType = {};

  // Group neighbors by relationship meaning
  for (const [type, items] of Object.entries(neighbors)) {
    const meaning = type === "READER_NEXT_STEP" ? "Continue Learning" :
                    type === "CONNECTS_TO_TOOL" || type === "CALCULATOR_FOR" ? "Related Tools" :
                    type === "MEMBER_OF_COLLECTION" ? "Complete the Guide" : "Related Content";
    if (!byType[meaning]) byType[meaning] = [];
    byType[meaning].push(...items.map(i => ({ slug: i.neighbor, relationshipType: type })));
  }

  const pageLookup = {};
  for (const p of pages) pageLookup[p.slug] = p;

  const modules = [];
  for (const [heading, items] of Object.entries(byType)) {
    modules.push({
      module: heading,
      items: items.slice(0, 5).map(i => ({
        title: pageLookup[i.slug]?.title || i.slug,
        slug: i.slug,
        relationship: i.relationshipType
      }))
    });
  }

  return {
    page_slug: pageSlug,
    modules,
    generated_from_graph: true
  };
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
