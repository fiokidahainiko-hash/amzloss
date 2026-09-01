export function getBlogContext({ topic = "", keyword = "", category = "Tools" } = {}) {
  const relevantExamples = (Array.isArray(approvedExamples) ? approvedExamples : [])
    .filter(ex => ex.content_type === "blog" && ex.status === "approved")
    .slice(0, 2);

  const relevantPages = SITE_PAGES.filter(p => p.category === category || topic.toLowerCase().includes(p.keywords[0]));

  return {
    seo_rules: {
      search_intent: seoKnowledge.seo_rules?.search_intent || {},
      internal_linking: seoKnowledge.seo_rules?.internal_linking || {},
      eeat: seoKnowledge.seo_rules?.eeat_and_affiliate_guidelines || {}
    },
    brand_standards: {
      brand_voice: blogKnowledge.blog_standards?.brand_voice || {},
      writing_style: blogKnowledge.blog_standards?.writing_style || {},
      banned_phrases: blogKnowledge.blog_standards?.brand_voice?.banned_phrases || []
    },
    internal_link_targets: relevantPages,
    approved_examples: relevantExamples
  };
}

/**
 * Retrieve selective context for TikTok Generation
 */
export function getTikTokContext({ topic = "", format = "educational" } = {}) {
  const relevantExamples = (Array.isArray(approvedExamples) ? approvedExamples : [])
    .filter(ex => ex.content_type === "tiktok" && ex.status === "approved")
    .slice(0, 2);

  return {
    hook_formulas: tiktokKnowledge.tiktok_standards?.hook_formulas || [],
    banned_intros: tiktokKnowledge.tiktok_standards?.banned_intros || [],
    storytelling_structure: tiktokKnowledge.tiktok_standards?.storytelling_structure || {},
    retention_techniques: tiktokKnowledge.tiktok_standards?.retention_techniques || {},
    tiktok_seo: tiktokKnowledge.tiktok_standards?.tiktok_seo || {},
    approved_examples: relevantExamples
  };
}

/**
 * NEW: Retrieve selective context for Premium SaaS Web Design Generation
 */
export function getDesignContext({ pageName = "" } = {}) {
  return {
    saas_design_principles: saasDesignKnowledge,
    motion_design_principles: motionKnowledge,
    visual_references: (Array.isArray(visualReferences) ? visualReferences : []).slice(0, 3),
    creative_rejected_feedback: (Array.isArray(creativeFeedback.rejected_creative_feedback) ? creativeFeedback.rejected_creative_feedback : []).filter(f => f.type === "website_design")
  };
}

/**
 * NEW: Retrieve selective context for Video Production Generation
 */
export function getVideoContext({ topic = "" } = {}) {
  return {
    creative_styles: loadJson(path.join(INTELLIGENCE_DIR, "video", "systems", "creative_styles.json"), {}),
    kinetic_typography: loadJson(path.join(INTELLIGENCE_DIR, "video", "systems", "kinetic_typography.json"), {}),
    sound_design: loadJson(path.join(INTELLIGENCE_DIR, "video", "systems", "sound_design.json"), {}),
    approved_references: (Array.isArray(creativeFeedback.approved_creative_references) ? creativeFeedback.approved_creative_references : []).filter(f => f.type === "video_production").slice(0, 2),
    rejected_video_feedback: (Array.isArray(creativeFeedback.rejected_creative_feedback) ? creativeFeedback.rejected_creative_feedback : []).filter(f => f.type === "video_production")
  };
}