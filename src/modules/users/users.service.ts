
import { pool } from "../../config/database.js";
import {
  CreateUserInput,
  UpdateUserInput,
  User,
} from "../../types/user.types.js";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { EmailAlredyExist } from "../../errors/errors.js";

export async function findAll(): Promise<User[]> {
  const USER_COLUMNS = "id, name, email, phone, type";

  const result = await pool.query(`SELECT ${USER_COLUMNS} FROM users ORDER BY id`);
  return result.rows;
}

export async function findById(id: number): Promise<User | null> {
  const USER_COLUMNS = "id, name, email, phone, type";

  const result = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function create(data: CreateUserInput): Promise<User> {
  const { name, phone, password } = data;
  const email = data.email.trim().toLowerCase();

  const hash = await bcrypt.hash(password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, type, password)
       VALUES ($1, $2, $3, 'costomer', $4)
       RETURNING id, name, email, phone, type`,
      [name, email, phone, hash]
    );
    return result.rows[0];
  } catch (err: any) {
    if (err.code === '23505') throw new EmailAlredyExist();
    throw err;
  }
}

export async function update(
  id: number,
  data: UpdateUserInput,
): Promise<User | null> {
  const existing = await findById(id);
  if (!existing) return null;

  const USER_COLUMNS = "id, name, email, phone, type";
  const merged = { ...existing, ...data };
  const result = await pool.query(
    `UPDATE users SET name = $1, email = $2, phone = $3, type = $4
     WHERE id = $5 RETURNING ${USER_COLUMNS}`,
    [merged.name, merged.email, merged.phone, id],
  );
  return result.rows[0];
}
/////// arrumar
export async function remove(id: number): Promise<boolean> {
  const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

//// login
export async function Login(email: string, password: string): Promise<string | null> {
  const getPasswordDataBase = await pool.query(
    `select password, name, id from public.users where email = $1`,
    [email],
  );
  if(getPasswordDataBase.rows.length === 0){
    return null
  }
  const pass = getPasswordDataBase.rows[0];

  const token = jwt.sign({id :pass.id}, process.env.JWT_SECRET_KEY!, { expiresIn: '1d'});

  const validatePassword = await bcrypt.compare(password, pass.password);
  if (validatePassword === false) return null;

  return token;
};
