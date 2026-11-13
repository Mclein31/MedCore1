import { defaultApiClient } from '@/v1/api';
import { useEffect, useState } from 'react';

/** Facts about the signed-in hospital that headings quote, read from the server instead of hard-coded. */
export interface FacilityFacts {
  name?: string;
  bedCount?: number;
  slaWarningMinutes?: number;
  slaBreachMinutes?: number;
}

const MAX_AGE_MS = 5 * 60_000;
let cache: { at: number; request: Promise<FacilityFacts> } | null = null;

async function load(): Promise<FacilityFacts> {
  const [facility, beds] = await Promise.all([
    defaultApiClient
      .request<{ facility?: { name?: string; slaWarningMinutes?: number; slaBreachMinutes?: number } }>(
        '/facility',
      )
      .catch(() => null),
    defaultApiClient.request<{ summary?: { total?: number } }>('/beds').catch(() => null),
  ]);
  return {
    name: facility?.facility?.name,
    slaWarningMinutes: facility?.facility?.slaWarningMinutes,
    slaBreachMinutes: facility?.facility?.slaBreachMinutes,
    bedCount: beds?.summary?.total,
  };
}

/** Forget cached facts, e.g. after the settings page saves new SLA thresholds. */
export function invalidateFacilityFacts() {
  cache = null;
}

export function useFacilityFacts(): FacilityFacts {
  const [facts, setFacts] = useState<FacilityFacts>({});
  useEffect(() => {
    let active = true;
    if (!cache || Date.now() - cache.at > MAX_AGE_MS) cache = { at: Date.now(), request: load() };
    void cache.request.then((value) => {
      if (active) setFacts(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return facts;
}
