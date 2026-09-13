import {pool} from "../../config/database.js";
import {findById} from "../process/process.service.js";;
import * as types from "../../types/movements.types.js";
import { replicationStart } from "pg-protocol/dist/messages";

export async function getAll(): Promise<types.Movements[]> {
    const movements = await pool.query(`SELECT * FROM PUBLIC.movements`);
    return movements.rows;
};

export async function getById(id:number): Promise<types.Movements>{
    const movement = await pool.query(`SELECT * FROM PUBLIC.movements where id = $1`,[id]);
    return movement.rows[0];
};

export async function create(movement: types.CreateMovements): Promise<types.Movements | null>{
    const existingProcess = await findById(movement.id_process);
    
    if (!existingProcess) {
    throw new Error("Processo não encontrado");
  }

    const queryMovement = await pool.query(`insert into public.movements 
        (id_process, date, title, description) 
        values ($1, now(), $2, $3)`,[movement.id_process, movement.title, movement.description]
    );
    return queryMovement.rows[0];   
}