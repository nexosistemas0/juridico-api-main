import { Router } from "express";
import * as costumersController from "./costumers.controller.js";
import * as constumersValidador from "./costumers.validator.js";
import {asyncHandler} from "../../utils/asyncHandler.js"
const router = Router();

// TODO: implementar seguindo o padrão do módulo users
router.get("/", asyncHandler(costumersController.list));
router.get("/:id", asyncHandler(costumersController.getOne));
router.post("/", asyncHandler(constumersValidador.createValidator) ,asyncHandler(costumersController.create));
router.put("/:id", asyncHandler(constumersValidador.updateValidator), asyncHandler(costumersController.update));
router.delete("/:id", asyncHandler(constumersValidador.removeValidator), asyncHandler(costumersController.remove));

export default router;
