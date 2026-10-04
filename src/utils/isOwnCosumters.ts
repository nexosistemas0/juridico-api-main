import pool from "../config/database.js";

export async function isOwnCostumer(userId: number, costumerId: number) {
const r = await pool.query(
`SELECT 1 FROM public.costumers WHERE id = $1 AND id_user = $2`,
[costumerId, userId]
);
return (r.rowCount ?? 0) > 0;
}