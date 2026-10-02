///// APLICAR MANUALMENTE
import { Router } from "express";

import { asyncHandler } from "../../utils/asyncHandler.js";
import * as usersController from "./users.controller.js";
import * as usersValidator from "./user.validator.js";
import { AuthUser } from "../../middlewares/authUser.js";
import * as check from "../../middlewares/checkPermition.js";
import { authLimiter, globlalLimiter } from "../../middlewares/rateLimit.js";
const router = Router();

router.use(globlalLimiter
);

router.get(
  "/",
  asyncHandler(check.checkAdv),
  usersController.list,
);
router.get(
  "/:id",
  asyncHandler(check.checkAdv),
  asyncHandler(usersController.getOne),
);

router.put(
  "/:id",
  asyncHandler(check.checkAdv),
  asyncHandler(usersValidator.updateValidator),
  asyncHandler(usersController.update),
);
router.delete(
  "/:id",
  asyncHandler(check.checkAdv),
  asyncHandler(usersController.remove),
);
////// LOGIN
router.post(
  "/register",
  authLimiter,
  asyncHandler(usersValidator.createValidator),
  asyncHandler(usersController.create),
);

router.post("/login", authLimiter ,asyncHandler(usersController.login));
export default router;
