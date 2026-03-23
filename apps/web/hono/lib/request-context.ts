import type { Context } from 'hono';

export function getRequestClientIp(c: Context): string | undefined {
  const forwarded = c.req.header('x-forwarded-for');
  const realIp = c.req.header('x-real-ip');
  const candidate = forwarded?.split(',')[0]?.trim() || realIp?.trim();

  if (!candidate) {
    return undefined;
  }

  return candidate.slice(0, 45);
}
