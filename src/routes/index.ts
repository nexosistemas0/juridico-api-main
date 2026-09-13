import { Router } from "express";
import usersRoutes from "../modules/users/users.routes.js";
import costumersRoutes from "../modules/costumers/costumers.routes.js";
import lawyersRoutes from "../modules/lawyers/lawyers.routes.js";
import processRoutes from "../modules/process/process.routes.js";
import documentsRoutes from "../modules/documents/documents.routes.js";
import hearingsRoutes from "../modules/hearings/hearings.routes.js";
import movementsRoutes from "../modules/movements/movements.routes.js";
import notificationsRoutes from "../modules/notifications/notifications.routes.js";

const router = Router();

router.use("/users", usersRoutes);
router.use("/costumers", costumersRoutes);
router.use("/lawyers", lawyersRoutes);
router.use("/process", processRoutes);
router.use("/documents", documentsRoutes);
router.use("/hearings", hearingsRoutes);
router.use("/movements", movementsRoutes);
router.use("/notifications", notificationsRoutes);

export default router;
