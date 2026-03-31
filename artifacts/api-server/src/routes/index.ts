import { Router, type IRouter } from "express";
import healthRouter from "./health";
import personalityRouter from "./personality";
import accountRouter from "./account";

const router: IRouter = Router();

router.use(healthRouter);
router.use(personalityRouter);
router.use(accountRouter);

export default router;
