///// APLICAR MANUALMENTE
import { Router } from "express";

import { asyncHandler } from "../../utils/asyncHandler.js";
import * as usersController from "./users.controller.js";
import * as usersValidator from "./user.validator.js";
import { AuthUser } from "../../middlewares/authUser.js";
import * as check from "../../middlewares/check/checkPermition.js";
import { authLimiter, globlalLimiter } from "../../middlewares/rateLimit.js";
import { checkProcessOwner } from "../../middlewares/check/checkProccesOwner.js";
import { checkProcessOwnerLawyer } from "../../middlewares/check/checkProccesLawyer.js";
const router = Router();

router.use(globlalLimiter
);


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

router.put(
  "/:id",
  asyncHandler(AuthUser),
  asyncHandler(check.checkAdv),
  asyncHandler(checkProcessOwnerLawyer),
  asyncHandler(usersValidator.updateValidator),
  asyncHandler(usersController.update),
);
router.delete(
  "/:id",
  asyncHandler(AuthUser),
  asyncHandler(check.checkAdv),
  asyncHandler(checkProcessOwnerLawyer),
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
