import { Context } from 'hono';

/**
 * Extracts and sanitizes the client IP address from proxy headers.
 * 
 * Supports Cloudflare (CF-Connecting-IP), Vercel/reverse-proxy chains (X-Forwarded-For),
 * and standard direct connections. Always ensures the resulting string strictly
 * fits within the PostgreSQL varchar(45) IPv4/IPv6 boundary to prevent constraint crashes.
 */
export function getClientIp(c: Context): string {
  // 1. Cloudflare Workers native connecting IP header (authoritative when deployed on Cloudflare)
  const cfConnectingIp = c.req.header('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim().slice(0, 45);
  }

  // 2. X-Forwarded-For may contain multiple comma-separated proxy hops (e.g. "client, proxy1, proxy2")
  const xForwardedFor = c.req.header('x-forwarded-for');
  if (xForwardedFor) {
    const clientIp = xForwardedFor.split(',')[0].trim();
    if (clientIp) {
      return clientIp.slice(0, 45);
    }
  }

  // 3. Fallback to X-Real-IP
  const realIp = c.req.header('x-real-ip');
  if (realIp) {
    return realIp.trim().slice(0, 45);
  }

  // 4. Default localhost loopback
  return '127.0.0.1';
}
