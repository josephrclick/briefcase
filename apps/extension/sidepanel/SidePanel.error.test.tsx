import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { SidePanel } from "./SidePanel";
import { SettingsService } from "../lib/settings-service";
import { OpenAIProvider } from "../lib/openai-provider";
import { DocumentRepository } from "../lib/document-repository";
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
    lastError: null as any,
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

describe("SidePanel Error Messaging Enhancement", () => {
  let mockProvider: any;
  let mockDocumentRepository: any;
  let storageHelper: ReturnType<typeof setupChromeStorageMock>;

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
        title: "Test Article",
      }),
    ]);
    storageHelper = setupChromeStorageMock();
    setupAbortControllerMock();

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
    chrome.runtime.lastError = null;
  });

  describe("Content Script Communication Errors", () => {
    it("should detect 'Receiving end does not exist' error and show refresh message", async () => {
      const user = userEvent.setup();

      // Mock the specific Chrome runtime error
      (chrome.tabs.sendMessage as any).mockRejectedValue(
        new Error(
          "Could not establish connection. Receiving end does not exist.",
        ),
      );

      render(<SidePanel />);

      // Try to extract content
      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // Should show specific refresh instruction
      await waitFor(() => {
        expect(
          screen.getByText(/Please refresh this page and try again/i),
        ).toBeInTheDocument();
      });

      // Should show refresh icon or button
      expect(
        screen.getByRole("button", { name: /Refresh Page/i }),
      ).toBeInTheDocument();
    });

    it("should detect content script not injected on pre-loaded pages", async () => {
      const user = userEvent.setup();

      // Simulate error when content script is not injected
      chrome.runtime.lastError = {
        message:
          "Cannot access contents of this page. Extension manifest must request permission to access this host.",
      };

      (chrome.tabs.sendMessage as any).mockImplementation(
        (tabId, message, callback) => {
          if (callback) {
            callback(undefined);
          }
          return Promise.reject(new Error("Extension context invalidated"));
        },
      );

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Extension was installed after this page loaded/i),
        ).toBeInTheDocument();
      });
    });

    it("should show refresh page button with icon", async () => {
      const user = userEvent.setup();

      (chrome.tabs.sendMessage as any).mockRejectedValue(
        new Error(
          "Could not establish connection. Receiving end does not exist.",
        ),
      );

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        const refreshButton = screen.getByRole("button", {
          name: /Refresh Page/i,
        });
        expect(refreshButton).toBeInTheDocument();

        // Check for refresh icon (🔄 or similar)
        expect(refreshButton.textContent).toContain("🔄");
      });
    });

    it("should allow user to retry after refreshing", async () => {
      const user = userEvent.setup();

      // First attempt fails
      (chrome.tabs.sendMessage as any).mockRejectedValueOnce(
        new Error(
          "Could not establish connection. Receiving end does not exist.",
        ),
      );

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Refresh Page/i }),
        ).toBeInTheDocument();
      });

      // Mock successful extraction after refresh
      (chrome.tabs.sendMessage as any).mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "A".repeat(1000),
          metadata: { title: "Test Article" },
        },
      });

      // Click refresh page button (simulates page refresh)
      const refreshButton = screen.getByRole("button", {
        name: /Refresh Page/i,
      });
      await user.click(refreshButton);

      // Should trigger page reload
      expect(chrome.tabs.query).toHaveBeenCalled();
    });
  });

  describe("Error Message Clarity", () => {
    it("should show different messages for different error types", async () => {
      const user = userEvent.setup();

      const errorScenarios = [
        {
          error: new Error(
            "Could not establish connection. Receiving end does not exist.",
          ),
          expectedMessage: /Please refresh this page and try again/i,
        },
        {
          error: new Error("Cannot access chrome:// URLs"),
          expectedMessage: /Cannot extract text from browser system pages/i,
        },
        {
          error: new Error("Cannot access contents of url"),
          expectedMessage:
            /Extension doesn't have permission to access this page/i,
        },
        {
          error: new Error("Frame not found"),
          expectedMessage:
            /Unable to access page content. This might be an embedded frame/i,
        },
      ];

      for (const scenario of errorScenarios) {
        // Clear previous renders
        const { unmount } = render(<SidePanel />);

        (chrome.tabs.sendMessage as any).mockRejectedValue(scenario.error);

        unmount();
        render(<SidePanel />);

        const extractButton = await screen.findByRole("button", {
          name: /Extract & Summarize/i,
        });
        await user.click(extractButton);

        await waitFor(() => {
          expect(
            screen.getByText(scenario.expectedMessage),
          ).toBeInTheDocument();
        });

        unmount();
      }
    });

    it("should include helpful context in error messages", async () => {
      const user = userEvent.setup();

      (chrome.tabs.sendMessage as any).mockRejectedValue(
        new Error(
          "Could not establish connection. Receiving end does not exist.",
        ),
      );

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        // Should explain why this happens
        expect(
          screen.getByText(
            /This usually happens when the extension was installed or updated after the page was loaded/i,
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Visual Error Indicators", () => {
    it("should show error icon with error messages", async () => {
      const user = userEvent.setup();

      (chrome.tabs.sendMessage as any).mockRejectedValue(
        new Error(
          "Could not establish connection. Receiving end does not exist.",
        ),
      );

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        const errorContainer = screen.getByTestId("error-container");
        expect(errorContainer).toBeInTheDocument();

        // Check for error icon
        expect(errorContainer.textContent).toMatch(/[⚠️❌🚫]/);
      });
    });

    it("should style error messages appropriately", async () => {
      const user = userEvent.setup();

      (chrome.tabs.sendMessage as any).mockRejectedValue(
        new Error(
          "Could not establish connection. Receiving end does not exist.",
        ),
      );

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        const errorContainer = screen.getByTestId("error-container");
        expect(errorContainer.className).toContain("error");
      });
    });
  });

  describe("Page Refresh Functionality", () => {
    it("should reload the current tab when refresh button is clicked", async () => {
      const user = userEvent.setup();

      (chrome.tabs.sendMessage as any).mockRejectedValue(
        new Error(
          "Could not establish connection. Receiving end does not exist.",
        ),
      );

      // Mock chrome.tabs.reload
      chrome.tabs.reload = vi.fn();

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Refresh Page/i }),
        ).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole("button", {
        name: /Refresh Page/i,
      });
      await user.click(refreshButton);

      // Should trigger tab reload
      expect(chrome.tabs.reload).toHaveBeenCalledWith(1);
    });

    it("should reset error state after page refresh", async () => {
      const user = userEvent.setup();

      (chrome.tabs.sendMessage as any).mockRejectedValue(
        new Error(
          "Could not establish connection. Receiving end does not exist.",
        ),
      );

      chrome.tabs.reload = vi
        .fn()
        .mockImplementation((tabId, properties, callback) => {
          if (callback) callback();
        });

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Refresh Page/i }),
        ).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole("button", {
        name: /Refresh Page/i,
      });
      await user.click(refreshButton);

      // Should reset to idle state after refresh
      await waitFor(() => {
        expect(
          screen.getByText(/Ready to extract content/i),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: /Refresh Page/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle unknown errors gracefully", async () => {
      const user = userEvent.setup();

      (chrome.tabs.sendMessage as any).mockRejectedValue(
        new Error("Some unknown error occurred"),
      );

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        // Should show generic error with Try Again option
        expect(
          screen.getByText(/Failed to extract text from page/i),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /Try Again/i }),
        ).toBeInTheDocument();
      });
    });

    it("should handle network errors", async () => {
      const user = userEvent.setup();

      (chrome.tabs.sendMessage as any).mockRejectedValue(
        new Error("NetworkError: Failed to fetch"),
      );

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /Try Again/i }),
        ).toBeInTheDocument();
      });
    });
  });
});
