import { vi } from 'vitest';

// jsdom has no matchMedia; next-themes and sonner call it when App mounts.
export function stubMatchMedia() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

// Pages replaced by stubs when a test renders the real App (keeps the route table real, the pages light).
export const pageStub = (label: string) => ({ default: () => <div>{`página: ${label}`}</div> });
