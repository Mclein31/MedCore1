/**
 * MedCore API Client Compatibility Facade
 * Re-exports the unified API client and domain services from @/api
 * for seamless backwards compatibility across all application layers.
 */
export * from '@/api';
import { apiClient } from '@/api';
export { apiClient };
export default apiClient;
