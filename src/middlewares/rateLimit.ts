import { rateLimit } from "express-rate-limit";

export const globlalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 500,
    standardHeaders: "draft-8",
    message: "Numero agrasivo de requisições espere um pouco",
    statusCode: 429,
  });
export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    message: {message:  "Numero agrasivo de requisições espere um pouco"},
    statusCode: 429,
  });


