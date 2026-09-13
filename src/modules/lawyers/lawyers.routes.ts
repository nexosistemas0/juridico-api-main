import { Router } from "express";
import * as lawyerValidator from "./lawyers.validator.js";
import * as controller from "./lawyers.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
const router = Router();

// TODO: implementar seguindo o padrão do módulo users
router.get("/",  asyncHandler(controller.list));
router.get("/:id", asyncHandler(controller.getById));
router.post("/", asyncHandler(lawyerValidator.createValidator), asyncHandler(controller.create));
router.put("/:id", asyncHandler(lawyerValidator.updateValidator), asyncHandler(controller.update));
router.delete("/:id", asyncHandler(lawyerValidator.removeValidator), asyncHandler(controller.remove));
//   PUT    /:id       -> atualizar advogado
//   DELETE /:id       -> remover advogado

export default router;