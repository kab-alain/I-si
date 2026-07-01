/**
 * Lightweight role-based permissions.
 * Two primary roles: Admin (dashboard + alerts) and Public (maps + climate info).
 * Existing analyst role retains admin-level dashboard access for backward compatibility.
 */

import type { UserRole } from '@/lib/types/user';

export function isAdminRole(role: UserRole | string): boolean {
  return role === 'admin' || role === 'analyst';
}

export function isPublicRole(role: UserRole | string): boolean {
  return role === 'public_user';
}

export function canViewDashboard(role: UserRole | string): boolean {
  return isAdminRole(role);
}

export function canManageAlerts(role: UserRole | string): boolean {
  return role === 'admin';
}

export function canViewMap(role: UserRole | string): boolean {
  // All authenticated users can view maps
  return role === 'admin' || role === 'analyst' || role === 'public_user';
}

export function canViewClimateInfo(role: UserRole | string): boolean {
  return canViewMap(role);
}

export function getRoleLabel(role: UserRole | string): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'analyst':
      return 'Analyst';
    case 'public_user':
      return 'Public';
    default:
      return 'Unknown';
  }
}
