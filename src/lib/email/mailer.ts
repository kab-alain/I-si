/**
 * Email Service using Nodemailer
 *
 * Sends weather alert notifications via email
 */

import nodemailer from 'nodemailer';
import type { WeatherAlertEmail, NotificationPreferences } from '@/lib/types/notifications';

function getAlertKindsString(preferences?: NotificationPreferences): string {
  if (!preferences || !preferences.eventTypes) return 'All Alerts';
  const kinds: string[] = [];
  const events = preferences.eventTypes;
  if (events.heatWave) kinds.push('Heat Waves');
  if (events.coldWave) kinds.push('Cold Waves');
  if (events.drought) kinds.push('Droughts');
  if (events.flood) kinds.push('Floods');
  if (events.storm) kinds.push('Storms');
  if (events.heavyRain) kinds.push('Heavy Rain');

  if (kinds.length === 0) return 'None';
  if (kinds.length === 6) return 'All Weather Alerts';
  return kinds.join(', ');
}

function getSeverityLabel(severity?: string): string {
  if (!severity) return 'Moderate';
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

function getFrequencyLabel(frequency?: string): string {
  if (!frequency) return 'Immediate';
  switch (frequency) {
    case 'immediate': return 'Immediate Alerts';
    case 'daily': return 'Daily Digest';
    case 'weekly': return 'Weekly Digest';
    default: return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  }
}

// Email configuration from environment variables
const EMAIL_USER = process.env.EMAIL_USER; // Your Gmail address
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD; // Google App-specific password
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Rwanda Climate Risk Platform';

// Create transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    if (!EMAIL_USER || !EMAIL_APP_PASSWORD) {
      throw new Error('Email configuration missing. Set EMAIL_USER and EMAIL_APP_PASSWORD environment variables.');
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_APP_PASSWORD,
      },
    });

    console.log('[Email] Transporter initialized');
  }

  return transporter;
}

/**
 * Send a weather alert email
 */
export async function sendWeatherAlertEmail(
  emailData: WeatherAlertEmail
): Promise<boolean> {
  try {
    const transport = getTransporter();

    const info = await transport.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    });

    console.log('[Email] Weather alert sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send weather alert:', error);
    return false;
  }
}

/**
 * Send a verification email
 */
export async function sendVerificationEmail(
  email: string,
  verificationLink: string,
  location?: string,
  preferences?: NotificationPreferences
): Promise<boolean> {
  try {
    const transport = getTransporter();

    const alertKinds = getAlertKindsString(preferences);
    const minSeverity = getSeverityLabel(preferences?.minSeverity);
    const frequency = getFrequencyLabel(preferences?.frequency);
    const locationStr = location || 'Selected Location';

    const subscriptionDetailsHtml = preferences ? `
      <div style="background: white; padding: 20px; border-radius: 5px; border: 1px solid #e2e8f0; border-left: 4px solid #667eea; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #667eea; font-size: 16px;">Subscription Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #666; width: 140px; font-weight: bold;">Location:</td>
            <td style="padding: 4px 0; color: #333;">${locationStr}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #666; font-weight: bold;">Alert Types:</td>
            <td style="padding: 4px 0; color: #333;">${alertKinds}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #666; font-weight: bold;">Min Severity:</td>
            <td style="padding: 4px 0; color: #333;">${minSeverity} and above</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #666; font-weight: bold;">Frequency:</td>
            <td style="padding: 4px 0; color: #333;">${frequency}</td>
          </tr>
        </table>
      </div>
    ` : '';

    const subscriptionDetailsText = preferences ? `
Subscription Details:
- Location: ${locationStr}
- Alert Types: ${alertKinds}
- Min Severity: ${minSeverity} and above
- Frequency: ${frequency}
` : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Rwanda Climate Risk Platform</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Weather Alert Notifications</p>
          </div>

          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>

            <p>Thank you for subscribing to weather alerts! To complete your subscription, please verify your email address by clicking the button below:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email</a>
            </div>

            ${subscriptionDetailsHtml}

            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #667eea; font-size: 14px; word-break: break-all;">${verificationLink}</p>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">If you didn't request this, you can safely ignore this email.</p>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Rwanda Climate Risk Platform. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
      Rwanda Climate Risk Platform - Verify Your Email

      Thank you for subscribing to weather alerts!
      ${subscriptionDetailsText}
      To complete your subscription, please verify your email address by visiting this link:
      ${verificationLink}

      If you didn't request this, you can safely ignore this email.

      © ${new Date().getFullYear()} Rwanda Climate Risk Platform. All rights reserved.
    `;

    const info = await transport.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - Rwanda Climate Risk Platform',
      text,
      html,
    });

    console.log('[Email] Verification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send verification email:', error);
    return false;
  }
}

/**
 * Send a welcome email after verification
 */
export async function sendWelcomeEmail(
  email: string,
  location: string,
  preferences?: NotificationPreferences
): Promise<boolean> {
  try {
    const transport = getTransporter();

    const alertKinds = getAlertKindsString(preferences);
    const minSeverity = getSeverityLabel(preferences?.minSeverity);
    const frequency = getFrequencyLabel(preferences?.frequency);

    const subscriptionDetailsHtml = preferences ? `
      <div style="background: white; padding: 20px; border-radius: 5px; border: 1px solid #e2e8f0; border-left: 4px solid #667eea; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #667eea; font-size: 16px;">Your Subscription Settings</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #666; width: 140px; font-weight: bold;">Location:</td>
            <td style="padding: 4px 0; color: #333;">${location}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #666; font-weight: bold;">Alert Types:</td>
            <td style="padding: 4px 0; color: #333;">${alertKinds}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #666; font-weight: bold;">Min Severity:</td>
            <td style="padding: 4px 0; color: #333;">${minSeverity} and above</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #666; font-weight: bold;">Frequency:</td>
            <td style="padding: 4px 0; color: #333;">${frequency}</td>
          </tr>
        </table>
      </div>
    ` : '';

    const subscriptionDetailsText = preferences ? `
Your Subscription Settings:
- Location: ${location}
- Alert Types: ${alertKinds}
- Min Severity: ${minSeverity} and above
- Frequency: ${frequency}
` : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Weather Alerts</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome!</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">You're all set for weather alerts</p>
          </div>

          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">Email Verified Successfully!</h2>

            <p>Great news! Your email has been verified and you're now subscribed to weather alerts for <strong>${location}</strong>.</p>

            ${subscriptionDetailsHtml}

            <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #10b981; font-size: 16px;">What to Expect</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Timely alerts for extreme weather events</li>
                <li>Heat waves, floods, droughts, and storms</li>
                <li>Actionable recommendations</li>
                <li>Real-time weather data from Open-Meteo</li>
              </ul>
            </div>

            <p>You can manage your notification preferences or unsubscribe at any time from the links in our alert emails.</p>

            <p style="margin-top: 30px;">Stay safe and informed!</p>
            <p><strong>- Rwanda Climate Risk Platform Team</strong></p>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Rwanda Climate Risk Platform. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to Rwanda Climate Risk Platform!

      Email Verified Successfully!

      Great news! Your email has been verified and you're now subscribed to weather alerts for ${location}.
      ${subscriptionDetailsText}
      What to Expect:
      - Timely alerts for extreme weather events
      - Heat waves, floods, droughts, and storms
      - Actionable recommendations
      - Real-time weather data from Open-Meteo

      You can manage your notification preferences or unsubscribe at any time from the links in our alert emails.

      Stay safe and informed!
      - Rwanda Climate Risk Platform Team

      © ${new Date().getFullYear()} Rwanda Climate Risk Platform. All rights reserved.
    `;

    const info = await transport.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Weather Alerts! 🎉',
      text,
      html,
    });

    console.log('[Email] Welcome email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send welcome email:', error);
    return false;
  }
}

