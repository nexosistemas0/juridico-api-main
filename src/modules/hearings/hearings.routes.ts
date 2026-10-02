import { Router } from "express";
import * as controller from "./hearings.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as validator from "./hearings.validator.js";
import {AuthUser} from "../../middlewares/authUser.js";
import {checkUser, checkAdv} from "../../middlewares/checkPermition.js";
const router = Router();
router.use(AuthUser);


// TODO: implementar seguindo o padrão do módulo users
router.get("/", 
  asyncHandler(checkAdv),
  asyncHandler(controller.findAll));
router.post(
  "/",
  asyncHandler(checkAdv),
  asyncHandler(validator.createValidator),
  asyncHandler(controller.create),
);
router.put(
  "/:id",
  asyncHandler(checkAdv),
  asyncHandler(validator.updateValidator),
  asyncHandler(controller.update),
);
router.delete(
  "/:id",
  asyncHandler(checkAdv),
  asyncHandler(validator.removeValidator),
  asyncHandler(controller.remove),
);

router.get("/:id", 
  asyncHandler(checkUser),
  asyncHandler(controller.findById));
export default router;
