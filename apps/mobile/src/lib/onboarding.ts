export const ONBOARDING_KEY = 'medcore_onboarding_v1';
export type OnboardingProgress = { completed: boolean; step: number };
export interface OnboardingStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

// Store only introduction progress, never patient or session data.
export class OnboardingStore {
  constructor(private storage: OnboardingStorage) {}
  async restore(): Promise<OnboardingProgress> {
    const raw = await this.storage.getItem(ONBOARDING_KEY);
    if (!raw) return { completed: false, step: 0 };
    try {
      const value = JSON.parse(raw);
      if (
        typeof value.completed === 'boolean' &&
        Number.isInteger(value.step) &&
        value.step >= 0 &&
        value.step <= 2
      )
        return value;
    } catch {
      /* Invalid introduction preferences restart the introduction. */
    }
    return { completed: false, step: 0 };
  }
  async save(progress: OnboardingProgress): Promise<void> {
    await this.storage.setItem(ONBOARDING_KEY, JSON.stringify(progress));
  }
}

export function launchDestination(state: {
  sessionLoading: boolean;
  onboardingLoading: boolean;
  sessionError: string | null;
  user: { id: string } | null;
  onboardingError: string | null;
  completed: boolean;
  verifiedThisLaunch?: boolean;
}): 'preload' | 'session-recovery' | 'main' | 'onboarding-recovery' | 'onboarding' | 'auth' {
  if (state.sessionLoading || (state.onboardingLoading && !state.user && !state.verifiedThisLaunch))
    return 'preload';
  if (state.sessionError) return 'session-recovery';
  if (state.user) return 'main';
  if (state.onboardingError && !state.verifiedThisLaunch) return 'onboarding-recovery';
  return state.completed || state.verifiedThisLaunch ? 'auth' : 'onboarding';
}
