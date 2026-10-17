import type { ApiClient } from './client';
import { defaultApiClient } from './client';

export class BillingApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async getEncounterLedger(id: string): Promise<any> {
    return this.client.request(`/encounters/${id}/ledger`);
  }

  async getStatement(id: string): Promise<any> {
    return this.client.request(`/encounters/${id}/statement`);
  }

  async getInvoice(id: string): Promise<any> {
    return this.client.request(`/encounters/${id}/invoice`);
  }

  async addChargeItem(
    encounterId: string,
    item: any,
  ): Promise<{ success: boolean; item: any; encounter: any }> {
    return this.client.request(`/encounters/${encounterId}/charges`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async editChargeItem(
    chargeId: string,
    updates: any,
  ): Promise<{ success: boolean; item: any; encounter: any }> {
    return this.client.request(`/charges/${chargeId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteChargeItem(chargeId: string): Promise<{ success: boolean; deletedId: string; encounter: any }> {
    return this.client.request(`/charges/${chargeId}`, { method: 'DELETE' });
  }
}

export const billingApi = new BillingApi();
