import { Request, Response } from "express";
import * as service from "./lawyers.service.js";
import { StatusCodes } from "http-status-codes";

export async function list(req: Request, res: Response) {
  const lawyers = await service.findAll();
  return res.status(StatusCodes.OK).json({ lawyers: lawyers });
}


export async function getById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const lawyer = await service.findById(id);
  if (!lawyer) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Lawyer not found" });
  }
  return res.status(StatusCodes.OK).json({ lawyer: lawyer });
}

export async function create(req: Request, res: Response) {
  const data = req.body;
  const lawyer = await service.create(data);
  return res.status(StatusCodes.CREATED).json({ lawyer: lawyer });
};

export async function update(req: Request, res: Response) { 
  const id = Number(req.params.id);
  const data = req.body;
  const lawyer = await service.update(id, data);
  if (!lawyer) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Lawyer not found" });
  }
  return res.status(StatusCodes.OK).json({ lawyer: lawyer });
}


export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  const success = await service.remove(id);

  if (!success) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Lawyer not found" });
  }
  return res.status(StatusCodes.NO_CONTENT).send("advogado removido com sucesso");
}