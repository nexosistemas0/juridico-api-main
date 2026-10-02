import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as controller from "./process.controller.js";
import * as validator from "./process.validator.js";
import { checkAdv, checkUser } from "../../middlewares/checkPermition.js";
import { AuthUser } from "../../middlewares/authUser.js";

const router = Router();
router.use(AuthUser);
router.get(
  "/",
  asyncHandler(checkAdv),
  asyncHandler(controller.getAllProcesses),
);
router.get(
  "/:id",
  asyncHandler(checkUser),
  asyncHandler(controller.getProcessById),
);
router.post(
  "/",
  asyncHandler(checkAdv),
  asyncHandler(validator.createValidator),
  asyncHandler(controller.createProcess),
);
router.put(
  "/:id",
  asyncHandler(checkAdv),
  asyncHandler(validator.updateValidator),
  asyncHandler(controller.updateProcess),
);
router.delete(
  "/:id",
  asyncHandler(checkAdv),
  asyncHandler(validator.removeValidator),
  asyncHandler(controller.deleteById),
);

export default router;
