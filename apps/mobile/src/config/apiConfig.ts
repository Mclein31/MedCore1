export const HOSTED_API_ROOT = 'https://medcore-backend.mcleinonza0531.workers.dev';

export function resolveApiConfig(
  raw: string | undefined,
  development: boolean,
): { root: string; error: string | null } {
  const value = raw?.trim() || HOSTED_API_ROOT;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol))
      throw new Error('Invalid API address');
    if (
      !development &&
      (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    )
      return { root: '', error: 'The release app requires a secure HTTPS API address.' };
    const root = value.replace(/\/+$/, '').replace(/\/api(?:\/v1)?$/, '');
    return { root, error: null };
  } catch {
    return { root: '', error: 'The app’s API address is invalid. Please contact support.' };
  }
}
