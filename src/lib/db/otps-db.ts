import { query } from './postgres';
import { UserRole } from '../types/user';

/**
 * Generates a 6-digit OTP code, upserts it in PostgreSQL with a 5-minute expiry, and returns the code.
 */
export async function createOTP(email: string, role: UserRole): Promise<string> {
  const emailLower = email.toLowerCase().trim();
  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // Expire in 5 minutes
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Upsert OTP record
  await query(
    `INSERT INTO otps (email, role, otp, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email, role)
     DO UPDATE SET otp = $3, expires_at = $4`,
    [emailLower, role, code, expiresAt]
  );

  return code;
}

/**
 * Verifies the OTP. If valid and not expired, deletes it and returns true. Otherwise false.
 */
export async function verifyOTP(email: string, role: UserRole, code: string): Promise<boolean> {
  const emailLower = email.toLowerCase().trim();
  
  // Find OTP record
  const res = await query(
    'SELECT otp, expires_at as "expiresAt" FROM otps WHERE email = $1 AND role = $2',
    [emailLower, role]
  );

  if (res.rows.length === 0) {
    return false;
  }

  const record = res.rows[0];
  const expiresAt = new Date(record.expiresAt).getTime();
  const now = Date.now();

  // Check if expired
  if (now > expiresAt) {
    // Delete expired OTP
    await query('DELETE FROM otps WHERE email = $1 AND role = $2', [emailLower, role]);
    return false;
  }

  // Check if matching code
  if (record.otp !== code) {
    return false;
  }

  // Successfully verified, delete the OTP to prevent reuse
  await query('DELETE FROM otps WHERE email = $1 AND role = $2', [emailLower, role]);
  return true;
}
