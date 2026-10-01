/**
 * AQROMED Enterprise API Client
 * Authoritative connection to PostgreSQL 16+ & Cloudflare Workers backend
 * Supports session cookies, zero-centavo drift payloads, and optimistic reconciliation
 */

const API_BASE = '/api/v1';

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

class AqromedApiClient {
  private activeDemoRole: string | null = null;

  public setDemoRole(role: string | null) {
    this.activeDemoRole = role;
  }

  public getDemoRole(): string | null {
    return this.activeDemoRole;
  }

  private isProduction(): boolean {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
      return true;
    }
    try {
      return (import.meta as any)?.env?.PROD === true;
    } catch {
      return false;
    }
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
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
      credentials: 'include' // Transmit aqromed_session HTTP-Only cookie
    };

    const res = await fetch(url, config);

    // Handle XML streaming
    if (res.headers.get('content-type')?.includes('application/xml')) {
      const text = await res.text();
      if (!res.ok) throw new Error(text || 'XML fetch failed');
      return text as unknown as T;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.error?.message || `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      (err as any).status = res.status;
      (err as any).errorData = data?.error;
      throw err;
    }

    return data as T;
  }

  // --- 1. AUTHENTICATION & RBAC ---
  async login(credentials: { email: string; password?: string; facilityCode?: string }): Promise<{ user: ApiUser }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password || 'HospitalRCM2026!',
        facilityCode: credentials.facilityCode || 'SJMC-MNL'
      })
    });
  }

  async logout(): Promise<{ success: boolean }> {
    this.setDemoRole(null);
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getMe(): Promise<{ user: ApiUser }> {
    return this.request('/auth/me');
  }

  async switchRole(role: string): Promise<{ success: boolean; user: ApiUser }> {
    this.setDemoRole(role);
    return this.request('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role, targetRole: role })
    });
  }

  // --- 2. ENCOUNTERS & WORKSTATION ---
  async getEncounters(): Promise<{ items: any[]; total: number }> {
    return this.request('/encounters');
  }

  async getEncounter(id: string): Promise<any> {
    return this.request(`/encounters/${id}`);
  }

  async getEncounterLedger(id: string): Promise<any> {
    return this.request(`/encounters/${id}/ledger`);
  }

  async getStatement(id: string): Promise<any> {
    return this.request(`/encounters/${id}/statement`);
  }

  async getInvoice(id: string): Promise<any> {
    return this.request(`/encounters/${id}/invoice`);
  }

  async advanceStage(id: string): Promise<{ success: boolean; encounter: any }> {
    return this.request(`/encounters/${id}/advance-stage`, { method: 'POST' });
  }

  async createEncounter(data: any): Promise<{ success: boolean; encounter: any }> {
    return this.request('/encounters', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async editEncounter(id: string, updates: any): Promise<{ success: boolean; encounter: any }> {
    return this.request(`/encounters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async deleteEncounter(id: string): Promise<{ success: boolean; deletedId: string }> {
    return this.request(`/encounters/${id}`, { method: 'DELETE' });
  }

  // --- CHARGEMASTER LINE ITEMS CRUD ---
  async addChargeItem(encounterId: string, item: any): Promise<{ success: boolean; item: any; encounter: any }> {
    return this.request(`/encounters/${encounterId}/charges`, {
      method: 'POST',
      body: JSON.stringify(item)
    });
  }

  async editChargeItem(chargeId: string, updates: any): Promise<{ success: boolean; item: any; encounter: any }> {
    return this.request(`/charges/${chargeId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async deleteChargeItem(chargeId: string): Promise<{ success: boolean; deletedId: string; encounter: any }> {
    return this.request(`/charges/${chargeId}`, { method: 'DELETE' });
  }

  // --- 3. CLINICAL & PAYER CLEARANCE ---
  async doctorQuickSign(id: string, agreedFee: number): Promise<{ success: boolean; encounter: any }> {
    return this.request(`/encounters/${id}/doctor/sign`, {
      method: 'POST',
      body: JSON.stringify({ agreedFee })
    });
  }

  async applyAccreditedCeiling(id: string): Promise<{ success: boolean; encounter: any }> {
    return this.request(`/encounters/${id}/doctor/accredited-ceiling`, {
      method: 'POST'
    });
  }

  async clearPharmacyRts(id: string): Promise<{ success: boolean; encounter: any }> {
    return this.request(`/encounters/${id}/pharmacy/clear-rts`, {
      method: 'POST'
    });
  }

  async approveHmoFinalLoa(
    id: string,
    payload: { approvalCode?: string; approvedAmount?: number; disallowedConsumables?: number } = {}
  ): Promise<{ success: boolean; encounter: any }> {
    return this.request(`/encounters/${id}/hmo/final-loa`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // --- 4. DISPUTES & SUPERVISORY WAIVERS ---
  async fileDispute(
    encounterId: string,
    payload: { chargeId: string; reason: string; disputeCategory?: string }
  ): Promise<{ success: boolean; dispute: any; encounter: any }> {
    return this.request(`/encounters/${encounterId}/disputes`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async waiveDispute(
    disputeId: string,
    supervisorNotes: string
  ): Promise<{ success: boolean; encounter: any }> {
    return this.request(`/disputes/${disputeId}/supervisory-waive`, {
      method: 'POST',
      body: JSON.stringify({ supervisorNotes })
    });
  }

  // --- 5. PAYMENTS & OFFICIAL RECEIPTS ---
  async processPayment(
    encounterId: string,
    payload: {
      amount: number;
      paymentRail: string;
      payerName?: string;
      payerContactMasked?: string;
      payerMobile?: string;
      referenceNumber?: string;
      cardLast4?: string;
      channelFee?: number;
      notes?: string;
    },
    idempotencyKey?: string
  ): Promise<{ success: boolean; cached?: boolean; payment: any; receipt: any; encounter: any }> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return this.request(`/encounters/${encounterId}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  }

  // --- 6. PROMISSORY NOTES (RA 9439 0% INTEREST) ---
  async executePromissoryNote(
    encounterId: string,
    payload: {
      borrowerName: string;
      borrowerRelationship?: string;
      borrowerIdType: string;
      borrowerIdNumber: string;
      installmentMonths: 3 | 6 | 12;
      principalAmount: number;
    }
  ): Promise<{ success: boolean; promissoryNote: any; dischargePass?: any; encounter: any }> {
    return this.request(`/encounters/${encounterId}/promissory-notes`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // --- 7. DISCHARGE PASSES & SECURITY LOBBY ---
  async verifyExitPass(passNumber: string, exitPin: string): Promise<any> {
    return this.request('/discharge/passes/verify', {
      method: 'POST',
      body: JSON.stringify({ passNumber, exitPin })
    });
  }

  // --- 8. PHILHEALTH eSOA STREAMING ---
  async getPhilhealthEsoaXml(claimId: string): Promise<string> {
    return this.request(`/claims/${claimId}/esoa-xml`);
  }

  // --- 9. BEDS & INVENTORY ---
  async getBeds(): Promise<{ summary: any; items: any[] }> {
    return this.request('/beds');
  }

  async updateBedStatus(
    bedId: string,
    status: 'AVAILABLE' | 'OCCUPIED' | 'HOUSEKEEPING' | 'MAINTENANCE' | 'ADMINISTRATIVE_HOLD'
  ): Promise<{ success: boolean; bed: any }> {
    return this.request(`/beds/${bedId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // --- 10. RCM ANALYTICS & EXECUTIVE SCORECARD ---
  async getRcmMetrics(): Promise<{ summary: any; waterfall: any }> {
    return this.request('/analytics/rcm-metrics');
  }
}

export const apiClient = new AqromedApiClient();
