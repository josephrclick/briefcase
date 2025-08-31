import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { SidePanel } from "./SidePanel";
import { SettingsService } from "../lib/settings-service";
import { OpenAIProvider } from "../lib/openai-provider";
import { DocumentRepository } from "../lib/document-repository";
import { MOCK_API_KEY } from "../src/test-utils/constants";
import {
  createMockTab,
  setupChromeTabsMock,
  setupChromeStorageMock,
  setupAbortControllerMock,
} from "../src/test-utils/chrome-mocks";

// Mock chrome API
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    onActivated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
} as any;

vi.mock("../lib/settings-service");
vi.mock("../lib/openai-provider");
vi.mock("../lib/document-repository");

describe("SidePanel Tab Change Detection", () => {
  let mockProvider: any;
  let mockDocumentRepository: any;
  let storageHelper: ReturnType<typeof setupChromeStorageMock>;
  let tabChangeCallback:
    | ((activeInfo: { tabId: number; windowId: number }) => void)
    | null = null;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup document repository mock
    mockDocumentRepository = {
      saveDocument: vi.fn().mockResolvedValue(undefined),
      getDocument: vi.fn(),
      getRecentDocuments: vi.fn().mockResolvedValue([]),
      deleteDocument: vi.fn(),
      clearAllDocuments: vi.fn(),
      getStorageUsage: vi.fn().mockResolvedValue(0),
    };
    (DocumentRepository as any).mockImplementation(
      () => mockDocumentRepository,
    );

    // Setup Chrome API mocks
    setupChromeTabsMock([
      createMockTab({
        id: 1,
        url: "https://example.com/article",
        title: "First Article",
      }),
    ]);
    storageHelper = setupChromeStorageMock();
    setupAbortControllerMock();

    // Capture tab change listener
    (chrome.tabs.onActivated.addListener as any).mockImplementation(
      (callback: any) => {
        tabChangeCallback = callback;
      },
    );
    (chrome.tabs.onActivated.removeListener as any).mockImplementation(() => {
      tabChangeCallback = null;
    });

    // Default mock settings
    const defaultSettings = {
      openaiApiKey: "",
      summarization: { length: "brief", style: "bullets" },
      privacyBannerDismissed: true,
    };

    (SettingsService.loadSettings as any).mockResolvedValue(defaultSettings);
    (SettingsService.saveSettings as any).mockResolvedValue(undefined);
    (SettingsService.saveSummarizationSettings as any).mockResolvedValue(
      undefined,
    );
    (SettingsService.validateApiKeyFormat as any).mockReturnValue(true);

    mockProvider = {
      summarize: vi.fn(),
      summarizeComplete: vi.fn(),
      validateApiKey: vi.fn().mockResolvedValue(true),
    };

    (SettingsService.getProvider as any).mockResolvedValue(null);
    (OpenAIProvider as any).mockImplementation(() => mockProvider);
  });

  afterEach(() => {
    vi.clearAllMocks();
    tabChangeCallback = null;
  });

  describe("Tab Change Listener Setup", () => {
    it("should register tab change listener on mount", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        expect(chrome.tabs.onActivated.addListener).toHaveBeenCalled();
      });

      expect(chrome.tabs.onActivated.addListener).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it("should unregister tab change listener on unmount", async () => {
      const { unmount } = render(<SidePanel />);

      await waitFor(() => {
        expect(chrome.tabs.onActivated.addListener).toHaveBeenCalled();
      });

      unmount();

      expect(chrome.tabs.onActivated.removeListener).toHaveBeenCalled();
    });
  });

  describe("Tab Change UI Updates", () => {
    it("should reset to idle state when tab changes", async () => {
      const user = userEvent.setup();

      // Start with extracted content
      (chrome.tabs.sendMessage as any).mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "A".repeat(1000),
          metadata: { title: "First Article" },
        },
      });

      render(<SidePanel />);

      // Extract content on first tab
      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        expect(
          screen.getByText(/1000 characters extracted/i),
        ).toBeInTheDocument();
      });

      // Simulate tab change
      const newTab = createMockTab({
        id: 2,
        url: "https://example.com/another",
        title: "Second Article",
      });
      (chrome.tabs.query as any).mockResolvedValue([newTab]);

      // Trigger tab change event
      if (tabChangeCallback) {
        tabChangeCallback({ tabId: 2, windowId: 1 });
      }

      // Should reset to idle state
      await waitFor(() => {
        expect(
          screen.getByText(/Ready to extract content/i),
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/1000 characters extracted/i),
        ).not.toBeInTheDocument();
      });
    });

    it("should update tab info when tab changes", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        expect(screen.getByText(/First Article/i)).toBeInTheDocument();
      });

      // Simulate tab change to new tab
      const newTab = createMockTab({
        id: 2,
        url: "https://newsite.com/page",
        title: "New Site Page",
      });
      (chrome.tabs.query as any).mockResolvedValue([newTab]);

      if (tabChangeCallback) {
        tabChangeCallback({ tabId: 2, windowId: 1 });
      }

      // Should show new tab info
      await waitFor(() => {
        expect(screen.getByText(/New Site Page/i)).toBeInTheDocument();
        expect(screen.getByText(/newsite.com/i)).toBeInTheDocument();
      });
    });

    it("should clear extracted content when switching tabs", async () => {
      const user = userEvent.setup();

      // Extract content on first tab
      (chrome.tabs.sendMessage as any).mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "A".repeat(1000), // Ensure minimum length
          metadata: { title: "First Tab" },
        },
      });

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        expect(screen.getByText(/characters extracted/i)).toBeInTheDocument();
      });

      // Switch to new tab
      const newTab = createMockTab({
        id: 2,
        url: "https://example.com/new",
        title: "New Tab",
      });
      (chrome.tabs.query as any).mockResolvedValue([newTab]);

      if (tabChangeCallback) {
        tabChangeCallback({ tabId: 2, windowId: 1 });
      }

      // Content should be cleared
      await waitFor(() => {
        expect(
          screen.queryByText(/characters extracted/i),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /Extract & Summarize/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Tab Change Error Handling", () => {
    it("should handle tab change to unsupported pages", async () => {
      render(<SidePanel />);

      // Change to chrome:// URL
      const chromeTab = createMockTab({
        id: 2,
        url: "chrome://settings",
        title: "Settings",
      });
      (chrome.tabs.query as any).mockResolvedValue([chromeTab]);

      if (tabChangeCallback) {
        tabChangeCallback({ tabId: 2, windowId: 1 });
      }

      await waitFor(() => {
        expect(screen.getByText(/Settings/i)).toBeInTheDocument();
      });

      // Should still show Extract button but it will fail when clicked
      expect(
        screen.getByRole("button", { name: /Extract & Summarize/i }),
      ).toBeInTheDocument();
    });

    it("should handle rapid tab switches", async () => {
      render(<SidePanel />);

      let queryCallCount = 0;
      (chrome.tabs.query as any).mockImplementation(() => {
        queryCallCount++;
        return Promise.resolve([
          createMockTab({
            id: queryCallCount,
            url: `https://example.com/page${queryCallCount}`,
            title: `Page ${queryCallCount}`,
          }),
        ]);
      });

      // Simulate rapid tab changes
      if (tabChangeCallback) {
        tabChangeCallback({ tabId: 1, windowId: 1 });
        tabChangeCallback({ tabId: 2, windowId: 1 });
        tabChangeCallback({ tabId: 3, windowId: 1 });
      }

      // Should only show the last tab
      await waitFor(() => {
        expect(screen.getByText(/Page 3/i)).toBeInTheDocument();
      });
    });

    it("should handle tab change during extraction", async () => {
      const user = userEvent.setup();

      // Mock slow extraction
      (chrome.tabs.sendMessage as any).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  type: "EXTRACT_CONTENT",
                  payload: {
                    text: "A".repeat(1000),
                    metadata: { title: "Slow Load" },
                  },
                }),
              100,
            ),
          ),
      );

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // Should show extracting state
      expect(
        screen.getByText(/Extracting text from page/i),
      ).toBeInTheDocument();

      // Change tab during extraction
      const newTab = createMockTab({
        id: 2,
        url: "https://example.com/new",
        title: "New Tab",
      });
      (chrome.tabs.query as any).mockResolvedValue([newTab]);

      if (tabChangeCallback) {
        tabChangeCallback({ tabId: 2, windowId: 1 });
      }

      // Should cancel extraction and reset
      await waitFor(() => {
        expect(
          screen.queryByText(/Extracting text from page/i),
        ).not.toBeInTheDocument();
        expect(
          screen.getByText(/Ready to extract content/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/New Tab/i)).toBeInTheDocument();
      });
    });
  });

  describe("Tab Change with Settings", () => {
    it("should preserve summarization settings across tab changes", async () => {
      const user = userEvent.setup();

      render(<SidePanel />);

      // Change settings
      const lengthSelect = await screen.findByLabelText("Summary Length");
      await user.selectOptions(lengthSelect, "medium");

      await waitFor(() => {
        expect(SettingsService.saveSummarizationSettings).toHaveBeenCalledWith(
          expect.objectContaining({ length: "medium" }),
        );
      });

      // Switch tabs
      const newTab = createMockTab({
        id: 2,
        url: "https://example.com/new",
        title: "New Tab",
      });
      (chrome.tabs.query as any).mockResolvedValue([newTab]);

      if (tabChangeCallback) {
        tabChangeCallback({ tabId: 2, windowId: 1 });
      }

      await waitFor(() => {
        expect(screen.getByText(/New Tab/i)).toBeInTheDocument();
      });

      // Settings should still be "medium"
      const lengthSelectAfter = screen.getByLabelText("Summary Length");
      expect(lengthSelectAfter).toHaveValue("medium");
    });
  });

  describe("Tab Change Edge Cases", () => {
    it("should handle tab change to new window", async () => {
      render(<SidePanel />);

      const newTab = createMockTab({
        id: 100,
        url: "https://example.com/newwindow",
        title: "New Window Tab",
      });
      (chrome.tabs.query as any).mockResolvedValue([newTab]);

      if (tabChangeCallback) {
        tabChangeCallback({ tabId: 100, windowId: 2 });
      }

      await waitFor(() => {
        expect(screen.getByText(/New Window Tab/i)).toBeInTheDocument();
      });
    });

    it("should handle tab change when no active tab exists", async () => {
      render(<SidePanel />);

      // No active tab
      (chrome.tabs.query as any).mockResolvedValue([]);

      if (tabChangeCallback) {
        tabChangeCallback({ tabId: 999, windowId: 1 });
      }

      // Should handle gracefully
      await waitFor(() => {
        expect(
          screen.getByText(/Ready to extract content/i),
        ).toBeInTheDocument();
      });
    });

    it("should handle tab close scenarios", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        expect(screen.getByText(/First Article/i)).toBeInTheDocument();
      });

      // Simulate tab being closed (no active tab)
      (chrome.tabs.query as any).mockResolvedValue([]);

      if (tabChangeCallback) {
        tabChangeCallback({ tabId: -1, windowId: 1 });
      }

      // Should still show UI but no tab info
      await waitFor(() => {
        expect(screen.queryByText(/First Article/i)).not.toBeInTheDocument();
        expect(
          screen.getByText(/Ready to extract content/i),
        ).toBeInTheDocument();
      });
    });
  });
});
