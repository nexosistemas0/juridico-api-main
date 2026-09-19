import { Router } from "express";
import * as costumersController from "./costumers.controller.js";
import * as constumersValidador from "./costumers.validator.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { checkAdv, checkUser } from "../../middlewares/checkPermition.js";
import { AuthUser } from "../../middlewares/authUser.js";
const router = Router();

// TODO: implementar seguindo o padrão do módulo users
router.get(
    "/", 
    asyncHandler(AuthUser),
    asyncHandler(checkAdv),
    asyncHandler(costumersController.list));

router.get("/:id", 
    asyncHandler(AuthUser),
    asyncHandler(checkUser),
    asyncHandler(costumersController.getOne));


router.post(
  "/",
  asyncHandler(AuthUser),
  asyncHandler(checkAdv),
  asyncHandler(constumersValidador.createValidator),
  asyncHandler(costumersController.create),
);
router.put(
  "/:id",
  asyncHandler(AuthUser),
  asyncHandler(checkAdv),
  asyncHandler(constumersValidador.updateValidator),
  asyncHandler(costumersController.update),
);
router.delete(
  "/:id",
  asyncHandler(AuthUser),
  asyncHandler(checkAdv),
  asyncHandler(constumersValidador.removeValidator),
  asyncHandler(costumersController.remove),
);

export default router;
