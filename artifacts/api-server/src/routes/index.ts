import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import hodRouter from "./hod";
import rmRouter from "./rm";
import resourcesRouter from "./resources";
import bookingsRouter from "./bookings";
import notificationsRouter from "./notifications";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(hodRouter);
router.use(rmRouter);
router.use(resourcesRouter);
router.use(bookingsRouter);
router.use(notificationsRouter);
router.use(analyticsRouter);

export default router;
