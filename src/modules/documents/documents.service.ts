import {pool} from "../../config/database.js";
import {CreateDocument, Documents, UpdateDocument} from "../../types/documents.types.js";

export async function findAll(): Promise<Documents[]> {
    const result = await pool.query("SELECT * FROM documents");
    return result.rows;
}

export async function findById(id: number): Promise<Documents | null> {
    const result = await pool.query("SELECT * FROM documents WHERE id = $1", [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
}

export async function create(document: Omit<CreateDocument, "file">, file: Express.Multer.File): Promise<Documents> {
    const result = await pool.query(
            "INSERT INTO documents (id_process, name, file, status, date_sed, date_ass) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [document.id_process, document.name, file.buffer, document.status, document.date_sed, document.date_ass]
    );
    return result.rows[0]; 
}

export async function update(id: number, document: Omit<UpdateDocument, "file">, file?: Express.Multer.File): Promise<Documents | null> {
    const existing = await findById(id);
    if (!existing) {
        return null;
    }
    const merged = {
        ...existing,
        ...document,
    };
    const result = await pool.query(
        "UPDATE documents SET id_process = $1, name = $2, file = $3, status = $4, date_sed = $5, date_ass = $6 WHERE id = $7 RETURNING *",
        [merged.id_process, merged.name, file ? file.buffer : merged.file, merged.status, merged.date_sed, merged.date_ass, id]
    );
    return result.rows[0];
}


export async function remove(id: number): Promise<boolean> {
    const result = await pool.query("DELETE FROM documents WHERE id = $1", [id]);
    return result.rowCount > 0;
}