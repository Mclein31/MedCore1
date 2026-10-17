/**
 * MedCore API Client Compatibility Facade
 * Re-exports the unified API client and domain services from @/v1/api
 * for seamless backwards compatibility across all application layers.
 */
export * from '@/v1/api';
export { apiClient };
import { apiClient } from '@/v1/api';
export default apiClient;
