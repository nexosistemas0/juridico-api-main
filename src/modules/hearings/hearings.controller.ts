import { Request, Response } from "express";
import * as service from "./hearings.service.js";
import * as serviceProcess from "../process/process.service.js";
import { StatusCodes } from "http-status-codes";

export async function findAll(req: Request, res: Response) {
  const hearings = await service.findAll();
  return res.status(StatusCodes.OK).json({ message: hearings });
}

export async function findById(req:Request,res:Response) {
  const id = Number(req.params.id);
  const hearing = await service.findById(id);
  if(!hearing) return res.status(StatusCodes.NOT_FOUND).json({message: "Audiencia não encontrada"});
  return res.status(StatusCodes.OK).json({hearing: hearing})
}

export async function create(req: Request, res: Response) {
  const { id_process } = req.body;
  const processExisting = await serviceProcess.findById(id_process);
  if (!processExisting) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Processo não existe na base de dados" });
  }
  const hearing = await service.create(req.body);
  return res
    .status(StatusCodes.CREATED)
    .json({ message: "Audiencia criada com sucesso" });
}

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const hearingExisting = await service.findById(id);

  if (!hearingExisting) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: "Audiencia não existente na base de dados",
    });
  }
  const { id_process } = req.body;
  if (id_process !== undefined) {
    const newProcess = await serviceProcess.findById(id_process);
    console.log(newProcess);
    if (!newProcess) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Processo não existente na base de dados",
      });
    }
  }

  const updateHearing = await service.update(id, req.body);
  console.log(updateHearing);
  if (!updateHearing) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: "Não foi possivel alterar a audiencia",
    });
  }
  return res
    .status(StatusCodes.OK)
    .json({ message: "Update realizado com sucesso" });
}


export async function remove(req:Request,res:Response){
    const id = Number(req.params.id);
    const hearing = await service.remove(id);
    return res.status(StatusCodes.OK).json({message: "Audiencia deletada com sucesso"});
}