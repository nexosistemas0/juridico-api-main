import { StatusCodes } from "http-status-codes";
import { pool } from "../config/database.js";
import { Request, Response, NextFunction } from "express";

async function getUserType(userId: string) {
    const result = await pool.query(
        `SELECT type FROM public.users WHERE id = $1`,
        [userId]
    );
    return result.rows[0]?.type ?? null;
}

export async function checkAdv(req: Request, res: Response, next: NextFunction) {
    const userId = req.userId.id;

    if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Acesso não autorizado" });
    }

    try {
        const userType = await getUserType(userId);

        if (userType !== "adv") {
            return res.status(StatusCodes.FORBIDDEN).json({ message: "Acesso restrito a advogados" });
        }

        // req.userType = userType;
        return next();
    } catch (err) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Erro interno do servidor" });
    }
}

export async function checkUser(req: Request, res: Response, next: NextFunction) {
    const userId = req.userId?.id;
    if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Acesso não autorizado" });
    }

    try {
        const userType = await getUserType(userId);
        if (userType !== "costumer" && userType != "adv") {
            return res.status(StatusCodes.FORBIDDEN).json({ message: "Acesso restrito a usuários comuns" });
        }

        // req.userType = userType;
        return next();
    } catch (err) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Erro interno do servidor" });
    }
}