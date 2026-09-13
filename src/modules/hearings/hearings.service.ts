import { Result } from "pg";
import { pool } from "../../config/database.js";
import * as types from "../../types/hearings.types.js";
import * as process from "../process/process.service.js";
import { REQUESTED_RANGE_NOT_SATISFIABLE } from "http-status-codes";
export async function findAll(): Promise<types.hearings[]> {
  const result = await pool.query("SELECT * FROM hearings");
  return result.rows;
}

export async function findById(id: number): Promise<types.hearings | null> {
  const result = await pool.query("SELECT * FROM hearings WHERE id = $1", [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
}

export async function create(
  hearing: types.CreateHearing,
): Promise<types.hearings> {
  const result = await pool.query(
    `   insert into public.hearings(
            id_process, 
            type,
            place, 
            room, 
            meeting_link, 
            guidelines) 
                VALUES ($1 ,$2 ,$3 ,$4 ,$5 ,$6)
                    RETURNING *
    `,
    [
      hearing.id_process,
      hearing.type,
      hearing.place,
      hearing.room,
      hearing.meeting_link,
      hearing.guidelines,
    ],
  );
  return result.rows[0];
}

export async function update(
  id: number,
  hearings: types.UpdateHearing,
): Promise<types.hearings | null> {

  const existing = await findById(id);
  if (!existing) {
    return null;
  }
  const merged = { ...existing, ...hearings };
  const updateHearings = await pool.query(
    `UPDATE public.hearings
	SET id_process=$1, type=$2, date=$3, hour=$4, place=$5, room=$6, meeting_link=$7, guidelines=$8
	WHERE id=$9 RETURNING *`,
    [
      merged.id_process,
      merged.type,
      merged.date,
      merged.hour,
      merged.place,
      merged.room,
      merged.meeting_link,
      merged.guidelines,
      id
    ],
  );

  return updateHearings.rows[0];
}

export async function remove(id: number): Promise<boolean>{
  const hearing = await pool.query(`DELETE FROM PUBLIC.hearings WHERE id = $1`, [id]);
    if(hearing.rows[0] !== 1){
      return false;
    }
  return true;
}

