import { Response, Request } from "express";
import * as service from "./notifications.service.js"
import { StatusCodes } from "http-status-codes";

export async function getAll(req: Request, res: Response) {
    const notification = await service.getAll();
    return res.status(StatusCodes.OK).json({message: notification});
}

export async function getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const notification = await service.getById(id);
    return res.status(StatusCodes.OK).json({message: notification});
}