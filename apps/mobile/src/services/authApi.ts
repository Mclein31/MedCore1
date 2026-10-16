import type { ApiClient } from '../lib/api';

export function createAuthApi(client: ApiClient) {
  return {
    me: () => client.get<{ authenticated: boolean; user: any }>('/auth/me'),
  };
}
