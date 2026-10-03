/**
 * MedCore Enterprise API HTTP Transport Client
 * Base transport for PostgreSQL 16+ & Hono backend
 * 
 * Supports:
 * - Configurable API base URL (VITE_API_URL for Vercel/mobile/remote deployment)
 * - Bearer token authorization header (for native mobile apps & cross-origin SPAs)
 * - Session cookies with credentials: 'include' (for same-origin / proxy)
 * - Development demo role simulation (X-Demo-Role)
 */
import { getApiBaseUrl, API_CONFIG } from '@/config/api';

export interface ApiUser {
  id: string;
  facilityId: string;
  facilityCode: string;
  facilityName: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  title: string;
  avatar: string;
  prcLicenseNumber: string | null;
  philhealthPan: string | null;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ApiClient {
  private customBaseUrl: string | null = null;
  private activeDemoRole: string | null = null;
  private authToken: string | null = null;

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.setBaseUrl(baseUrl);
    }

    // Restore cached auth token if available in browser
    if (typeof localStorage !== 'undefined') {
      try {
        this.authToken = localStorage.getItem('medcore_auth_token');
      } catch {}
    }
  }

  public getBaseUrl(): string {
    return this.customBaseUrl || getApiBaseUrl();
  }

  public setBaseUrl(url: string) {
    const trimmed = (url || '').trim().replace(/\/+$/, '');
    if (!trimmed) {
      this.customBaseUrl = null;
      return;
    }
    if (trimmed.endsWith('/api/v1')) {
      this.customBaseUrl = trimmed;
    } else if (trimmed.endsWith('/api')) {
      this.customBaseUrl = `${trimmed}/v1`;
    } else {
      this.customBaseUrl = `${trimmed}/api/v1`;
    }
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
    if (typeof localStorage !== 'undefined') {
      try {
        if (token) {
          localStorage.setItem('medcore_auth_token', token);
        } else {
          localStorage.removeItem('medcore_auth_token');
        }
      } catch {}
    }
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public setDemoRole(role: string | null) {
    this.activeDemoRole = role;
  }

  public getDemoRole(): string | null {
    return this.activeDemoRole;
  }

  private isProduction(): boolean {
    return API_CONFIG.isProduction;
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const base = this.getBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = new Headers(options.headers || {});
    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach Bearer token if present (for mobile clients or cross-origin requests)
    if (this.authToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.authToken}`);
    }

    // In development mode, transmit active demo role override if specified
    if (!this.isProduction() && this.activeDemoRole) {
      if (!headers.has('X-Demo-Role')) {
        headers.set('X-Demo-Role', this.activeDemoRole);
      }
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include' // Transmit session HTTP-Only cookie when available
    };

    let res: Response;
    try {
      res = await fetch(url, config);
    } catch (networkErr: any) {
      const isFailedToFetch =
        networkErr instanceof TypeError &&
        (networkErr.message === 'Failed to fetch' || networkErr.message.includes('fetch'));
      const diagnostic = isFailedToFetch
        ? `Browser could not reach API endpoint (${url}). Possible causes: CORS preflight rejection, network offline, or mixed-content blockage.`
        : (networkErr?.message || 'Network request failed');

      console.error('[MedCore API Transport Failure]', {
        endpoint: url,
        method: config.method || 'GET',
        errorType: networkErr?.name || 'Error',
        errorMessage: networkErr?.message || 'Failed to fetch',
        diagnostic
      });

      throw new ApiError(
        `Unable to reach MedCore API at ${url}. ${diagnostic}`,
        0,
        'NETWORK_CONNECTION_ERROR',
        { url, method: config.method || 'GET', originalError: networkErr?.message }
      );
    }

    // Handle XML streaming (e.g. PhilHealth eSOA claims)
    if (res.headers.get('content-type')?.includes('application/xml')) {
      const text = await res.text();
      if (!res.ok) throw new ApiError(text || 'XML fetch failed', res.status);
      return text as unknown as T;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.warn('[MedCore API Response Error]', {
        endpoint: url,
        status: res.status,
        statusText: res.statusText,
        errorCode: data?.error?.code,
        errorMessage: data?.error?.message
      });
      const errorMsg = data?.error?.message || `Request to ${url} failed with status ${res.status} (${res.statusText})`;
      throw new ApiError(errorMsg, res.status, data?.error?.code, data?.error?.details);
    }

    return data as T;
  }
}

export const defaultApiClient = new ApiClient();
