import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);

  // unique_violation (ex: e-mail, CPF, OAB ou process_num duplicado)
  if (err.code === "23505") {
    return res
      .status(409)
      .json({ error: "Registro duplicado (violação de unique constraint)" });
  }

  // foreign_key_violation (ex: id_process/id_user/id_costumer/id_lawyer inválido)
  if (err.code === "23503") {
    return res
      .status(400)
      .json({ error: "Referência inválida (violação de foreign key)" });
  }

  // not_null_violation (ex: campo obrigatório não enviado)
  if (err.code === "23502") {
    return res
      .status(400)
      .json({ error: "Campo obrigatório não informado" });
  }

  res.status(err.status || 500).json({
    error: err.message || "Erro interno do servidor",
  });
}
