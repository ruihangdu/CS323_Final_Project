import { Router, type IRouter } from "express";
import healthRouter from "./health";
import simulatorRouter from "./simulator";
import cosSimulatorRouter from "./cos-simulator";

const router: IRouter = Router();

router.use(healthRouter);
router.use(simulatorRouter);
router.use(cosSimulatorRouter);

export default router;
