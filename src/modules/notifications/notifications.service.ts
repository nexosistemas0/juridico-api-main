import { pool } from "../../config/database.js";
import * as users from "../users/users.service.js";
import * as types from "../../types/notification.types.js";

export async function getAll(userId: number) {
  const result = await pool.query(
    "SELECT * FROM notifications WHERE id_user = $1 ORDER BY id DESC",
    [userId]
  );
  return result.rows;
}

export async function getById(id: number, userId: number) {
  const result = await pool.query(
    "SELECT * FROM notifications WHERE id = $1 AND id_user = $2",
    [id, userId]
  );
  return result.rows[0] || null;
}
export async function deleteById(id: number): Promise<void> {
  return await pool
    .query(`DELETE FROM PUBLIC.notifications where id = $1`, [id])
    .then((result) => result.rows[0]);
}

export async function create(
  notification: types.NotificationCreate,
): Promise<types.Notification> {

  const user = await users.findById(notification.id_user);
  if (!user) {
    throw Error(`User with id ${notification.id_user} not found`);
  }
  const notificationResult = await pool.query(
    "INSERT INTO notifications (id_user, title, decrip) VALUES ($1, $2) RETURNING *",
    [notification.id_user],
  );
  return notificationResult.rows[0];
};
