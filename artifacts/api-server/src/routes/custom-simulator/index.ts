import { Router, type IRouter } from "express";
import { getState, resetState } from "./state";
import { generateScenario } from "./generate";
import { handleAction } from "./action";
import { handleAgent } from "./agent";
import { handleCommand } from "./commands";

const router: IRouter = Router();

router.post("/custom-simulator/generate", async (req, res): Promise<void> => {
  const { description, company } = req.body as { description?: string; company?: string };
  if (!description || typeof description !== "string") {
    res.status(400).json({ error: "description is required" });
    return;
  }
  const co = typeof company === "string" && company.trim() ? company.trim() : "Your Company";

  // Run generation in background — client polls /state
  generateScenario(description, co).catch(() => {});

  // Return immediately with generating=true state
  res.json(getState());
});

router.get("/custom-simulator/state", (_req, res): void => {
  res.json(getState());
});

router.post("/custom-simulator/action", async (req, res): Promise<void> => {
  const { actionId } = req.body as { actionId?: string };
  if (!actionId || typeof actionId !== "string") {
    res.status(400).json({ error: "actionId is required" });
    return;
  }
  const result = await handleAction(actionId);
  res.json(result);
});

router.post("/custom-simulator/agent", async (req, res): Promise<void> => {
  const { agentId, message } = req.body as { agentId?: string; message?: string };
  if (!agentId || !message) {
    res.status(400).json({ error: "agentId and message are required" });
    return;
  }
  const result = await handleAgent(agentId, message);
  res.json(result);
});

router.post("/custom-simulator/command", async (req, res): Promise<void> => {
  const { command } = req.body as { command?: string };
  if (!command || typeof command !== "string") {
    res.status(400).json({ error: "command is required" });
    return;
  }
  const output = await handleCommand(command);
  res.json({ output });
});

router.post("/custom-simulator/reset", (_req, res): void => {
  res.json(resetState());
});

export default router;
