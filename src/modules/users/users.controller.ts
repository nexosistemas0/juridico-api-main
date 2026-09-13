import { Request, Response } from "express";
import * as yup from "yup";
import * as usersService from "./users.service.js";
import { StatusCodes } from "http-status-codes";
import { bodyValidationCreate } from "./users.squema.js";
import { log } from "console";
import { resourceUsage } from "process";

export async function list(req: Request, res: Response) {
  const users = await usersService.findAll();
  res.status(StatusCodes.OK).json(users);
};

export async function getOne(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: "ID inválido" });
  }

  const user = await usersService.findById(id);
  if (!user) return res.status(StatusCodes.NOT_FOUND).json({ error: "Usuário não encontrado" });
  res.status(StatusCodes.OK).json(user);
};

export async function create(req: Request, res: Response) {
  let validatedBody;
  try {
    validatedBody = await bodyValidationCreate.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    
  } catch (err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      errors: err instanceof yup.ValidationError ? err.errors : ["Dados inválidos"],
    });
  }
  try {
    const user = await usersService.create(validatedBody);
    return res.status(StatusCodes.CREATED).json(user);
  } catch (err) {
    console.error(err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Erro ao criar usuário" });
  }
};

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: "ID inválido" });
}

  // TODO: run req.body through a bodyValidationUpdate schema before this line
  const user = await usersService.update(id, req.body);
  if (!user) return res.status(StatusCodes.NOT_FOUND).json({ error: "Usuário não encontrado" });
  res.status(StatusCodes.OK).json(user);
};

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: "ID inválido" });
  }

  const removed = await usersService.remove(id);
  if (!removed) return res.status(StatusCodes.NOT_FOUND).json({ error: "Usuário não encontrado" });
  res.status(StatusCodes.NO_CONTENT).send();
};

export async function login(req: Request, res: Response){
  const {email, password} = req.body;
  const token = await usersService.Login(email, password);
  if(!token){
    return res.status(StatusCodes.UNAUTHORIZED).json({message: "Email ou senha invalidos"})
  }
  return res.status(StatusCodes.ACCEPTED).json({message: "Autorizado", Token: token});
};