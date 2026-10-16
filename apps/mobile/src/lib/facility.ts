import { ENV } from '../config/env';

// Hospital facility name comes from the live backend health endpoint —
// never hard-coded. Cached for the app session.
let cached: string | null = null;
let inflight: Promise<string> | null = null;

async function fetchFacility(): Promise<string> {
  const res = await fetch(ENV.healthUrl, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`health ${res.status}`);
  const data = await res.json();
  const name = (data?.facility as string | undefined)?.trim();
  if (!name) throw new Error('no facility');
  return name;
}

export function getFacilityName(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetchFacility()
      .then((name) => {
        cached = name;
        return name;
      })
      .catch(() => 'Your hospital')
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
