import { ApiClient, defaultApiClient, ApiUser, ApiResponse, ApiError } from './client';
import { authApi, AuthApi, LoginCredentials, LoginResponse } from './auth';
import { patientsApi, PatientsApi, EncounterFilters } from './patients';
import { billingApi, BillingApi } from './billing';
import { coverageApi, CoverageApi } from './coverage';
import { paymentsApi, PaymentsApi, PaymentPayload, PromissoryPayload } from './payments';
import { disputesApi, DisputesApi, FileDisputePayload } from './disputes';
import { claimsApi, ClaimsApi } from './claims';
import { analyticsApi, AnalyticsApi } from './analytics';
import { checkBackendHealth } from './config';

export * from './config';
export * from './client';
export * from './auth';
export * from './patients';
export * from './billing';
export * from './coverage';
export * from './payments';
export * from './disputes';
export * from './claims';
export * from './analytics';

/**
 * Unified MedCore API Facade
 * Provides single-point access to domain-partitioned API services
 * while keeping legacy method signatures for existing context consumers.
 */
class UnifiedMedCoreApiClient {
  constructor(
    public readonly client: ApiClient = defaultApiClient,
    public readonly auth: AuthApi = authApi,
    public readonly patients: PatientsApi = patientsApi,
    public readonly billing: BillingApi = billingApi,
    public readonly coverage: CoverageApi = coverageApi,
    public readonly payments: PaymentsApi = paymentsApi,
    public readonly disputes: DisputesApi = disputesApi,
    public readonly claims: ClaimsApi = claimsApi,
    public readonly analytics: AnalyticsApi = analyticsApi
  ) {}

  // Transport Configuration
  public setDemoRole(role: string | null) {
    this.client.setDemoRole(role);
  }

  public getDemoRole(): string | null {
    return this.client.getDemoRole();
  }

  public setAuthToken(token: string | null) {
    this.client.setAuthToken(token);
  }

  public getAuthToken(): string | null {
    return this.client.getAuthToken();
  }

  public setBaseUrl(url: string) {
    this.client.setBaseUrl(url);
  }

  public getBaseUrl(): string {
    return this.client.getBaseUrl();
  }

  // Auth & RBAC
  public login(credentials: LoginCredentials) {
    return this.auth.login(credentials);
  }

  public logout() {
    return this.auth.logout();
  }

  public getMe() {
    return this.auth.getMe();
  }

  public switchRole(role: string) {
    return this.auth.switchRole(role);
  }

  // Encounters / Patients
  public getEncounters(filters?: EncounterFilters) {
    return this.patients.getEncounters(filters);
  }

  public getEncounter(id: string) {
    return this.patients.getEncounter(id);
  }

  public advanceStage(id: string) {
    return this.patients.advanceStage(id);
  }

  public createEncounter(data: any) {
    return this.patients.createEncounter(data);
  }

  public editEncounter(id: string, updates: any) {
    return this.patients.editEncounter(id, updates);
  }

  public deleteEncounter(id: string) {
    return this.patients.deleteEncounter(id);
  }

  // Billing & Charges
  public getEncounterLedger(id: string) {
    return this.billing.getEncounterLedger(id);
  }

  public getStatement(id: string) {
    return this.billing.getStatement(id);
  }

  public getInvoice(id: string) {
    return this.billing.getInvoice(id);
  }

  public addChargeItem(encounterId: string, item: any) {
    return this.billing.addChargeItem(encounterId, item);
  }

  public editChargeItem(chargeId: string, updates: any) {
    return this.billing.editChargeItem(chargeId, updates);
  }

  public deleteChargeItem(chargeId: string) {
    return this.billing.deleteChargeItem(chargeId);
  }

  // Clinical & Payer Coverage
  public doctorQuickSign(id: string, agreedFee: number) {
    return this.coverage.doctorQuickSign(id, agreedFee);
  }

  public applyAccreditedCeiling(id: string) {
    return this.coverage.applyAccreditedCeiling(id);
  }

  public clearPharmacyRts(id: string) {
    return this.coverage.clearPharmacyRts(id);
  }

  public approveHmoFinalLoa(
    id: string,
    payload: { approvalCode?: string; approvedAmount?: number; disallowedConsumables?: number } = {}
  ) {
    return this.coverage.approveHmoFinalLoa(id, payload);
  }

  // Disputes & Supervisory Waivers
  public fileDispute(encounterId: string, payload: FileDisputePayload) {
    return this.disputes.fileDispute(encounterId, payload);
  }

  public waiveDispute(disputeId: string, supervisorNotes: string) {
    return this.disputes.waiveDispute(disputeId, supervisorNotes);
  }

  // Payments & Receipts
  public processPayment(
    encounterId: string,
    payload: PaymentPayload,
    idempotencyKey?: string
  ) {
    return this.payments.processPayment(encounterId, payload, idempotencyKey);
  }

  public executePromissoryNote(
    encounterId: string,
    payload: PromissoryPayload
  ) {
    return this.payments.executePromissoryNote(encounterId, payload);
  }

  public verifyExitPass(passNumber: string, exitPin: string) {
    return this.payments.verifyExitPass(passNumber, exitPin);
  }

  // Claims
  public getPhilhealthEsoaXml(claimId: string) {
    return this.claims.getPhilhealthEsoaXml(claimId);
  }

  // Analytics & Inventory
  public getBeds() {
    return this.analytics.getBeds();
  }

  public updateBedStatus(
    bedId: string,
    status: 'AVAILABLE' | 'OCCUPIED' | 'HOUSEKEEPING' | 'MAINTENANCE' | 'ADMINISTRATIVE_HOLD'
  ) {
    return this.analytics.updateBedStatus(bedId, status);
  }

  public getRcmMetrics() {
    return this.analytics.getRcmMetrics();
  }

  public checkHealth() {
    return checkBackendHealth();
  }
}

export const apiClient = new UnifiedMedCoreApiClient();
export const AqromedApiClient = UnifiedMedCoreApiClient;
