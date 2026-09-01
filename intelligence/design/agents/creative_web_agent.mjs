/* AmzLoss Specialized Agent: Creative Web Agent
   Responsible for: UI design, layout, typography scale, component choices, card styling, color system, responsive grid. */

import { runAgentTask } from "../../agents/agent_runner.mjs";

export async function runCreativeWebAgent({ uxBlueprint, designSystem }) {
  const systemPrompt = `You are the Lead SaaS Product Designer for AmzLoss.
Your task is to craft a premium modern UI design specification for a web page based on the UX strategy.
STRICT DESIGN RULES:
- Avoid generic 'AI-looking' designs.
- Use TELUS-inspired brand palette: Brand Purple (#4B286D), Accent Green (#2B8000), Dark Slate (#2A2C2E), Light Background (#F7F7F8).
- Use 8px spacing grid.
- Specify typography hierarchy (Inter font family, H1 3.5rem, H2 2.25rem, body 1rem).
- Specify glassmorphism headers, subtle borders, elevated cards with hover states.
Return JSON format with keys: page_title, color_palette, typography_spec, layout_grid, components (array of { name, css_class, visual_description, interactive_states }), html_template_structure.`;

  const userPrompt = `UX Strategy Blueprint: ${JSON.stringify(uxBlueprint)}
Design System Rules: ${JSON.stringify(designSystem)}

Generate the complete UI design specification. Return valid JSON only.`;

  return runAgentTask({
    role: "design",
    agentName: "CreativeWebAgent",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => ({
      page_title: uxBlueprint?.page_name || "AmzLoss Premium SaaS Tool",
      color_palette: {
        background: "#ffffff",
        background_soft: "#f7f7f8",
        brand_purple: "#4b286d",
        accent_green: "#2b8000",
        text_primary: "#2a2c2e",
        text_secondary: "#54595f",
        border_subtle: "#d8d8d8"
      },
      typography_spec: {
        font_family: "Inter, -apple-system, sans-serif",
        h1: "3.5rem / 1.1 line-height / -0.03em letter-spacing / weight 800",
        h2: "2.25rem / 1.2 line-height / -0.02em letter-spacing / weight 700",
        body: "1.0rem / 1.65 line-height / weight 400"
      },
      layout_grid: "12-column responsive CSS grid with 24px gutters, max-width 1200px",
      components: [
        {
          name: "Site Header",
          css_class: "site-header",
          visual_description: "Sticky glassmorphism navigation with blur backdrop filter (16px) and subtle bottom border",
          interactive_states: "Nav items underline animation on hover"
        },
        {
          name: "Hero Panel",
          css_class: "page-head",
          visual_description: "Centered hero section with brand kicker, bold H1 gradient headline, lead paragraph, and ambient lighting glow",
          interactive_states: "Entrance fade-in + translateY animation"
        },
        {
          name: "Calculator Wrap Card",
          css_class: "calc-wrap",
          visual_description: "Two-panel split card container (Input Panel on left, Live Results Panel on right) with 16px border-radius and ambient shadow",
          interactive_states: "Hover elevates 4px with purple border highlight"
        }
      ],
      html_template_structure: "<header class=\"site-header\">...</header><section class=\"page-head\">...</section><section class=\"calc-wrap\">...</section>"
    })
  });
}
