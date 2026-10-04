import { Response, Request, NextFunction } from "express";
import pool from "../../config/database.js";
import { StatusCodes } from "http-status-codes";

export async function checkProcessOwner(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.userId.id;
  const processId = Number(req.params.id);

  try {
    const result = await pool.query(
      `SELECT p.id FROM process p
        LEFT JOIN lawyers l ON l.id = p.id_lawyer AND l.id_user = $2
        LEFT JOIN costumers c ON c.id = p.id_costumer AND c.id_user = $2
        WHERE p.id = $1 AND (l.id IS NOT NULL OR c.id IS NOT NULL)`,
      [processId, userId],
    );

    if (result.rows.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Processo não encontrado" });
    }

    return next();
  } catch (err) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Erro interno do servidor" });
  }
}