/**
 * Send an OTP code email for login
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  role: string
): Promise<boolean> {
  const displayRole = role === 'analyst' ? 'Analyst' : 'Public User';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login OTP Code</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Rwanda Climate Risk Platform</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Secure Role-Based Authentication</p>
        </div>

        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #333; margin-top: 0;">Your Verification Code</h2>
          <p>You requested a one-time verification code to log in as an <strong>${displayRole}</strong>.</p>
          <p>Please enter the following 6-digit OTP code in the application to complete your login:</p>

          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #e0f2fe; border: 2px dashed #0284c7; color: #0369a1; padding: 15px 30px; display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">
              ${otp}
            </div>
          </div>

          <p style="color: #ef4444; font-size: 14px; font-weight: 500;">Note: This code is only valid for 5 minutes and can only be used once.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">If you did not initiate this login request, please ignore this email.</p>
        </div>

        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Rwanda Climate Risk Platform. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
    Rwanda Climate Risk Platform - Login OTP Code
    
    You requested a one-time verification code to log in as an ${displayRole}.
    
    Your verification code is: ${otp}
    
    This code is only valid for 5 minutes and can only be used once.
    
    If you did not initiate this request, you can safely ignore this email.
    
    © ${new Date().getFullYear()} Rwanda Climate Risk Platform. All rights reserved.
  `;

  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`,
      to: email,
      subject: `${otp} is your verification code for Rwanda Climate Risk Platform`,
      text,
      html,
    });

    console.log('[Email] OTP sent to:', email, 'MessageID:', info.messageId);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send OTP email:', error);
    console.log('\n=========================================');
    console.log(`[MOCK EMAIL SERVICE] (Set EMAIL_USER & EMAIL_APP_PASSWORD in .env.local for real emails)`);
    console.log(`To: ${email}`);
    console.log(`Role: ${displayRole}`);
    console.log(`Verification Code (OTP): ${otp}`);
    console.log('=========================================\n');
    return true;
  }
}

/**
 * Send early warning risk alert email (optional — only when nodemailer is configured)
 */
export async function sendRiskAlertEmail(
  email: string,
  alert: {
    type: string;
    severity: string;
    score: number;
    message: string;
    location: { lat: number; lon: number; label?: string };
  }
): Promise<boolean> {
  if (!EMAIL_USER || !EMAIL_APP_PASSWORD) {
    console.log(`[Email] Risk alert (mock): ${alert.type} ${alert.score}% → ${email}`);
    return false;
  }

  try {
    const transport = getTransporter();
    const locationStr =
      alert.location.label ??
      `${alert.location.lat.toFixed(4)}, ${alert.location.lon.toFixed(4)}`;

    await transport.sendMail({
      from: `"${EMAIL_FROM_NAME}" <${EMAIL_USER}>`,
      to: email,
      subject: `[${alert.severity.toUpperCase()}] ${alert.type} Risk Alert — ${alert.score}%`,
      text: `${alert.message}\n\nLocation: ${locationStr}\nScore: ${alert.score}%`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${alert.severity === 'critical' ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Early Warning: ${alert.type} Risk</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p>${alert.message}</p>
            <p><strong>Location:</strong> ${locationStr}</p>
            <p><strong>Risk Score:</strong> ${alert.score}%</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('[Email] Failed to send risk alert:', error);
    return false;
  }
}

/**
 * Verify transporter configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log('[Email] Configuration verified successfully');
    return true;
  } catch (error) {
    console.error('[Email] Configuration verification failed:', error);
    return false;
  }
}
