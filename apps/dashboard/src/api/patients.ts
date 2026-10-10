import { ApiClient, defaultApiClient } from './client';

export interface EncounterFilters {
  search?: string;
  status?: string;
  stage?: string;
  hmo?: string;
}

export class PatientsApi {
  constructor(private client: ApiClient = defaultApiClient) {}

  async releaseGatePass(id:string):Promise<{success:boolean;encounter:any}>{return this.client.request(`/encounters/${id}/gate-pass`,{method:'POST'});}

  async getPhysicians():Promise<{items:Array<{id:string;name:string}>}>{return this.client.request('/encounters/physicians');}

  async getEncounters(filters?: EncounterFilters): Promise<{ items: any[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.stage) params.set('stage', filters.stage);
    if (filters?.hmo) params.set('hmo', filters.hmo);

    const queryString = params.toString();
    const endpoint = queryString ? `/encounters?${queryString}` : '/encounters';
    return this.client.request(endpoint);
  }

  async getEncounter(id: string): Promise<any> {
    return this.client.request(`/encounters/${id}`);
  }

  async createEncounter(data: any): Promise<{ success: boolean; encounter: any }> {
    return this.client.request('/encounters', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async editEncounter(id: string, updates: any): Promise<{ success: boolean; encounter: any }> {
    return this.client.request(`/encounters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async deleteEncounter(id: string): Promise<{ success: boolean; deletedId: string }> {
    return this.client.request(`/encounters/${id}`, { method: 'DELETE' });
  }

  async finalizeBill(id: string): Promise<{success: boolean; encounter: any}> {
    return this.client.request(`/encounters/${id}/finalize-bill`, {method:'POST'});
  }
  async sendBill(id: string): Promise<{success: boolean; encounter: any}> {
    return this.client.request(`/encounters/${id}/send-bill`, {method:'POST'});
  }
  async recordBillViewed(id: string): Promise<{success: boolean; encounter?: any}> {
    return this.client.request(`/encounters/${id}/view-bill`, {method:'POST'});
  }

  async advanceStage(id: string): Promise<{ success: boolean; encounter: any }> {
    return this.client.request(`/encounters/${id}/advance-stage`, { method: 'POST' });
  }
}

export const patientsApi = new PatientsApi();
