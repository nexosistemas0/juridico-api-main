import { Connection, Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.on("connect", () => {
  console.log("Conectado ao PostgreSQL");
});

pool.on("error", (err) => {
  console.error("Erro inesperado no pool do PostgreSQL", err);
  process.exit(-1);
});
export default pool;