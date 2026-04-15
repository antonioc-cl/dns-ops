/**
 * Auth Routes - Signup & Login with passwords
 */

import { Hono } from 'hono';
import { hash, verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { getTenantUUID } from '@dns-ops/contracts';
import { users } from '@dns-ops/db/schema';
import type { Env } from '../types.js';

const authRoutes = new Hono<Env>();

// In-memory session store (use Redis in production)
const sessions = new Map<string, { userId: string; email: string; tenantId: string }>();

/**
 * Generate a secure session token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse cookies from header
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [key, ...vals] = part.trim().split('=');
    if (key) result[key] = vals.join('=');
  }
  return result;
}

/**
 * POST /api/auth/signup
 * Create a new user account
 */
authRoutes.post('/signup', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  const { email, password } = await c.req.json<{ email: string; password: string }>();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ error: 'Invalid email format' }, 400);
  }

  // Validate password strength
  if (password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400);
  }

  // Check if user already exists
  const existingUser = await db.getDrizzle().query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (existingUser) {
    return c.json({ error: 'An account with this email already exists' }, 409);
  }

  // Hash password
  const passwordHash = await hash(password, {
    memoryCost: 65536,
    timeCost: 3,
    outputLen: 32,
    parallelism: 4,
  });

  // Create user
  const tenantId = email.split('@')[1];
  const tenantUUID = await getTenantUUID(tenantId);

  await db.getDrizzle().insert(users).values({
    email: email.toLowerCase(),
    passwordHash,
    tenantId: tenantUUID,
    name: email.split('@')[0],
  });

  // Create session
  const token = generateToken();
  sessions.set(token, {
    userId: email.toLowerCase(),
    email: email.toLowerCase(),
    tenantId: tenantUUID,
  });

  // Set session cookie (7 days)
  c.header(
    'Set-Cookie',
    `dns_ops_session=${token}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; SameSite=Lax`
  );

  return c.json({ success: true, email, tenant: tenantId });
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
authRoutes.post('/login', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  const { email, password } = await c.req.json<{ email: string; password: string }>();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  // Find user
  const user = await db.getDrizzle().query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  // Verify password
  const validPassword = await verify(user.passwordHash, password);
  if (!validPassword) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  // Create session
  const token = generateToken();
  sessions.set(token, {
    userId: user.email,
    email: user.email,
    tenantId: user.tenantId,
  });

  // Set session cookie (7 days)
  c.header(
    'Set-Cookie',
    `dns_ops_session=${token}; Path=/; Max-Age=${7 * 24 * 60 * 60}; HttpOnly; SameSite=Lax`
  );

  return c.json({ success: true, email: user.email, tenant: email.split('@')[1] });
});

/**
 * POST /api/auth/logout
 */
authRoutes.post('/logout', async (c) => {
  const cookies = parseCookies(c.req.header('Cookie'));
  const token = cookies['dns_ops_session'];

  if (token) {
    sessions.delete(token);
  }

  c.header('Set-Cookie', 'dns_ops_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  return c.json({ success: true });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
authRoutes.get('/me', async (c) => {
  const cookies = parseCookies(c.req.header('Cookie'));
  const token = cookies['dns_ops_session'];

  if (!token || !sessions.has(token)) {
    return c.json({ authenticated: false }, 401);
  }

  const session = sessions.get(token)!;
  return c.json({
    authenticated: true,
    email: session.email,
    tenant: session.email.split('@')[1],
  });
});

export default authRoutes;
