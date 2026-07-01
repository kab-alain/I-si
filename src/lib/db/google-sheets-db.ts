import type { EmailSubscription, NotificationPreferences } from '@/lib/types/notifications';
import { query } from './postgres';
import crypto from 'crypto';

const SCRIPT_URL = process.env.GOOGLE_SHEETS_SCRIPT_URL;

if (!SCRIPT_URL) {
  console.warn('[google-sheets-db] GOOGLE_SHEETS_SCRIPT_URL not configured. Falling back to PostgreSQL database.');
}

function mapRowToSubscription(row: any): EmailSubscription {
  return {
    id: row.id,
    email: row.email,
    coordinates: {
      lat: Number(row.lat),
      lon: Number(row.lon),
    },
    location: row.location || undefined,
    preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    lastNotified: row.last_notified ? new Date(row.last_notified).toISOString() : undefined,
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : undefined,
    unsubscribeToken: row.unsubscribe_token,
  };
}

async function callScript(action: string, method: 'GET' | 'POST' = 'GET', data?: any) {
  if (!SCRIPT_URL) {
    throw new Error('GOOGLE_SHEETS_SCRIPT_URL not configured');
  }

  let url = `${SCRIPT_URL}?action=${action}`;

  if (method === 'GET' && data) {
    Object.keys(data).forEach(key => {
      url += `&${key}=${encodeURIComponent(data[key])}`;
    });
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (method === 'POST' && data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.statusText}`);
  }

  return response.json();
}

export async function createSubscription(
  email: string,
  coordinates: { lat: number; lon: number },
  preferences: NotificationPreferences,
  location?: string
): Promise<EmailSubscription> {
  if (!SCRIPT_URL) {
    const id = crypto.randomBytes(16).toString('hex');
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');

    const existing = await query('SELECT * FROM subscriptions WHERE email = $1', [email]);
    if (existing.rows && existing.rows.length > 0) {
      throw new Error('Email already subscribed');
    }

    const res = await query(
      `INSERT INTO subscriptions 
       (id, email, lat, lon, location, preferences, is_active, created_at, unsubscribe_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        email,
        coordinates.lat,
        coordinates.lon,
        location || null,
        JSON.stringify(preferences),
        false,
        new Date().toISOString(),
        unsubscribeToken
      ]
    );

    return mapRowToSubscription(res.rows[0]);
  }

  return callScript('create', 'POST', {
    email,
    coordinates,
    preferences,
    location,
  });
}

export async function verifySubscription(id: string): Promise<EmailSubscription | null> {
  if (!SCRIPT_URL) {
    const res = await query(
      `UPDATE subscriptions 
       SET is_active = true, verified_at = $1
       WHERE id = $2
       RETURNING *`,
      [new Date().toISOString(), id]
    );
    if (!res.rows || res.rows.length === 0) return null;
    return mapRowToSubscription(res.rows[0]);
  }

  return callScript('verify', 'POST', { id });
}

export async function getSubscription(id: string): Promise<EmailSubscription | null> {
  if (!SCRIPT_URL) {
    const res = await query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    if (!res.rows || res.rows.length === 0) return null;
    return mapRowToSubscription(res.rows[0]);
  }

  return callScript('getById', 'GET', { id });
}

export async function getSubscriptionByEmail(email: string): Promise<EmailSubscription | null> {
  if (!SCRIPT_URL) {
    const res = await query('SELECT * FROM subscriptions WHERE email = $1', [email]);
    if (!res.rows || res.rows.length === 0) return null;
    return mapRowToSubscription(res.rows[0]);
  }

  return callScript('getByEmail', 'GET', { email });
}

export async function getActiveSubscriptions(): Promise<EmailSubscription[]> {
  if (!SCRIPT_URL) {
    const res = await query('SELECT * FROM subscriptions WHERE is_active = true');
    return (res.rows || []).map(mapRowToSubscription);
  }

  return callScript('getActive', 'GET');
}

export async function updateSubscriptionPreferences(
  id: string,
  preferences: Partial<NotificationPreferences>
): Promise<EmailSubscription | null> {
  if (!SCRIPT_URL) {
    const existing = await query('SELECT preferences FROM subscriptions WHERE id = $1', [id]);
    if (!existing.rows || existing.rows.length === 0) return null;
    
    const currentPrefs = typeof existing.rows[0].preferences === 'string' 
      ? JSON.parse(existing.rows[0].preferences) 
      : existing.rows[0].preferences;
      
    const newPrefs = {
      ...currentPrefs,
      ...preferences
    };

    const res = await query(
      `UPDATE subscriptions 
       SET preferences = $1
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(newPrefs), id]
    );
    return mapRowToSubscription(res.rows[0]);
  }

  return callScript('update', 'POST', { id, preferences });
}

export async function updateLastNotified(id: string): Promise<void> {
  if (!SCRIPT_URL) {
    await query(
      `UPDATE subscriptions 
       SET last_notified = $1
       WHERE id = $2`,
      [new Date().toISOString(), id]
    );
    return;
  }

  await callScript('updateLastNotified', 'POST', { id });
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!SCRIPT_URL) {
    const res = await query(
      `UPDATE subscriptions 
       SET is_active = false
       WHERE unsubscribe_token = $1
       RETURNING *`,
      [token]
    );
    return (res.rows && res.rows.length > 0);
  }

  const result = await callScript('unsubscribe', 'POST', { token });
  return result.success;
}

export async function deleteSubscription(id: string): Promise<boolean> {
  if (!SCRIPT_URL) {
    const res = await query('DELETE FROM subscriptions WHERE id = $1 RETURNING *', [id]);
    return (res.rows && res.rows.length > 0);
  }

  const result = await callScript('delete', 'POST', { id });
  return result.success;
}

export async function getSubscriptionsNeedingNotifications(): Promise<EmailSubscription[]> {
  if (!SCRIPT_URL) {
    const subscriptions = await getActiveSubscriptions();
    const now = Date.now();

    return subscriptions.filter((sub) => {
      if (sub.preferences.frequency === 'immediate') {
        return true;
      }

      if (sub.preferences.frequency === 'daily') {
        if (!sub.lastNotified) return true;
        const lastNotified = new Date(sub.lastNotified).getTime();
        return now - lastNotified >= 24 * 60 * 60 * 1000;
      }

      if (sub.preferences.frequency === 'weekly') {
        if (!sub.lastNotified) return true;
        const lastNotified = new Date(sub.lastNotified).getTime();
        return now - lastNotified >= 7 * 24 * 60 * 60 * 1000;
      }

      return false;
    });
  }

  return callScript('getNeedingNotifications', 'GET');
}

export async function getSubscriptionStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byFrequency: Record<string, number>;
}> {
  if (!SCRIPT_URL) {
    const res = await query('SELECT * FROM subscriptions');
    const subscriptions = (res.rows || []).map(mapRowToSubscription);

    const stats = {
      total: subscriptions.length,
      active: subscriptions.filter((sub) => sub.isActive).length,
      inactive: subscriptions.filter((sub) => !sub.isActive).length,
      byFrequency: {
        immediate: 0,
        daily: 0,
        weekly: 0,
      } as Record<string, number>,
    };

    subscriptions.forEach((sub) => {
      if (sub.isActive) {
        stats.byFrequency[sub.preferences.frequency] = (stats.byFrequency[sub.preferences.frequency] || 0) + 1;
      }
    });

    return stats;
  }

  return callScript('getStats', 'GET');
}
