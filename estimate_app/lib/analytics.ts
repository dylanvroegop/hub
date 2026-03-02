export function track(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  const payload = { event, ...data };
  window.dispatchEvent(new CustomEvent('calvora:analytics', { detail: payload }));

  const withDataLayer = window as typeof window & { dataLayer?: unknown[] };
  if (Array.isArray(withDataLayer.dataLayer)) {
    withDataLayer.dataLayer.push(payload);
  }
}
