export const API_CONFIG = {
  isProduction: import.meta.env.PROD,
  baseUrl: '/api/v1',
  rootUrl: '',
  healthUrl: '/api/health',
};
export const getApiBaseUrl = () => '/api/v1';
export const getApiRootUrl = () => '';
export const getHealthCheckUrl = () => '/api/health';
export async function checkBackendHealth() {
  const start = Date.now();
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    return { online: r.ok, latencyMs: Date.now() - start, data: await r.json() };
  } catch {
    return { online: false, latencyMs: Date.now() - start, error: 'API unavailable' };
  }
}
