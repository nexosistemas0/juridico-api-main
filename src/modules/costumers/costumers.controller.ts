import { Request, Response } from "express";

import * as costumerService from "./costumers.service.js";
import { StatusCodes } from "http-status-codes";

export async function list(req: Request, res: Response) {
  const costumers = await costumerService.findAll();
  return res.status(StatusCodes.OK).json({ costumers: costumers });
}

export async function getOne(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: "ID inválido" });
  }
  const costumers = await costumerService.findById(id);
  if (costumers === null)
    return res.status(StatusCodes.NOT_FOUND).send("Usuario não encontrado");
  return res.status(StatusCodes.OK).json({ costumer: costumers });
}

export async function create(req: Request, res: Response) {
  const costumer = await costumerService.create(req.body);
  return res.status(StatusCodes.CREATED).send(costumer);
}

// costumer.controller.ts
export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const costumer = await costumerService.update(id, req.body); // já validado e filtrado
  if (!costumer) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ error: "Cliente não encontrado, digite um ID válido" });
  }

  return res.status(StatusCodes.OK).json(costumer);
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  const success = await costumerService.remove(id);
  if (!success) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ error: "Cliente não encontrado, digite um ID válido" });
  }
  return res.status(StatusCodes.NO_CONTENT).send();
}
