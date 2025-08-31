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

describe("SidePanel Deferred Content Extraction", () => {
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
      privacyBannerDismissed: false,
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
  });

  describe("Initial Mount Behavior", () => {
    it("should NOT automatically extract content on mount", async () => {
      render(<SidePanel />);

      // Wait for settings to load
      await waitFor(() => {
        expect(SettingsService.loadSettings).toHaveBeenCalled();
      });

      // Verify extraction was NOT attempted
      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
      // chrome.tabs.query can be called to get tab info for display
    });

    it("should show idle state with page info without extraction", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        // Should show current tab info
        expect(screen.getByText(/Test Article/i)).toBeInTheDocument();
        expect(screen.getByText(/example.com/i)).toBeInTheDocument();
      });

      // Should NOT show extraction status
      expect(
        screen.queryByText(/characters extracted/i),
      ).not.toBeInTheDocument();

      // Should show extract button
      expect(
        screen.getByRole("button", { name: /Extract & Summarize/i }),
      ).toBeInTheDocument();
    });

    it("should display ready state UI on initial load", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        // Should show ready state message
        expect(
          screen.getByText(/Ready to extract content/i),
        ).toBeInTheDocument();
      });

      // Should show tab URL
      expect(screen.getByText(/example.com\/article/i)).toBeInTheDocument();
    });
  });

  describe("User-Initiated Extraction", () => {
    beforeEach(() => {
      // Mock settings with privacy banner already dismissed
      (SettingsService.loadSettings as any).mockResolvedValue({
        openaiApiKey: "",
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      });
    });

    it("should extract content only when user clicks Extract button", async () => {
      const user = userEvent.setup();

      // Mock text extraction response
      (chrome.tabs.sendMessage as any).mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "This is a long article about testing that needs to be summarized. It contains multiple paragraphs of content that exceed the minimum character requirement for proper summarization.",
          metadata: {
            title: "Test Article",
            url: "https://example.com/article",
            extractedAt: new Date().toISOString(),
          },
        },
      });

      render(<SidePanel />);

      // Wait for initial render
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Extract & Summarize/i }),
        ).toBeInTheDocument();
      });

      // Verify no extraction happened yet
      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();

      // Click extract button
      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // Now extraction should happen
      await waitFor(() => {
        expect(chrome.tabs.query).toHaveBeenCalledWith({
          active: true,
          currentWindow: true,
        });
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
          action: "EXTRACT_CONTENT",
        });
      });

      // Should show extracted text status
      await waitFor(() => {
        expect(screen.getByText(/characters extracted/i)).toBeInTheDocument();
      });
    });

    it("should show extraction progress when Extract button is clicked", async () => {
      const user = userEvent.setup();

      // Mock a slow extraction
      (chrome.tabs.sendMessage as any).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  type: "EXTRACT_CONTENT",
                  payload: {
                    text: "A".repeat(1000),
                    metadata: { title: "Test Article" },
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

      // Should show extracting status
      expect(
        screen.getByText(/Extracting text from page/i),
      ).toBeInTheDocument();
      expect(screen.getByTestId("extraction-spinner")).toBeInTheDocument();

      // Wait for extraction to complete
      await waitFor(() => {
        expect(
          screen.getByText(/1000 characters extracted/i),
        ).toBeInTheDocument();
      });
    });

    it("should transition from idle to extracted state after user action", async () => {
      const user = userEvent.setup();

      (chrome.tabs.sendMessage as any).mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "A".repeat(500),
          metadata: { title: "Test Article" },
        },
      });

      render(<SidePanel />);

      // Initial idle state
      expect(screen.getByText(/Ready to extract content/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/characters extracted/i),
      ).not.toBeInTheDocument();

      // Click extract
      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // Should transition to extracted state
      await waitFor(() => {
        expect(
          screen.queryByText(/Ready to extract content/i),
        ).not.toBeInTheDocument();
        expect(
          screen.getByText(/500 characters extracted/i),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /Summarize Page/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("StreamingSummarizer Integration", () => {
    beforeEach(() => {
      (SettingsService.loadSettings as any).mockResolvedValue({
        openaiApiKey: MOCK_API_KEY,
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      });
      (SettingsService.getProvider as any).mockResolvedValue(mockProvider);
    });

    it("should pass extraction trigger to StreamingSummarizer", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        // StreamingSummarizer should render with extract button
        const extractButton = screen.getByRole("button", {
          name: /Extract & Summarize/i,
        });
        expect(extractButton).toBeInTheDocument();
        expect(extractButton).toBeEnabled();
      });

      // Should NOT have extracted text initially
      expect(
        screen.queryByText(/characters extracted/i),
      ).not.toBeInTheDocument();
    });

    it("should handle extraction errors from user-initiated action", async () => {
      const user = userEvent.setup();

      (chrome.tabs.sendMessage as any).mockRejectedValue(
        new Error("Cannot access chrome:// URLs"),
      );

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Cannot access chrome:\/\/ URLs/i),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /Try Again/i }),
        ).toBeInTheDocument();
      });
    });

    it("should enable summarization only after successful extraction", async () => {
      const user = userEvent.setup();

      (chrome.tabs.sendMessage as any).mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "A".repeat(1000),
          metadata: { title: "Test Article" },
        },
      });

      render(<SidePanel />);

      // Initially, only extract button should be available
      expect(
        screen.getByRole("button", { name: /Extract & Summarize/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Summarize Page/i }),
      ).not.toBeInTheDocument();

      // Extract content
      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // After extraction, summarize button should appear
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Summarize Page/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /Summarize Page/i }),
        ).toBeEnabled();
      });
    });
  });

  describe("UI State Management", () => {
    beforeEach(() => {
      (SettingsService.loadSettings as any).mockResolvedValue({
        openaiApiKey: "",
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      });
    });

    it("should maintain idle state until user action", async () => {
      render(<SidePanel />);

      // Wait for component to stabilize
      await waitFor(() => {
        expect(
          screen.getByText(/Ready to extract content/i),
        ).toBeInTheDocument();
      });

      // Should remain in idle state
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(screen.getByText(/Ready to extract content/i)).toBeInTheDocument();
      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });

    it("should show different UI states clearly", async () => {
      const user = userEvent.setup();

      // Start with delayed extraction mock to see extracting state
      (chrome.tabs.sendMessage as any).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  type: "EXTRACT_CONTENT",
                  payload: {
                    text: "A".repeat(1000),
                    metadata: { title: "Test Article" },
                  },
                }),
              50,
            ),
          ),
      );

      render(<SidePanel />);

      // State: idle
      expect(screen.getByTestId("state-idle")).toBeInTheDocument();
      expect(screen.getByText(/Ready to extract content/i)).toBeInTheDocument();

      // Trigger extraction
      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // State: extracting (should appear immediately after click)
      expect(screen.getByTestId("state-extracting")).toBeInTheDocument();

      // State: extracted (wait for async completion)
      await waitFor(() => {
        expect(screen.getByTestId("state-extracted")).toBeInTheDocument();
        expect(
          screen.getByText(/1000 characters extracted/i),
        ).toBeInTheDocument();
      });
    });

    it("should reset to idle state on refresh", async () => {
      const user = userEvent.setup();

      (chrome.tabs.sendMessage as any).mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "A".repeat(1000),
          metadata: { title: "Test Article" },
        },
      });

      render(<SidePanel />);

      // Extract content
      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        expect(
          screen.getByText(/1000 characters extracted/i),
        ).toBeInTheDocument();
      });

      // Click refresh
      const refreshButton = screen.getByRole("button", { name: /Refresh/i });
      await user.click(refreshButton);

      // Should return to idle state
      await waitFor(() => {
        expect(
          screen.getByText(/Ready to extract content/i),
        ).toBeInTheDocument();
        expect(
          screen.queryByText(/characters extracted/i),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid Extract button clicks", async () => {
      const user = userEvent.setup();

      let callCount = 0;
      (chrome.tabs.sendMessage as any).mockImplementation(() => {
        callCount++;
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                type: "EXTRACT_CONTENT",
                payload: {
                  text: `Call ${callCount}: ` + "A".repeat(100),
                  metadata: { title: "Test Article" },
                },
              }),
            50,
          ),
        );
      });

      render(<SidePanel />);

      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });

      // Click multiple times rapidly
      await user.click(extractButton);
      await user.click(extractButton);
      await user.click(extractButton);

      // Should only process one extraction
      await waitFor(() => {
        expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
      });
    });

    it("should handle extraction when no active tab exists", async () => {
      const user = userEvent.setup();

      // Mock no active tab
      (chrome.tabs.query as any).mockResolvedValue([]);

      render(<SidePanel />);

      const extractButton = await screen.findByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        expect(screen.getByText(/No active tab found/i)).toBeInTheDocument();
      });
    });

    it("should preserve settings when switching between extraction states", async () => {
      const user = userEvent.setup();

      render(<SidePanel />);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByLabelText("Summary Length")).toBeInTheDocument();
      });

      // Change settings
      const lengthSelect = screen.getByLabelText("Summary Length");
      await user.selectOptions(lengthSelect, "medium");

      // Wait for setting to be saved
      await waitFor(() => {
        expect(SettingsService.saveSummarizationSettings).toHaveBeenCalledWith(
          expect.objectContaining({ length: "medium" }),
        );
      });

      // Extract content
      (chrome.tabs.sendMessage as any).mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "A".repeat(1000),
          metadata: { title: "Test Article" },
        },
      });

      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      await waitFor(() => {
        expect(
          screen.getByText(/1000 characters extracted/i),
        ).toBeInTheDocument();
      });

      // Settings should be preserved
      const lengthSelectAfter = screen.getByLabelText("Summary Length");
      expect(lengthSelectAfter).toHaveValue("medium");
    });
  });
});
