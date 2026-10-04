import { ApiClient, defaultApiClient } from './client';

export class ClaimsApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async getPhilhealthEsoaXml(claimId: string): Promise<string> {
    return this.client.request(`/claims/${claimId}/esoa-xml`);
  }
}

export const claimsApi = new ClaimsApi();
