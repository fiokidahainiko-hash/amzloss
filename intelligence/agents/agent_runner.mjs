/* AmzLoss Content Intelligence — OmniRoute Agent Execution Engine
   Handles model routing (fast, reasoning, writing), timeouts, retries,
   graceful fallbacks, and execution logging. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INTELLIGENCE_DIR = path.join(__dirname, "..");
const CONFIG_DIR = path.join(INTELLIGENCE_DIR, "config");
const MEMORY_DIR = path.join(INTELLIGENCE_DIR, "memory");

function loadJson(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {
    console.warn(`[AgentRunner] Warning reading ${filePath}: ${e.message}`);
  }
  return fallback;
}

const routingConfig = loadJson(path.join(CONFIG_DIR, "routing_config.json"), {
  omniroute: { base_url: "https://api.omniroute.ai/v1", timeout_ms: 30000 },
  roles: {
    fast: { primary_model: "auto/best-coding", fallbacks: ["oc/deepseek-v4-flash-free", "local-fallback"] },
    reasoning: { primary_model: "auto/best-coding", fallbacks: ["auto", "local-fallback"] },
    writing: { primary_model: "auto/best-coding", fallbacks: ["auto", "local-fallback"] }
  }
});

/**
 * Log execution details into memory/feedback_history.json
 */
function logExecution(logEntry) {
  const historyPath = path.join(MEMORY_DIR, "feedback_history.json");
  const history = loadJson(historyPath, { generation_logs: [], performance_metrics: {} });
  if (!history.generation_logs) history.generation_logs = [];
  history.generation_logs.push({
    timestamp: new Date().toISOString(),
    ...logEntry
  });
  // Limit log size to 200 entries
  if (history.generation_logs.length > 200) {
    history.generation_logs = history.generation_logs.slice(-200);
  }
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), "utf-8");
  } catch (e) {
    console.warn(`[AgentRunner] Could not save feedback log: ${e.message}`);
  }
}

/**
 * Main AI Agent Task Executor via OmniRoute with Fallbacks
 */
export async function runAgentTask({
  role = "reasoning",
  agentName = "UnknownAgent",
  systemPrompt = "You are a helpful AI content specialist.",
  userPrompt = "",
  jsonOutput = false,
  fallbackGenerator = null
}) {
  const startTime = Date.now();
  const baseUrl = process.env.OMNIROUTE_BASE_URL || routingConfig.omniroute?.base_url || "https://api.omniroute.ai/v1";
  const apiKey = process.env.OMNIROUTE_API_KEY || process.env.OPENAI_API_KEY || "omniroute-dev-key";
  const timeoutMs = routingConfig.omniroute?.timeout_ms || 30000;

  const roleConfig = routingConfig.roles[role] || routingConfig.roles.reasoning;
  const modelsToTry = [roleConfig.primary_model, ...(roleConfig.fallbacks || [])];

  let lastError = null;

  for (const model of modelsToTry) {
    if (model === "local-fallback") {
      console.log(`[AgentRunner][${agentName}] Executing local rule-based fallback...`);
      if (typeof fallbackGenerator === "function") {
        const result = fallbackGenerator();
        logExecution({
          agent: agentName,
          role,
          model: "local-fallback",
          status: "success_fallback",
          elapsed_ms: Date.now() - startTime
        });
        return result;
      }
      throw new Error(`[AgentRunner][${agentName}] Local fallback generator not defined.`);
    }

    try {
      console.log(`[AgentRunner][${agentName}] Attempting model '${model}' via OmniRoute...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const payload = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        ...(jsonOutput ? { response_format: { type: "json_object" } } : {})
      };

      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`OmniRoute HTTP ${response.status}: ${errText.slice(0, 150)}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;

      if (!reply) {
        throw new Error("OmniRoute returned empty response payload.");
      }

      logExecution({
        agent: agentName,
        role,
        model,
        status: "success",
        elapsed_ms: Date.now() - startTime
      });

      if (jsonOutput) {
        try {
          // Clean code blocks if present
          const cleaned = reply.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          return JSON.parse(cleaned);
        } catch (parseErr) {
          console.warn(`[AgentRunner][${agentName}] JSON parse error, returning raw text: ${parseErr.message}`);
          return reply;
        }
      }

      return reply;

    } catch (err) {
      lastError = err.message;
      console.warn(`[AgentRunner][${agentName}] Model '${model}' failed: ${err.message}. Trying next fallback...`);
      logExecution({
        agent: agentName,
        role,
        model,
        status: "fallback_triggered",
        error: err.message
      });
    }
  }

  // If all API calls failed, use local fallback if available
  if (typeof fallbackGenerator === "function") {
    console.log(`[AgentRunner][${agentName}] All remote models failed. Executing local fallback engine...`);
    const fallbackResult = fallbackGenerator();
    logExecution({
      agent: agentName,
      role,
      model: "final-local-fallback",
      status: "success_final_fallback",
      elapsed_ms: Date.now() - startTime
    });
    return fallbackResult;
  }

  throw new Error(`[AgentRunner][${agentName}] Task failed for all models. Last error: ${lastError}`);
}
