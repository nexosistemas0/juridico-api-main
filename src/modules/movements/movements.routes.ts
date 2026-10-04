// sem checkPermition
import { Router } from "express";
import * as controller from "./movements.controller.js";
import * as validator from "./movements.validator.js";
import {asyncHandler} from "../../utils/asyncHandler.js";

import { AuthUser } from "../../middlewares/authUser.js";
import { checkAdv } from "../../middlewares/check/checkPermition.js";

const router = Router();
router.use(AuthUser)

router.get("/", asyncHandler(controller.getAll));
router.get("/:id", asyncHandler(controller.getById));
router.post("/", asyncHandler(checkAdv),asyncHandler(validator.createValidator),asyncHandler(controller.create));


export default router;
