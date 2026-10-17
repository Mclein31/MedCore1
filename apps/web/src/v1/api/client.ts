import { ApiRequestError } from '../../lib/api';
import { bridge, clearBridgeCache } from './v2Bridge';
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
  permissions: string[];
}
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: { code: string; message: string; details?: unknown; timestamp: string };
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
/** Original UI transport, backed exclusively by v2 cookie sessions and CSRF-protected api(). */
export class ApiClient {
  private listeners = new Set<() => void>();
  onSessionExpired(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  getBaseUrl() {
    return '/api/v1';
  }
  setBaseUrl(_url: string) {
    /* v2 deliberately uses same-origin transport. */
  }
  setAuthToken(_token: string | null) {
    clearBridgeCache();
  }
  getAuthToken(): null {
    return null;
  }
  setDemoRole(_role: string | null) {
    /* Role comes only from the server session. */
  }
  getDemoRole(): null {
    return null;
  }
  async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      return (await bridge(endpoint, options)) as T;
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.status === 401 && endpoint !== '/auth/me') this.listeners.forEach((fn) => fn());
        throw new ApiError(error.message, error.status, error.code, error.fields);
      }
      throw error;
    }
  }
}
export const defaultApiClient = new ApiClient();
