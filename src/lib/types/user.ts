/**
 * Authentication and User Types
 */

export type UserRole = 'admin' | 'analyst' | 'public_user';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  organization?: string;
  approvalStatus?: ApprovalStatus;
}

export interface OTPRecord {
  email: string;
  role: UserRole;
  otp: string;
  expiresAt: Date;
}
