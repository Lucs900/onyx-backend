export const ADVISOR_SEED_KEY = 'onyx-advisor-seed';

export function storeAdvisorSeed(message: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADVISOR_SEED_KEY, message);
}

export function consumeAdvisorSeed(): string | null {
  if (typeof window === 'undefined') return null;
  const value = sessionStorage.getItem(ADVISOR_SEED_KEY);
  if (value) sessionStorage.removeItem(ADVISOR_SEED_KEY);
  return value;
}

export function requestOpenAdvisorWidget() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('onyx:open-advisor'));
}
