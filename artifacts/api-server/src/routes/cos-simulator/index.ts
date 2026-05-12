import { Router, type IRouter } from "express";
import { getState, resetState } from "./state";
import { handleCommand } from "./commands";
import { handleAction } from "./actions";
import { handleAgent } from "./agent";
import {
  RunCosCommandBody,
  TakeCosActionBody,
  QueryCosAgentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cos-simulator/state", (_req, res): void => {
  res.json(getState());
});

router.post("/cos-simulator/command", async (req, res): Promise<void> => {
  const parsed = RunCosCommandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const output = handleCommand(parsed.data.command);
  res.json({ output, state: getState() });
});

router.post("/cos-simulator/action", async (req, res): Promise<void> => {
  const parsed = TakeCosActionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = handleAction(parsed.data.action);
  res.json(result);
});

router.post("/cos-simulator/agent", async (req, res): Promise<void> => {
  const parsed = QueryCosAgentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = await handleAgent(parsed.data.agent, parsed.data.message);
  res.json(result);
});

router.post("/cos-simulator/reset", (_req, res): void => {
  const state = resetState();
  res.json(state);
});

export default router;
