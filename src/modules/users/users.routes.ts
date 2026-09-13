import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as usersController from "./users.controller.js";
import * as usersValidator from "./user.validator.js";
const router = Router();

router.get("/", usersController.list);
router.get("/:id", asyncHandler(usersController.getOne));
router.post("/register", asyncHandler(usersValidator.createValidator), asyncHandler(usersController.create));
router.put("/:id", asyncHandler(usersValidator.updateValidator), asyncHandler(usersController.update));
router.delete("/:id", asyncHandler(usersController.remove));
////// LOGIN
router.post("/login", asyncHandler(usersController.login));
export default router;
