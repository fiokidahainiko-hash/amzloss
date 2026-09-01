/* AmzLoss Specialized Agent: Motion Design Agent
   Responsible for: Animation curves, scroll reveals, hover states, kinetic text, micro-interactions, reduced motion CSS. */

import { runAgentTask } from "../../agents/agent_runner.mjs";

export async function runMotionDesignAgent({ uiSpec }) {
  const systemPrompt = `You are the Lead Motion Designer for AmzLoss.
Your task is to design a cohesive, non-distracting animation & micro-interaction specification for the page.
RULES:
- Purposeful motion > excessive motion.
- Standard duration: 150ms micro-interactions, 250ms component hover, 400ms scroll reveals.
- Easing: cubic-bezier(0.16, 1, 0.3, 1).
- Include prefers-reduced-motion fallback CSS snippet.
Return JSON format with keys: motion_system_summary, easing_curves, micro_interactions (array of { trigger, element, animation_effect, duration_ms, easing }), scroll_animations (array), css_motion_code, reduced_motion_css.`;

  const userPrompt = `UI Design Specification: ${JSON.stringify(uiSpec)}

Generate the complete Motion Design blueprint. Return valid JSON only.`;

  return runAgentTask({
    role: "motion",
    agentName: "MotionDesignAgent",
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    fallbackGenerator: () => ({
      motion_system_summary: "Subtle, purposeful motion system designed to guide user attention and provide tactile feedback without impacting load time or accessibility.",
      easing_curves: {
        standard: "cubic-bezier(0.16, 1, 0.3, 1)",
        entrance: "cubic-bezier(0.0, 0.0, 0.2, 1)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)"
      },
      micro_interactions: [
        {
          trigger: "hover",
          element: ".btn-primary",
          animation_effect: "translateY(-2px) scale(1.01) + shadow expand",
          duration_ms: 180,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)"
        },
        {
          trigger: "click",
          element: ".copy-btn",
          animation_effect: "scale(0.95) -> scale(1.0) with green check icon pop",
          duration_ms: 150,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)"
        },
        {
          trigger: "hover",
          element: ".calc-panel, .stat-tile",
          animation_effect: "border-color transition to var(--brand) + translateY(-4px)",
          duration_ms: 250,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)"
        }
      ],
      scroll_animations: [
        {
          element: ".section-head, .stat-grid, .faq-item",
          effect: "Opacity fade 0 to 1 + translateY(24px to 0px)",
          duration_ms: 400,
          stagger_delay_ms: 80
        }
      ],
      css_motion_code: `.btn { transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease; }\n.btn:hover { transform: translateY(-2px); }\n.stat-tile { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease; }\n.stat-tile:hover { transform: translateY(-4px); border-color: var(--brand); }`,
      reduced_motion_css: `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }`
    })
  });
}
