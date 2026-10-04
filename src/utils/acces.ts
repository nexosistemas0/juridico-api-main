import pool from "../config/database.js";

type Child = "documents" | "hearings" | "movements";

export async function canAccessChild(userId: number, table: Child, id: number) {
  const r = await pool.query(
    `SELECT 1
       FROM public.${table} t
       JOIN public.process p ON p.id = t.id_process
       LEFT JOIN public.costumers c ON c.id = p.id_costumer
       LEFT JOIN public.lawyers  l ON l.id = p.id_lawyer
      WHERE t.id = $1 AND (c.id_user = $2 OR l.id_user = $2)`,
    [id, userId]);
  return (r.rowCount ?? 0) > 0;
}