import { Router, type IRouter } from "express";
import { getState, resetState, loadScenario } from "./state";
import { handleCommand } from "./commands";
import { handleAction, handleDiagnosis, handleRecovery } from "./actions";
import { handleAgent } from "./agent";
import {
  RunCommandBody,
  TakeActionBody,
  QueryAgentBody,
  SelectScenarioBody,
  SubmitDiagnosisBody,
  ExecuteRecoveryBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/simulator/state", (_req, res): void => {
  res.json(getState());
});

router.post("/simulator/command", async (req, res): Promise<void> => {
  const parsed = RunCommandBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const output = handleCommand(parsed.data.command);
  res.json({ output, state: getState() });
});

router.post("/simulator/action", async (req, res): Promise<void> => {
  const parsed = TakeActionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const result = handleAction(parsed.data.action);
  res.json(result);
});

router.post("/simulator/agent", async (req, res): Promise<void> => {
  const parsed = QueryAgentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const result = await handleAgent(parsed.data.agent, parsed.data.message);
  res.json(result);
});

router.post("/simulator/reset", (_req, res): void => {
  const state = resetState();
  res.json(state);
});

router.post("/simulator/select-scenario", (req, res): void => {
  const parsed = SelectScenarioBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const state = loadScenario(parsed.data.scenarioId);
  res.json(state);
});

router.post("/simulator/diagnose", (req, res): void => {
  const parsed = SubmitDiagnosisBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const result = handleDiagnosis(
    parsed.data.rootCauseCategory,
    parsed.data.specificTrigger,
    parsed.data.blastRadius
  );
  res.json(result);
});

router.post("/simulator/recover", (req, res): void => {
  const parsed = ExecuteRecoveryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const result = handleRecovery(parsed.data.strategy);
  res.json(result);
});

export default router;
