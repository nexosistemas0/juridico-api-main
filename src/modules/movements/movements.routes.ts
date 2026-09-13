import { Router } from "express";
import * as controller from "./movements.controller.js";
import * as validator from "./movements.validator.js";
import {asyncHandler} from "../../utils/asyncHandler.js";


const router = Router();

// TODO: implementar seguindo o padrão do módulo users
// movements é imutável (timeline) -> sem PUT/DELETE
router.get("/", asyncHandler(controller.getAll));
router.get("/:id", asyncHandler(controller.getById));
router.post("/", asyncHandler(validator.createValidator),asyncHandler(controller.create));
//   POST   /                    -> registrar movimentação
//   GET    /process/:id         -> listar movimentações de um processo

export default router;
