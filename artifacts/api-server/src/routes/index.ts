import { Router, type IRouter } from "express";
import healthRouter from "./health";
import simulatorRouter from "./simulator";
import cosSimulatorRouter from "./cos-simulator";
import customSimulatorRouter from "./custom-simulator";

const router: IRouter = Router();

router.use(healthRouter);
router.use(simulatorRouter);
router.use(cosSimulatorRouter);
router.use(customSimulatorRouter);

export default router;
