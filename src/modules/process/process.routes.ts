import { Router } from "express";
import {asyncHandler} from "../../utils/asyncHandler.js";
import * as controller from "./process.controller.js";
const router = Router();

// TODO: implementar seguindo o padrão do módulo users
router.get("/", asyncHandler(controller.getAllProcesses));
router.get("/:id", asyncHandler(controller.getProcessById));
router.post("/", asyncHandler(controller.createProcess));
//   POST   /          -> criar processo
//   PUT    /:id       -> atualizar processo
//   DELETE /:id       -> remover processo

export default router;
