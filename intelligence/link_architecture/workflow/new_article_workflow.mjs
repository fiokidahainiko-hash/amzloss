/* AmzLoss Internal Link Architecture — New Article Internal Link Workflow */

import { scorePage } from "../importance/importance_scorer.mjs";
import { findLinkToThisPage, findLinkFromThisPage } from "../analysis/link_recommendation_engines.mjs";

export async function runNewArticleWorkflow(newArticle, allPages, linkGraph, topicCluster = null) {
  const slug = newArticle.slug;
  const title = newArticle.title;
  const content = newArticle.content || "";
  const category = newArticle.category || "Tools";
  const keywords = newArticle.keywords || [];

  const articlePage = scorePage({
    slug, title, category,
    role: topicCluster?.pillar_topic === title ? "pillar" : "supporting",
    inboundLinks: 0, outboundLinks: 0,
    crawlDepth: topicCluster ? 3 : 4,
    isOrphan: true,
    businessImportance: category === "Tools" ? 8 : 6,
    contentQuality: 7
  });

  const relatedPages = allPages.filter(p => {
    const pText = (p.title || p.slug || "").toLowerCase() + " " + (p.keywords || []).join(" ").toLowerCase();
    return keywords.some(kw => pText.includes(kw.toLowerCase())) || p.category === category;
  });

  const inboundRecommendations = findLinkToThisPage(articlePage, allPages, linkGraph, keywords);
  const outboundRecommendations = findLinkFromThisPage(articlePage, allPages, linkGraph, keywords);

  const role = topicCluster?.pillar_topic === title ? "pillar" :
               relatedPages.length >= 3 ? "supporting" : "standalone";

  return {
    new_article: { slug, title, category, role, importance_score: articlePage.importanceScore, importance_class: articlePage.importanceClass, assigned_cluster: (topicCluster?.pillar_topic) || "standalone", related_existing_pages: relatedPages.map(p => ({ slug: p.slug, title: p.title, importance: p.importanceClass })), is_orphan: true },
    step4_inbound_recommendations: inboundRecommendations,
    step5_outbound_recommendations: outboundRecommendations,
    step6_role_determination: { role, reason: role === "pillar" ? "This article is the central topic" : role === "supporting" ? "Supports " + (topicCluster?.pillar_topic || "cluster") : "Standalone article" },
    pending_actions: ["Approve/reject inbound link recommendations", "Approve/reject outbound link recommendations", "After approvals: update graph and recalculate"]
  };
}
