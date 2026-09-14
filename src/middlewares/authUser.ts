import {Response, Request, NextFunction} from "express";
import Jwt from "jsonwebtoken";

export async function AuthUser(req : Request, res: Response, next: NextFunction) {
     const header = req.headers.authorization as string; 
     if(!header){
          console.log('NÃO EXISTE TOKEN');
     }
     const barrer = header.split(" ");
     const token = barrer[1];
     res.json({token: token});
}
