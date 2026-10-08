import pool from "../config/database.js";

export async function isOwnCostumer(userId: number, costumerId: number) {
const r = await pool.query(
`SELECT 1 FROM public.costumers WHERE id = $1 AND id_user = $2`,
[costumerId, userId]
);
return (r.rowCount ?? 0) > 0;
};



// utils/isOwnCosumters.ts
export async function canViewCostumer(userId: number, costumerId: number) {
  const r = await pool.query(
    `SELECT 1 FROM public.costumers WHERE id = $1 AND id_user = $2
     UNION ALL
     SELECT 1 FROM public.lawyers WHERE id_user = $2`,
    [costumerId, userId],
  );
  return (r.rowCount ?? 0) > 0;
};