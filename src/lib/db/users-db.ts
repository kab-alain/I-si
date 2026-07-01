import { query } from './postgres';
import { User, UserRole } from '../types/user';

/**
 * Creates a new user in the PostgreSQL database.
 */
export async function createUser(email: string, name: string, role: UserRole): Promise<User> {
  const emailLower = email.toLowerCase().trim();
  const res = await query(
    'INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING id, email, name, role, created_at as "createdAt"',
    [emailLower, name, role]
  );
  return res.rows[0];
}

/**
 * Finds a user by email and role.
 */
export async function getUserByEmailAndRole(email: string, role: UserRole): Promise<User | null> {
  const emailLower = email.toLowerCase().trim();
  const res = await query(
    'SELECT id, email, name, role, created_at as "createdAt" FROM users WHERE email = $1 AND role = $2',
    [emailLower, role]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0];
}

/**
 * Gets all registered users (for admin dashboard).
 */
export async function getAllUsers(): Promise<User[]> {
  const res = await query(
    'SELECT id, email, name, role, created_at as "createdAt" FROM users ORDER BY created_at DESC'
  );
  return res.rows;
}
