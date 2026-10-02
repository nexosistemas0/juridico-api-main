import './config/TranslationsYup.js';
import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import {globlalLimiter} from "./middlewares/rateLimit.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(globlalLimiter);
app.use("/api", routes);

app.use(errorHandler);

export default app;
