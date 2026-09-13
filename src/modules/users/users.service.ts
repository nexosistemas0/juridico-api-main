import { error } from "console";
import { pool } from "../../config/database.js";
import {
  CreateUserInput,
  UpdateUserInput,
  User,
} from "../../types/user.types.js";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


export async function findAll(): Promise<User[]> {
  const result = await pool.query("SELECT * FROM users ORDER BY id");
  return result.rows;
}

export async function findById(id: number): Promise<User | null> {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function create(data: CreateUserInput): Promise<User> {
  const { name, email, phone, password } = data;
  
  const salt = await bcrypt.genSalt(10);
  const newPassword = await bcrypt.hash(password, salt);
  console.log(newPassword)
  const result = await pool.query(
    `INSERT INTO users (name, email, phone, type ,password)
     VALUES ($1, $2, $3, 'costumer', $4)
     RETURNING *`,
    [name, email, phone, newPassword]
  );
  return result.rows[0];
}

export async function update(
  id: number,
  data: UpdateUserInput,
): Promise<User | null> {
  const existing = await findById(id);
  if (!existing) return null;

  const merged = { ...existing, ...data };
  const result = await pool.query(
    `UPDATE users SET name = $1, email = $2, phone = $3, type = $4
     WHERE id = $5 RETURNING *`,
    [merged.name, merged.email, merged.phone, id],
  );
  return result.rows[0];
}

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

  const token = jwt.sign({id :pass.id}, "privateKy", { expiresIn: '1d'});
  console.log(token)

  const validatePassword = await bcrypt.compare(password, pass.password);
  console.log(validatePassword);
  if (validatePassword === false) return null;

  
  return token;
};
