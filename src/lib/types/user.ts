/**
 * Authentication and User Types
 */

export type UserRole = 'admin' | 'analyst' | 'public_user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface OTPRecord {
  email: string;
  role: UserRole;
  otp: string;
  expiresAt: Date;
}
