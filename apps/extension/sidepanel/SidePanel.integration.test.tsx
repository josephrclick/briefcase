import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { SidePanel } from "./SidePanel";
import { SettingsService } from "../lib/settings-service";
import { OpenAIProvider } from "../lib/openai-provider";
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
  },
} as any;

vi.mock("../lib/settings-service");
vi.mock("../lib/openai-provider");

describe("SidePanel Integration Tests", () => {
  let mockProvider: any;
  let storageHelper: ReturnType<typeof setupChromeStorageMock>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Chrome API mocks
    setupChromeTabsMock([
      createMockTab({ url: "https://example.com/article" }),
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

  describe("Initial Setup Flow", () => {
    it("should show privacy banner on first use", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        expect(screen.getByText("🔒 Privacy First")).toBeInTheDocument();
        expect(
          screen.getByText(/stored locally on your device/i),
        ).toBeInTheDocument();
      });
    });

    it("should prompt for API key configuration when not set", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        expect(
          screen.getByText(/configure your OpenAI API key/i),
        ).toBeInTheDocument();
      });
    });

    it("should allow dismissing privacy banner", async () => {
      const user = userEvent.setup();
      render(<SidePanel />);

      await waitFor(() => {
        expect(screen.getByText("🔒 Privacy First")).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole("button", { name: /Got it/i });
      await user.click(dismissButton);

      expect(SettingsService.saveSettings).toHaveBeenCalledWith({
        privacyBannerDismissed: true,
      });
    });
  });

  describe("Settings Configuration Flow", () => {
    beforeEach(() => {
      // Mock settings with privacy banner already dismissed
      (SettingsService.loadSettings as any).mockResolvedValue({
        openaiApiKey: "",
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      });
    });

    it("should allow configuring API key", async () => {
      const user = userEvent.setup();
      render(<SidePanel />);

      // Navigate to settings
      const settingsTab = await screen.findByRole("tab", { name: /Settings/i });
      await user.click(settingsTab);

      // Wait for settings panel to render and enter API key
      const apiKeyInput = await screen.findByLabelText("API Key");
      await user.type(apiKeyInput, MOCK_API_KEY);

      // Save settings
      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(SettingsService.saveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            openaiApiKey: MOCK_API_KEY,
          }),
        );
      });
    });

    it("should validate API key before saving", async () => {
      const user = userEvent.setup();
      render(<SidePanel />);

      // Navigate to settings
      const settingsTab = await screen.findByRole("tab", { name: /Settings/i });
      await user.click(settingsTab);

      // Wait for settings panel to render and enter API key
      const apiKeyInput = await screen.findByLabelText("API Key");
      await user.type(apiKeyInput, MOCK_API_KEY);

      // Test connection
      const testButton = screen.getByRole("button", {
        name: /Test Connection/i,
      });
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection successful/i)).toBeInTheDocument();
      });
    });

    it("should persist summarization preferences", async () => {
      const user = userEvent.setup();
      render(<SidePanel />);

      // Navigate to settings
      const settingsTab = await screen.findByRole("tab", { name: /Settings/i });
      await user.click(settingsTab);

      // Change preferences
      const lengthSelect = screen.getByLabelText("Summary Length");
      await user.selectOptions(lengthSelect, "medium");

      const styleSelect = screen.getByLabelText("Summary Style");
      await user.selectOptions(styleSelect, "plain");

      // Save settings
      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      expect(SettingsService.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          summarization: {
            length: "medium",
            style: "plain",
          },
        }),
      );
    });
  });

  describe("Text Extraction Flow", () => {
    beforeEach(() => {
      // Mock settings with privacy banner already dismissed
      (SettingsService.loadSettings as any).mockResolvedValue({
        openaiApiKey: "",
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      });
    });

    it("should extract text from current tab", async () => {
      // Active tab is already mocked in beforeEach
      const activeTab = createMockTab({
        id: 1,
        url: "https://example.com/article",
      });
      setupChromeTabsMock([activeTab]);

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

      await waitFor(() => {
        expect(chrome.tabs.query).toHaveBeenCalledWith({
          active: true,
          currentWindow: true,
        });
      });

      await waitFor(() => {
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
          action: "EXTRACT_CONTENT",
        });
      });

      // Should show extracted text status
      await waitFor(() => {
        expect(screen.getByText(/characters extracted/i)).toBeInTheDocument();
      });
    });

    it("should handle extraction errors gracefully", async () => {
      const chromeTab = createMockTab({ id: 1, url: "chrome://extensions" });
      setupChromeTabsMock([chromeTab]);

      (chrome.tabs.sendMessage as any).mockRejectedValue(
        new Error("Cannot access chrome:// URLs"),
      );

      render(<SidePanel />);

      await waitFor(() => {
        expect(
          screen.getByText(/Cannot extract text from this page/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Summarization Flow", () => {
    beforeEach(() => {
      // Setup with API key configured
      const settingsWithKey = {
        openaiApiKey: "sk-test123456789abcdefghijklmnop",
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      };

      (SettingsService.loadSettings as any).mockResolvedValue(settingsWithKey);
      (SettingsService.getProvider as any).mockResolvedValue(mockProvider);

      // Mock extracted text - tab already setup in beforeEach
      const activeTab = createMockTab({
        id: 1,
        url: "https://example.com/article",
      });
      setupChromeTabsMock([activeTab]);

      (chrome.tabs.sendMessage as any).mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "A".repeat(1000), // Long enough text
          metadata: {
            title: "Test Article",
            url: "https://example.com/article",
          },
        },
      });
    });

    it("should perform streaming summarization", async () => {
      const user = userEvent.setup();

      // Create mock streaming response
      const mockStream = new ReadableStream({
        async start(controller) {
          controller.enqueue("**Key Points:**\n");
          await new Promise((resolve) => setTimeout(resolve, 10));
          controller.enqueue("• First important point\n");
          await new Promise((resolve) => setTimeout(resolve, 10));
          controller.enqueue("• Second important point\n");
          await new Promise((resolve) => setTimeout(resolve, 10));
          controller.enqueue("\n**TL;DR:** This is a brief summary.");
          controller.close();
        },
      });

      mockProvider.summarize.mockReturnValue(mockStream);

      render(<SidePanel />);

      // Wait for extraction to complete
      await waitFor(() => {
        expect(
          screen.getByText(/1000 characters extracted/i),
        ).toBeInTheDocument();
      });

      // Click summarize button
      const summarizeButton = screen.getByRole("button", {
        name: /Summarize Page/i,
      });
      await user.click(summarizeButton);

      // Should show streaming indicator
      expect(screen.getByText(/Generating summary/i)).toBeInTheDocument();

      // Wait for streaming to complete
      await waitFor(
        () => {
          expect(screen.getByText("Summary complete")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Should display formatted summary
      expect(screen.getByText("Key Points")).toBeInTheDocument();
      expect(screen.getByText(/First important point/i)).toBeInTheDocument();
      expect(screen.getByText(/Second important point/i)).toBeInTheDocument();
      expect(screen.getByText("TL;DR")).toBeInTheDocument();
      expect(screen.getByText(/This is a brief summary/i)).toBeInTheDocument();
    });

    it("should allow copying summary to clipboard", async () => {
      const user = userEvent.setup();

      const mockStream = new ReadableStream({
        async start(controller) {
          controller.enqueue("**Key Points:**\n• Test\n\n**TL;DR:** Summary");
          controller.close();
        },
      });

      mockProvider.summarize.mockReturnValue(mockStream);

      // Mock clipboard API
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(<SidePanel />);

      await waitFor(() => {
        expect(
          screen.getByText(/1000 characters extracted/i),
        ).toBeInTheDocument();
      });

      const summarizeButton = screen.getByRole("button", {
        name: /Summarize Page/i,
      });
      await user.click(summarizeButton);

      await waitFor(() => {
        expect(screen.getByText("Summary complete")).toBeInTheDocument();
      });

      const copyButton = screen.getByRole("button", { name: /Copy Summary/i });
      await user.click(copyButton);

      expect(writeTextMock).toHaveBeenCalledWith(
        "**Key Points:**\n• Test\n\n**TL;DR:** Summary",
      );

      await waitFor(() => {
        expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
      });
    });

    it("should handle summarization cancellation", async () => {
      const user = userEvent.setup();

      // Create a slow stream
      const mockStream = new ReadableStream({
        async start(controller) {
          for (let i = 0; i < 100; i++) {
            controller.enqueue(`Chunk ${i} `);
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          controller.close();
        },
      });

      mockProvider.summarize.mockReturnValue(mockStream);

      render(<SidePanel />);

      await waitFor(() => {
        expect(
          screen.getByText(/1000 characters extracted/i),
        ).toBeInTheDocument();
      });

      const summarizeButton = screen.getByRole("button", {
        name: /Summarize Page/i,
      });
      await user.click(summarizeButton);

      // Should show cancel button during streaming
      const cancelButton = await screen.findByRole("button", {
        name: /Cancel/i,
      });
      await user.click(cancelButton);

      // Should show cancellation message
      await waitFor(() => {
        expect(
          screen.getByText(/Summarization cancelled/i),
        ).toBeInTheDocument();
      });

      // Should be able to retry
      expect(
        screen.getByRole("button", { name: /Summarize Page/i }),
      ).toBeEnabled();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      // Mock settings with privacy banner already dismissed and API key configured
      (SettingsService.loadSettings as any).mockResolvedValue({
        openaiApiKey: MOCK_API_KEY,
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      });
    });

    it("should handle API errors with retry", async () => {
      const user = userEvent.setup();

      const settingsWithKey = {
        openaiApiKey: "sk-test123456789abcdefghijklmnop",
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      };

      (SettingsService.loadSettings as any).mockResolvedValue(settingsWithKey);
      (SettingsService.getProvider as any).mockResolvedValue(mockProvider);

      (chrome.tabs.query as any).mockResolvedValue([
        { id: 1, url: "https://example.com" },
      ]);

      (chrome.tabs.sendMessage as any).mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "A".repeat(1000),
        },
      });

      // First attempt fails
      mockProvider.summarize.mockImplementationOnce(() => {
        throw new Error("API Error: Rate limit exceeded");
      });

      // Second attempt succeeds
      mockProvider.summarize.mockImplementationOnce(() => {
        return new ReadableStream({
          start(controller) {
            controller.enqueue("Summary after retry");
            controller.close();
          },
        });
      });

      render(<SidePanel />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Summarize Page/i }),
        ).toBeInTheDocument();
      });

      const summarizeButton = screen.getByRole("button", {
        name: /Summarize Page/i,
      });
      await user.click(summarizeButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByRole("button", { name: /Try Again/i });
      await user.click(retryButton);

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText("Summary after retry")).toBeInTheDocument();
      });
    });

    it("should handle missing API key error", async () => {
      const user = userEvent.setup();

      // No API key configured
      (SettingsService.getProvider as any).mockResolvedValue(null);

      (chrome.tabs.query as any).mockResolvedValue([
        { id: 1, url: "https://example.com" },
      ]);

      (chrome.tabs.sendMessage as any).mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "A".repeat(1000),
        },
      });

      render(<SidePanel />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Summarize Page/i }),
        ).toBeInTheDocument();
      });

      const summarizeButton = screen.getByRole("button", {
        name: /Summarize Page/i,
      });
      await user.click(summarizeButton);

      // Should show API key configuration error
      await waitFor(() => {
        expect(
          screen.getByText(/Please configure your OpenAI API key/i),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("link", { name: /Go to Settings/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Tab Navigation", () => {
    beforeEach(() => {
      // Mock settings with privacy banner already dismissed
      (SettingsService.loadSettings as any).mockResolvedValue({
        openaiApiKey: "",
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      });
    });

    it("should switch between Summarize and Settings tabs", async () => {
      const user = userEvent.setup();
      render(<SidePanel />);

      // Should start on Summarize tab
      expect(
        screen.getByRole("tabpanel", { name: /Summarize/i }),
      ).toBeInTheDocument();

      // Switch to Settings
      const settingsTab = screen.getByRole("tab", { name: /Settings/i });
      await user.click(settingsTab);

      expect(
        screen.getByRole("tabpanel", { name: /Settings/i }),
      ).toBeInTheDocument();

      const apiKeyInput = await screen.findByLabelText("API Key");
      expect(apiKeyInput).toBeInTheDocument();

      // Switch back to Summarize
      const summarizeTab = screen.getByRole("tab", { name: /Summarize/i });
      await user.click(summarizeTab);

      expect(
        screen.getByRole("tabpanel", { name: /Summarize/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    beforeEach(() => {
      // Mock settings with privacy banner already dismissed and API key configured
      (SettingsService.loadSettings as any).mockResolvedValue({
        openaiApiKey: MOCK_API_KEY,
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      });
    });

    it("should handle large text extraction efficiently", async () => {
      const largeText = "A".repeat(12000); // Max supported size

      (chrome.tabs.query as any).mockResolvedValue([
        { id: 1, url: "https://example.com" },
      ]);

      (chrome.tabs.sendMessage as any).mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: largeText,
        },
      });

      render(<SidePanel />);

      await waitFor(() => {
        expect(
          screen.getByText(/12000 characters extracted/i),
        ).toBeInTheDocument();
      });
    });

    it("should handle rapid preference changes", async () => {
      const user = userEvent.setup();

      const settingsWithKey = {
        openaiApiKey: "sk-test123456789abcdefghijklmnop",
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      };

      (SettingsService.loadSettings as any).mockResolvedValue(settingsWithKey);

      render(<SidePanel />);

      // Make rapid changes
      for (let i = 0; i < 5; i++) {
        const lengthSelect = screen.getByLabelText("Summary Length");
        await user.selectOptions(
          lengthSelect,
          i % 2 === 0 ? "brief" : "medium",
        );
      }

      // Should debounce and only save once
      await waitFor(() => {
        expect(SettingsService.saveSummarizationSettings).toHaveBeenCalled();
      });
    });
  });
});
