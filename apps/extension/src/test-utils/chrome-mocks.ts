// Chrome API mocks for testing
import { vi } from "vitest";

interface MockTab {
  id: number;
  index: number;
  windowId: number;
  highlighted: boolean;
  active: boolean;
  pinned: boolean;
  audible?: boolean;
  discarded?: boolean;
  autoDiscardable?: boolean;
  groupId?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  status?: string;
  incognito?: boolean;
  width?: number;
  height?: number;
  sessionId?: string;
  selected?: boolean;
  openerTabId?: number;
  pendingUrl?: string;
}

type StorageData = Record<string, any>;

export const createMockTab = (overrides: Partial<MockTab> = {}): MockTab =>
  ({
    ...{
      id: 1,
      index: 0,
      windowId: 1,
      highlighted: true,
      active: true,
      pinned: false,
      audible: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
      url: "https://example.com",
      title: "Example Page",
      favIconUrl: "https://example.com/favicon.ico",
      status: "complete",
      incognito: false,
      width: 1920,
      height: 1080,
      sessionId: "session123",
    },
    ...overrides,
  }) as MockTab;

export const setupChromeTabsMock = (tabs: MockTab[] = [createMockTab()]) => {
  (chrome.tabs.query as any).mockImplementation(
    (queryInfo: chrome.tabs.QueryInfo) => {
      if (queryInfo.active && queryInfo.currentWindow) {
        const activeTabs = tabs.filter((tab) => tab.active);
        return Promise.resolve(activeTabs.length > 0 ? activeTabs : []);
      }
      return Promise.resolve(tabs);
    },
  );
};

export const setupChromeStorageMock = (initialData: StorageData = {}) => {
  let storage: StorageData = { ...initialData };

  (chrome.storage.local.get as any).mockImplementation(
    (keys: string | string[] | StorageData | null | undefined) => {
      if (!keys) return Promise.resolve(storage);
      if (typeof keys === "string") {
        return Promise.resolve({ [keys]: storage[keys] });
      }
      if (Array.isArray(keys)) {
        const result: StorageData = {};
        keys.forEach((key: string) => {
          if (key in storage) result[key] = storage[key];
        });
        return Promise.resolve(result);
      }
      if (typeof keys === "object") {
        const result: StorageData = {};
        Object.keys(keys).forEach((key) => {
          result[key] = storage[key] ?? (keys as StorageData)[key];
        });
        return Promise.resolve(result);
      }
      return Promise.resolve({});
    },
  );

  (chrome.storage.local.set as any).mockImplementation((items: StorageData) => {
    storage = { ...storage, ...items };
    return Promise.resolve();
  });

  (chrome.storage.local.clear as any).mockImplementation(() => {
    storage = {};
    return Promise.resolve();
  });

  (chrome.storage.local.remove as any).mockImplementation(
    (keys: string | string[]) => {
      if (typeof keys === "string") {
        delete storage[keys];
      } else if (Array.isArray(keys)) {
        keys.forEach((key) => delete storage[key]);
      }
      return Promise.resolve();
    },
  );

  return {
    getStorage: () => storage,
    setStorage: (newStorage: StorageData) => {
      storage = newStorage;
    },
  };
};

export const setupAbortControllerMock = () => {
  if (typeof AbortController === "undefined") {
    global.AbortController = class AbortController {
      signal = {
        aborted: false,
        onabort: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      abort() {
        this.signal.aborted = true;
        if (this.signal.onabort) {
          (this.signal.onabort as any)();
        }
      }
    } as any;

    global.AbortSignal = class AbortSignal {
      aborted = false;
      onabort = null;
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      dispatchEvent = vi.fn();
    } as any;
  }
};
