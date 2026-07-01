import { query } from './postgres';
import { User, UserRole, ApprovalStatus } from '../types/user';

interface DbUserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  organization?: string;
  approvalStatus?: ApprovalStatus;
  password_hash?: string;
}

function mapUser(row: DbUserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt,
    organization: row.organization ?? undefined,
    approvalStatus: (row.approvalStatus as ApprovalStatus) ?? 'approved',
  };
}

const USER_SELECT =
  'id, email, name, role, organization, approval_status as "approvalStatus", created_at as "createdAt"';

/**
 * Creates a new user in the PostgreSQL database.
 */
export async function createUser(
  email: string,
  name: string,
  role: UserRole,
  passwordHash: string,
  options?: { organization?: string; approvalStatus?: ApprovalStatus }
): Promise<User> {
  const emailLower = email.toLowerCase().trim();
  const approvalStatus =
    options?.approvalStatus ?? (role === 'analyst' ? 'pending' : 'approved');

  const res = await query(
    `INSERT INTO users (email, name, role, password_hash, organization, approval_status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${USER_SELECT}`,
    [emailLower, name, role, passwordHash, options?.organization ?? null, approvalStatus]
  );
  return mapUser(res.rows[0]);
}

/**
 * Finds a user by email and role (includes password hash for auth).
 */
export async function getUserByEmailAndRole(
  email: string,
  role: UserRole,
  includePassword = false
): Promise<(User & { passwordHash?: string }) | null> {
  const emailLower = email.toLowerCase().trim();
  const fields = includePassword
    ? `${USER_SELECT}, password_hash as "passwordHash"`
    : USER_SELECT;

  const res = await query(
    `SELECT ${fields} FROM users WHERE email = $1 AND role = $2`,
    [emailLower, role]
  );
  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  const user = mapUser(row);
  if (includePassword) {
    return { ...user, passwordHash: row.passwordHash };
  }
  return user;
}

/**
 * Gets all registered users (for admin dashboard).
 */
export async function getAllUsers(): Promise<User[]> {
  const res = await query(
    `SELECT ${USER_SELECT} FROM users ORDER BY created_at DESC`
  );
  return res.rows.map(mapUser);
}

/**
 * Update analyst approval status (admin action).
 */
export async function updateUserApprovalStatus(
  userId: string,
  approvalStatus: ApprovalStatus
): Promise<User | null> {
  const res = await query(
    `UPDATE users SET approval_status = $1
     WHERE id = $2 AND role = 'analyst'
     RETURNING ${USER_SELECT}`,
    [approvalStatus, userId]
  );
  if (res.rows.length === 0) return null;
  return mapUser(res.rows[0]);
}
