import { ApiClient, defaultApiClient, ApiUser } from './client';

export interface LoginCredentials {
  email: string;
  password: string;
  facilityCode?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user: ApiUser;
}

export class AuthApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    if (!credentials.password) {
      throw new Error('Password is required.');
    }

    const res = await this.client.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        facilityCode: credentials.facilityCode || 'SJMC-MNL'
      })
    });

    if (res.token) {
      this.client.setAuthToken(res.token);
    }

    return res;
  }

  async logout(): Promise<{ success: boolean; message?: string }> {
    try {
      return await this.client.request('/auth/logout', { method: 'POST' });
    } finally {
      this.client.setDemoRole(null);
      this.client.setAuthToken(null);
    }
  }

  async getMe(): Promise<{ authenticated: boolean; user: ApiUser }> {
    return this.client.request('/auth/me');
  }

  async switchRole(role: string): Promise<{ success: boolean; user: ApiUser }> {
    const result = await this.client.request<{ success: boolean; user: ApiUser }>('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role, targetRole: role })
    });
    if (result.success && result.user) this.client.setDemoRole(result.user.role);
    return result;
  }
}

export const authApi = new AuthApi();
