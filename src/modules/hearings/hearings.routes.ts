import { Router } from "express";
import * as controller from "./hearings.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as validator from "./hearings.validator.js";

const router = Router();

// TODO: implementar seguindo o padrão do módulo users
router.get("/", asyncHandler(controller.findAll));
router.post(
  "/",
  asyncHandler(validator.createValidator),
  asyncHandler(controller.create),
);
router.put(
  "/:id",
  asyncHandler(validator.updateValidator),
  asyncHandler(controller.update),
);
router.delete(
  "/:id",
  asyncHandler(validator.removeValidator),
  asyncHandler(controller.remove),
);

router.get("/:id", asyncHandler(controller.findById));
export default router;
