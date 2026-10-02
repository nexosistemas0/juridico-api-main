import { Router } from "express";
import * as controller from "./notifications.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { checkAdv, checkUser } from "../../middlewares/checkPermition.js";
import { AuthUser } from "../../middlewares/authUser.js";
import * as validator from "./notifications.validator.js";
const router = Router();
router.use(AuthUser);
// TODO: implementar seguindo o padrão do módulo users
router.get("/", 
    asyncHandler(checkAdv),
    asyncHandler(controller.getAll)
);
router.get("/:id",
    asyncHandler(checkUser),
     controller.getById
);
// notification é gerada pelo sistema (sem POST manual)
//   GET    /            -> listar notificações do usuário logado
//   PATCH  /:id/read     -> marcar como lida

export default router;
