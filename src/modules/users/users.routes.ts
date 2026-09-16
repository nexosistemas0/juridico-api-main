import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as usersController from "./users.controller.js";
import * as usersValidator from "./user.validator.js";
import { AuthUser } from "../../middlewares/authUser.js";
import * as check from "../../middlewares/checkPermition.js";
const router = Router();

router.get(
  "/",
  asyncHandler(AuthUser),
  asyncHandler(check.checkAdv),
  usersController.list,
);
router.get(
  "/:id",
  asyncHandler(AuthUser),
  asyncHandler(check.checkAdv),
  asyncHandler(usersController.getOne),
);
router.post(
  "/register",
  asyncHandler(AuthUser),
  asyncHandler(usersValidator.createValidator),
  asyncHandler(usersController.create),
);
router.put(
  "/:id",
  asyncHandler(AuthUser),
  asyncHandler(check.checkAdv),
  asyncHandler(usersValidator.updateValidator),
  asyncHandler(usersController.update),
);
router.delete(
  "/:id",
  asyncHandler(AuthUser),
  asyncHandler(check.checkAdv),
  asyncHandler(usersController.remove),
);
////// LOGIN
router.post("/login", asyncHandler(usersController.login));
export default router;
