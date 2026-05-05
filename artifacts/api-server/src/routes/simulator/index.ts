import { Router, type IRouter } from "express";
import { getState, resetState } from "./state";
import { handleCommand } from "./commands";
import { handleAction } from "./actions";
import { handleAgent } from "./agent";
import {
  RunCommandBody,
  TakeActionBody,
  QueryAgentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/simulator/state", (_req, res): void => {
  res.json(getState());
});

router.post("/simulator/command", async (req, res): Promise<void> => {
  const parsed = RunCommandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const output = handleCommand(parsed.data.command);
  res.json({ output, state: getState() });
});

router.post("/simulator/action", async (req, res): Promise<void> => {
  const parsed = TakeActionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = handleAction(parsed.data.action);
  res.json(result);
});

router.post("/simulator/agent", async (req, res): Promise<void> => {
  const parsed = QueryAgentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = await handleAgent(parsed.data.agent, parsed.data.message);
  res.json(result);
});

router.post("/simulator/reset", (_req, res): void => {
  const state = resetState();
  res.json(state);
});

export default router;
