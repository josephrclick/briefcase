import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Global setup for all tests

// Mock window.matchMedia for dark mode functionality
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock chrome API if not already defined
if (typeof global.chrome === "undefined") {
  global.chrome = {
    runtime: {
      lastError: null,
    },
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      },
    },
    tabs: {
      query: vi.fn().mockResolvedValue([]),
      sendMessage: vi.fn(),
      onActivated: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  } as any;
}
