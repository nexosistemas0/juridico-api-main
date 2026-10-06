import { Response, Request } from "express";
import * as service from "./notifications.service.js"
import { StatusCodes } from "http-status-codes";

export async function getAll(req: Request, res: Response) {
    const userId = Number(req.userId);
    const notification = await service.getAll(userId);
    return res.status(StatusCodes.OK).json({message: notification});
}

export async function getById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const userId = req.userId.id;
  const notification = await service.getById(id, userId);
  if (!notification) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Notificação não encontrada" });
  }
  return res.status(StatusCodes.OK).json({ message: notification });
}