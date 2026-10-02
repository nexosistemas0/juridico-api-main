import {Response, Request, NextFunction} from "express";
import { StatusCodes } from "http-status-codes";
import Jwt from "jsonwebtoken";

export async function AuthUser(req : Request, res: Response, next: NextFunction) {
     const header = req.headers.authorization as string; 
     if(!header){
          return res.status(StatusCodes.UNAUTHORIZED).json({message: "Não autorizado"});
     }
     
     const barrer = header.split(" ");
     const token = barrer[1];
     let decoded = null;
     try{
          decoded = Jwt.verify(token, process.env.JWT_SECRET_KEY as string);
     }catch(err){
          return res.status(StatusCodes.UNAUTHORIZED).json({message: "token invalido"});
     }
     if(decoded === null) return res.status(StatusCodes.UNAUTHORIZED).json({message: "token invalido"})

     req.userId = {id: (decoded as any).id};
     console.log(req.userId.id)
     if(req.userId.id === undefined){
          return res.status(StatusCodes.UNAUTHORIZED).json({message: "Não autorizado, user invalido"});
     }
     return next();
};