import { Router, type IRouter } from "express";
import healthRouter from "./health";
import personalityRouter from "./personality";

const router: IRouter = Router();

router.use(healthRouter);
router.use(personalityRouter);

export default router;
