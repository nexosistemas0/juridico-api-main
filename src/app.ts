import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import portal from './portal/router.js';
import {resolve} from 'node:path';

const app=express();
app.disable('x-powered-by');
// Configure only when a known reverse proxy is deployed. Never trust arbitrary hops.
if(process.env.TRUST_PROXY_HOPS) app.set('trust proxy',Number(process.env.TRUST_PROXY_HOPS));
const origins=(process.env.APP_ORIGIN||'http://localhost:5173').split(',').map(v=>v.trim());
app.use(cors({origin:origins,credentials:true}));
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  if(req.headers.origin && !origins.includes(req.headers.origin)) return res.status(403).json({message:'Origem não autorizada.'});
  next();
});
app.use(express.json({limit:'64kb'}));
app.use('/api',rateLimit({windowMs:60000,limit:180,standardHeaders:'draft-7',legacyHeaders:false}),portal);
if(process.env.FRONTEND_DIST){
  const directory=resolve(process.env.FRONTEND_DIST);
  app.use(express.static(directory,{index:false}));
  app.get(/.*/,(_req,res)=>res.sendFile(resolve(directory,'index.html')));
}
app.use((_req,res)=>res.status(404).json({message:'Rota não encontrada.'}));
export default app;
