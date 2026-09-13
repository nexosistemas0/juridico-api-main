import { Request, Response } from "express";
import * as service from "./documents.service.js";
import { StatusCodes } from "http-status-codes";

export async function list(req: Request, res: Response) {
  const documents = await service.findAll();
  return res.status(StatusCodes.OK).json({ documents: documents });
}

export async function getById(req: Request, res: Response) {
  const { id } = req.params;
  const document = await service.findById(Number(id));
  if (!document) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Documento não encontrado" });
  }
  return res.status(StatusCodes.OK).json({ document });
}

export async function create(req: Request, res: Response) {
  const { id_process, name, status, date_sed, date_ass } = req.body;
  const file = req.file;

  if (!file) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Arquivo é obrigatório" });
  }

  const document = await service.create(
    {
      id_process,
      name,
      status,
      date_sed: new Date(date_sed),
      date_ass: new Date(date_ass),
    },
    file,
  );
  return res.status(StatusCodes.CREATED).json({ document });
}

export const update = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { id_process, name, status, date_sed, date_ass } = req.body;
  const file = req.file;

  const document = await service.update(
    Number(id),
    {
      id_process,
      name,
      status,
      date_sed: date_sed ? new Date(date_sed) : undefined,
      date_ass: date_ass ? new Date(date_ass) : undefined,
    },
    file,
  );

  if (!document) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Documento não encontrado" });
  }

  return res.status(StatusCodes.OK).json({ document });
};

export async function remove(req: Request, res: Response) {
  const { id } = req.params;
  const success = await service.remove(Number(id));
  if (!success) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Documento não encontrado" });
  }
  return res.status(StatusCodes.NO_CONTENT).send();
}
