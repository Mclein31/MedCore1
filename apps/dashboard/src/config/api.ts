/**
 * MedCore Frontend API Configuration
 * 
 * Centralized, environment-driven configuration for the MedCore Dashboard.
 * Resolves the backend API endpoint dynamically from Vite environment variables
 * with support for both Cloudflare Workers remote deployment and local development proxy.
 * 
 * Supported Environment Variables:
 * - VITE_API_BASE_URL: e.g. "https://medcore-backend.mcleinonza0531.workers.dev" (Primary)
 * - VITE_API_URL: e.g. "https://medcore-backend.mcleinonza0531.workers.dev" (Legacy compatibility)
 */

interface ResolvedApiConfig {
  /** The normalized root URL (e.g. "https://medcore-backend...workers.dev" or "") */
  readonly rootUrl: string;
  /** The normalized v1 API base URL (e.g. "https://medcore-backend...workers.dev/api/v1" or "/api/v1") */
  readonly baseUrl: string;
  /** The full health check URL (e.g. "https://medcore-backend...workers.dev/api/health" or "/api/health") */
  readonly healthUrl: string;
  /** Whether an explicit remote URL was provided */
  readonly isRemote: boolean;
  /** Environment mode */
  readonly isProduction: boolean;
}

function resolveConfig(): ResolvedApiConfig {
  let raw = '';
  
  try {
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any)?.env : undefined;
    if (metaEnv) {
      raw = (metaEnv.VITE_API_BASE_URL || metaEnv.VITE_API_URL || '').trim();
    }
  } catch {
    raw = '';
  }

  // Remove trailing slashes
  raw = raw.replace(/\/+$/, '');

  let isProduction = false;
  try {
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any)?.env : undefined;
    isProduction = metaEnv?.PROD === true || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
  } catch {
    isProduction = false;
  }

  // In web dashboard environments (Vercel production and Vite development),
  // default to relative '/api/v1' so requests are same-origin and proxied
  // seamlessly through vercel.json (or vite.config.ts), avoiding cross-origin
  // third-party cookie blocks, CORS preflight latency, and domain mismatches.
  // Explicit VITE_API_BASE_URL is respected when provided (e.g. for native mobile apps).
  const effectiveRaw = raw;

  let rootUrl = '';
  let baseUrl = '/api/v1';

  if (effectiveRaw) {
    // If user provided a path ending in /api/v1
    if (effectiveRaw.endsWith('/api/v1')) {
      rootUrl = effectiveRaw.slice(0, -'/api/v1'.length);
      baseUrl = effectiveRaw;
    } else if (effectiveRaw.endsWith('/api')) {
      rootUrl = effectiveRaw.slice(0, -'/api'.length);
      baseUrl = `${effectiveRaw}/v1`;
    } else {
      rootUrl = effectiveRaw;
      baseUrl = `${effectiveRaw}/api/v1`;
    }
  }

  return {
    rootUrl,
    baseUrl,
    healthUrl: rootUrl ? `${rootUrl}/api/health` : '/api/health',
    isRemote: Boolean(rootUrl),
    isProduction
  };
}

export const API_CONFIG = resolveConfig();

/**
 * Returns the normalized base URL for API v1 endpoints
 * (e.g. "https://medcore-backend.mcleinonza0531.workers.dev/api/v1" or "/api/v1")
 */
export function getApiBaseUrl(): string {
  return API_CONFIG.baseUrl;
}

/**
 * Returns the root origin URL for backend services
 * (e.g. "https://medcore-backend.mcleinonza0531.workers.dev" or "")
 */
export function getApiRootUrl(): string {
  return API_CONFIG.rootUrl;
}

/**
 * Returns the endpoint for the backend health check
 */
export function getHealthCheckUrl(): string {
  return API_CONFIG.healthUrl;
}

/**
 * Executes a live health check ping against the MedCore backend
 */
export async function checkBackendHealth(): Promise<{
  online: boolean;
  latencyMs: number;
  data?: any;
  error?: string;
}> {
  const start = Date.now();
  try {
    const res = await fetch(getHealthCheckUrl(), {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return {
        online: false,
        latencyMs,
        error: `HTTP ${res.status}: ${res.statusText}`
      };
    }

    const data = await res.json();
    return {
      online: data.status === 'ONLINE',
      latencyMs,
      data
    };
  } catch (err: any) {
    return {
      online: false,
      latencyMs: Date.now() - start,
      error: err.message || 'Network connection failed'
    };
  }
}
