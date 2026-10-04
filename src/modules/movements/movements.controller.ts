import {Request, Response} from "express";
import * as service from './movements.service.js';
import {StatusCodes} from "http-status-codes";
import { canAccessChild } from "../../utils/acces.js";

export async function getAll(req:Request, res:Response){
    const movements = await service.getAll();
    return res.status(StatusCodes.OK).json({movements: movements});
}

export async function getById(req:Request, res:Response){
    const id = Number(req.params.id);
    if (!(await canAccessChild(req.userId.id, "movements", id))) {
    return res.status(404).json({ message: "movemento não encontrado" });
  }
    const movement = await service.getById(id);
    return res.status(StatusCodes.OK).json({movement: movement});
}

export async function create(req:Request, res:Response){
    await service.create(req.body);
    return res.status(StatusCodes.CREATED).json({message: "Movements criado com sucesso"});
}