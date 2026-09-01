/* AmzLoss Specialized Agent: UX Strategist Agent
   Determines: Page purpose, target user, primary action, secondary action, information hierarchy, visual hierarchy, conversion opportunities. */

import { runAgentTask } from "../../agents/agent_runner.mjs";

export async function runUxStrategistAgent({ pageName, targetAudience = "Amazon Affiliates & Webmasters" }) {
  const systemPrompt = `You are the Senior UX Strategist for AmzLoss.
When designing or upgrading a web page:
1. Define the primary page purpose and user mental model.
2. Specify the primary user action (e.g. Run Audit, Calculate Commission, Compare Rates).
3. Specify secondary actions.
4. Establish clear information hierarchy (above-the-fold hero, value proof, interactive tool, feature benefits, FAQ, conversion CTA).
5. Identify conversion friction points and mitigations.
Return JSON format with keys: page_name, target_audience, primary_purpose, primary_action, secondary_action, information_hierarchy (array), conversion_opportunities (array), mobile_ux_rules.`;

  const userPrompt = `Page Name: "${pageName}"
Target Audience: ${targetAudience}

Develop a comprehensive UX strategy blueprint. Return valid JSON only.`;

  return runAgentTask({
    role: "design",
    agentName: "UxStrategistAgent",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => ({
      page_name: pageName,
      target_audience: targetAudience,
      primary_purpose: `Enable users to instantly audit, calculate, and optimize ${pageName} without friction or forced registration.`,
      primary_action: `Interact with the primary tool interface above the fold`,
      secondary_action: `Explore related rate tables and educational guides`,
      information_hierarchy: [
        { rank: 1, section: "Hero & Tool Interface", purpose: "Immediate utility and value delivery above the fold" },
        { rank: 2, section: "TL;DR Key Insights & Math Proof", purpose: "Build trust through transparent mathematical formulas" },
        { rank: 3, section: "Feature Benefits & Interactive Demo", purpose: "Demonstrate privacy (browser-only) and speed" },
        { rank: 4, section: "Structured FAQ Section", purpose: "Address long-tail user questions and schema SEO" },
        { rank: 5, section: "Conversion & Sister Tools Band", purpose: "Drive navigation to complementary webmaster tools" }
      ],
      conversion_opportunities: [
        "Zero-signup friction: immediate calculation output",
        "One-click copy snippet button with visual feedback",
        "Direct link to sister tools (e.g. Audit -> Rates -> Calculator)"
      ],
      mobile_ux_rules: "Single column layout on screens <768px, 48px minimum touch target size for buttons, sticky CTA header."
    })
  });
}
