import { Router } from "express";
import * as lawyerValidator from "./lawyers.validator.js";
import * as controller from "./lawyers.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {AuthUser} from "../../middlewares/authUser.js";
import {checkAdv, checkUser} from "../../middlewares/check/checkPermition.js";

const router = Router();
router.use(AuthUser);
// TODO: implementar seguindo o padrão do módulo users
router.get("/",  
    asyncHandler(checkAdv),
    asyncHandler(controller.list));
router.get("/:id", 
    asyncHandler(checkUser),
    asyncHandler(controller.getById));
router.post("/", 
    asyncHandler(checkAdv),
    asyncHandler(lawyerValidator.createValidator), 
    asyncHandler(controller.create));
router.put("/:id", 
    asyncHandler(checkAdv),
    asyncHandler(lawyerValidator.updateValidator), 
    asyncHandler(controller.update));
router.delete("/:id", 
    asyncHandler(checkAdv),
    asyncHandler(lawyerValidator.removeValidator), 
    asyncHandler(controller.remove));


export default router;