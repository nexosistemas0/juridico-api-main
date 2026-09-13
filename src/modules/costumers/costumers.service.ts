import pool from "../../config/database.js"; 

import { CreateCostumersInput, UpdateCostumersInput, Costumers } from "../../types/costumers.types.js";

export async function findAll(): Promise<Costumers[]> {
    const result = await pool.query(`select c.id, c.id_user ,u.name as name, c.cpf as cpf, c.date as data_nascimento, c.address as address from public.costumers c
join users u on u.id = c.id_user ORDER BY c.id`);
    return result.rows;
}


export async function findById(id: number): Promise<Costumers> {
    const result = await pool.query(`select id_user, cpf, date, address from public.costumers where id = $1`, [id]);
    return result.rows[0] ?? null;
}

export async function create(data: CreateCostumersInput): Promise<Costumers>  {
    const {id_user, cpf, date, address} = data;
    const result = await pool.query(`INSERT INTO public.costumers(
	id_user, cpf, date, address)
	VALUES ($1, $2, $3, $4)`, [id_user, cpf, date, address]);
    return result.rows[0];
}

export async function update(id: number, data: UpdateCostumersInput): Promise<Costumers | null> {
    //validar existing
    const existing = await findById(id);
    if(!existing) return null;

    const merged = {...existing, ...data}; 

    const result = await pool.query(`UPDATE public.costumers
	SET id_user=$1 , cpf=$2, date=$3, address=$4
	WHERE id=$5 RETURNING*`, [merged.id_user, merged.cpf, merged.date, merged.address, id]); 

    return result.rows[0];
}


export async function remove(id: number): Promise<boolean> {
    const result = await pool.query(`DELETE FROM public.costumers WHERE id=$1`, [id]);
    console.log('result.rowCount:', result.rowCount);
    return true;
}