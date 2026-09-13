import { pool } from "../../config/database.js";
import {
  Process,
  CreateProcessInput,
  UpdateProcessInput,
} from "../../types/process.types.js";

export async function findAll(): Promise<Process[]> {
  const result = await pool.query("SELECT * FROM process");
  return result.rows;
}

export async function findById(id: number): Promise<Process | null> {
  const result = await pool.query("SELECT * FROM process WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function createProcess(
  data: CreateProcessInput,
): Promise<Process> {
  const result = await pool.query(
    `INSERT INTO public.process(
        process_num, title, id_costumer, id_lawyer, status, area, last_update, court, observations)
        VALUES ($1, $2, $3, $4, $5, $6, now(), $7, $8) RETURNING *`,
    [
      data.process_num,
      data.title,
      data.id_costumer,
      data.id_lawyer,
      data.status,
      data.area,
      data.court,
      data.observations,
    ],
  );
  return result.rows[0];
}


export async function updateProcess(id: number, data: UpdateProcessInput): Promise<Process | null> {
  const existing = await findById(id);
  if(!existing) return null;

  const merged = {...data, ...existing};

  const result = await pool.query(`UPDATE public.process
	SET process_num=$1, title=$2, id_costumer=$3, id_lawyer=$4, status=$5, area=$6, last_update=now(), court=$7, observations=$8
	WHERE id=$9`,[merged.process_num, merged.title, merged.id_costumer, merged.id_lawyer, merged.status, merged.area, merged.court, merged.observations]);


  return result.rows[0];
}