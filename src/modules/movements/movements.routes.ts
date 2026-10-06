// sem checkPermition
import { Router } from "express";
import * as controller from "./movements.controller.js";
import * as validator from "./movements.validator.js";
import {asyncHandler} from "../../utils/asyncHandler.js";

import { AuthUser } from "../../middlewares/authUser.js";
import { checkAdv, checkUser } from "../../middlewares/check/checkPermition.js";

const router = Router();
router.use(AuthUser);

router.get("/", asyncHandler(checkAdv), asyncHandler(controller.getAll));
router.get("/:id", asyncHandler(checkUser),asyncHandler(controller.getById));
router.post("/", asyncHandler(checkAdv),asyncHandler(validator.createValidator),asyncHandler(controller.create));


export default router;
