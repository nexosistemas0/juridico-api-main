import {pool} from "../../config/database.js";
import { Lawyers, CreateLawyersInput, UpdateLawyersInput } from "../../types/lawyers.types.js";

export const findAll = async () => {
    const result = await pool.query(`select l.id, l.id_user ,u.name as name, l.oab as OAB, l.position as position, l.whatsapp as whatsapp, l.photo as photo  from public.lawyers l
join users u on u.id = l.id_user ORDER BY l.id`);
    return result.rows;
}

export const findById = async (id: number): Promise<Lawyers | null> => {
    const result = await pool.query(`select l.id, l.id_user ,u.name as name, l.oab as OAB, l.position as position, l.whatsapp as whatsapp, l.photo as photo  from public.lawyers l
join users u on u.id = l.id_user where l.id = $1`, [id]);
    return result.rows[0] || null;
}

export async function create(data: CreateLawyersInput): Promise<Lawyers> {
    const {id_user, oab, position, whatsapp, photo} = data;
    const result = await pool.query(`INSERT INTO public.lawyers(
    id_user, oab, position, whatsapp, photo)
    VALUES ($1, $2, $3, $4, $5) RETURNING *`, [id_user, oab, position, whatsapp, photo]);
    return result.rows[0];
};

export async function update(id: number, data: UpdateLawyersInput): Promise<Lawyers | null> {
    const existing = await findById(id);
        if(!existing) return null;
    
        const merged = {...existing, ...data}; 
    
    const result = await pool.query(`UPDATE public.lawyers
    SET id_user=$1, oab=$2, position=$3, whatsapp=$4, photo=$5
    WHERE id = $6 RETURNING *`, [merged.id_user, merged.oab, merged.position, merged.whatsapp, merged.photo, id]);
    return result.rows[0] || null;
}


export async function remove(id: number): Promise<boolean> {
    const result = await pool.query(`DELETE FROM public.lawyers WHERE id = $1`, [id]);
    return result.rowCount > 0;
}

