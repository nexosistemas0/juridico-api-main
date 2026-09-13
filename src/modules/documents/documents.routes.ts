import * as controller from "./documents.controller.js";
import * as validator from "./documents.validator.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Router } from "express";
import { upload } from "../../middlewares/upload.js"; // ajuste pro nome real do seu arquivo
const router = Router();

// TODO: implementar seguindo o padrão do módulo users
router.post(
  "/",
  upload.single("file"),
  validator.createValidator,
  controller.create,
);
router.put(
  "/:id",
  upload.single("file"),
  validator.updateValidator,
  controller.update,
);
router.get("/:id", asyncHandler(controller.getById));
router.get("/", asyncHandler(controller.list));
router.delete(
  "/:id",
  validator.removeValidator,
  asyncHandler(controller.remove),
);

export default router;
