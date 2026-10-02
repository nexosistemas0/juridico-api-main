import * as controller from "./documents.controller.js";
import * as validator from "./documents.validator.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Router } from "express";
import {AuthUser} from "../../middlewares/authUser.js";
import {checkAdv, checkUser} from "../../middlewares/checkPermition.js";
import { upload } from "../../middlewares/upload.js"; // ajuste pro nome real do seu arquivo
const router = Router();
router.use(AuthUser);
// TODO: implementar seguindo o padrão do módulo users
router.post(
  "/",
  asyncHandler(checkAdv),
  upload.single("file"),
  validator.createValidator,
  controller.create,
);
router.put(
  "/:id",
  asyncHandler(checkAdv),
  upload.single("file"),
  validator.updateValidator,
  controller.update,
);
router.get("/:id", 
  asyncHandler(checkUser), 
  asyncHandler(controller.getById));

router.get("/", 
  asyncHandler(checkAdv),
  asyncHandler(controller.list));

router.delete(
  "/:id",
  asyncHandler(checkAdv),
  validator.removeValidator,
  asyncHandler(controller.remove),
);

export default router;
