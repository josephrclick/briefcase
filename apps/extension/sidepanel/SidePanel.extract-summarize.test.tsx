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
  setupReadableStreamMock,
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

describe("Combined Extract & Summarize Workflow", () => {
  let mockProvider: any;
  let mockDocumentRepository: any;
  let storageHelper: ReturnType<typeof setupChromeStorageMock>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Chrome APIs mock
    setupChromeTabsMock([createMockTab({ url: "https://example.com" })]);
    storageHelper = setupChromeStorageMock();
    setupAbortControllerMock();
    setupReadableStreamMock();

    // Mock provider
    mockProvider = {
      summarize: vi.fn(),
    };

    // Mock settings service
    (SettingsService.loadSettings as any).mockResolvedValue({
      openaiApiKey: MOCK_API_KEY,
      summarization: { length: "brief", style: "bullets" },
      privacyBannerDismissed: true,
    });
    (SettingsService.getProvider as any).mockResolvedValue(mockProvider);
    (SettingsService.saveSummarizationSettings as any).mockResolvedValue(
      undefined,
    );

    // Mock document repository
    mockDocumentRepository = {
      save: vi.fn().mockResolvedValue("doc-123"),
      getRecent: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteAll: vi.fn().mockResolvedValue(undefined),
    };
    (DocumentRepository as any).mockImplementation(
      () => mockDocumentRepository,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Auto-summarization after extraction", () => {
    it("should automatically trigger summarization after successful extraction", async () => {
      const user = userEvent.setup();

      // Setup mock extraction response
      chrome.tabs.sendMessage = vi.fn().mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "This is a test article about the combined extract and summarize workflow. ".repeat(
            10,
          ),
          metadata: {
            title: "Test Article",
            url: "https://example.com/article",
            extractedAt: new Date().toISOString(),
          },
        },
      });

      // Setup mock summarization stream
      const mockStream = new ReadableStream({
        async start(controller) {
          controller.enqueue("This is ");
          await new Promise((r) => setTimeout(r, 10));
          controller.enqueue("a summary of the extracted content.");
          controller.close();
        },
      });
      mockProvider.summarize.mockResolvedValue(mockStream);

      render(<SidePanel />);

      await waitFor(() => {
        expect(screen.getByText("Summarize")).toBeInTheDocument();
      });

      // Click the extract button
      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // Wait for extraction to complete
      await waitFor(() => {
        expect(chrome.tabs.sendMessage).toHaveBeenCalled();
      });

      // Verify that summarization starts automatically
      await waitFor(() => {
        expect(mockProvider.summarize).toHaveBeenCalled();
      });

      // Verify the summary is displayed
      await waitFor(() => {
        expect(
          screen.getByText(/a summary of the extracted content/i),
        ).toBeInTheDocument();
      });
    });

    it("should not auto-summarize if extraction fails", async () => {
      const user = userEvent.setup();

      // Setup mock extraction to fail
      chrome.tabs.sendMessage = vi
        .fn()
        .mockRejectedValue(new Error("Extraction failed"));

      render(<SidePanel />);

      await waitFor(() => {
        expect(screen.getByText("Summarize")).toBeInTheDocument();
      });

      // Click the extract button
      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // Wait for extraction to fail
      await waitFor(() => {
        expect(chrome.tabs.sendMessage).toHaveBeenCalled();
      });

      // Verify that summarization is NOT triggered
      expect(mockProvider.summarize).not.toHaveBeenCalled();

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Extraction failed/i)).toBeInTheDocument();
      });
    });

    it("should not auto-summarize if API key is not configured", async () => {
      const user = userEvent.setup();

      // Mock settings without API key
      (SettingsService.loadSettings as any).mockResolvedValue({
        openaiApiKey: "",
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      });
      (SettingsService.getProvider as any).mockResolvedValue(null);

      // Setup mock extraction response
      chrome.tabs.sendMessage = vi.fn().mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "This is a test article.".repeat(20),
          metadata: {
            title: "Test Article",
            url: "https://example.com/article",
          },
        },
      });

      render(<SidePanel />);

      await waitFor(() => {
        expect(screen.getByText("Summarize")).toBeInTheDocument();
      });

      // Click the extract button
      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // Wait for extraction to complete
      await waitFor(() => {
        expect(chrome.tabs.sendMessage).toHaveBeenCalled();
      });

      // Verify that summarization is NOT triggered
      expect(mockProvider.summarize).not.toHaveBeenCalled();

      // Verify extracted text is displayed but no summary
      await waitFor(() => {
        expect(
          screen.getByText(/600 characters extracted/i),
        ).toBeInTheDocument();
      });
    });

    it("should handle summarization errors gracefully during auto-summarize", async () => {
      const user = userEvent.setup();

      // Setup mock extraction response
      chrome.tabs.sendMessage = vi.fn().mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "This is a test article about error handling.".repeat(10),
          metadata: {
            title: "Test Article",
            url: "https://example.com/article",
          },
        },
      });

      // Setup mock summarization to fail
      mockProvider.summarize.mockRejectedValue(
        new Error("Summarization failed"),
      );

      render(<SidePanel />);

      await waitFor(() => {
        expect(screen.getByText("Summarize")).toBeInTheDocument();
      });

      // Click the extract button
      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // Wait for extraction to complete
      await waitFor(() => {
        expect(chrome.tabs.sendMessage).toHaveBeenCalled();
      });

      // Wait for summarization to be attempted
      await waitFor(() => {
        expect(mockProvider.summarize).toHaveBeenCalled();
      });

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Summarization failed/i)).toBeInTheDocument();
      });

      // Verify user can manually retry summarization
      const retryButton = screen.getByRole("button", {
        name: /Summarize/i,
      });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).not.toBeDisabled();
    });

    it("should show combined loading states during extract and summarize", async () => {
      const user = userEvent.setup();

      // Setup mock extraction with delay
      chrome.tabs.sendMessage = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                type: "EXTRACT_CONTENT",
                payload: {
                  text: "This is a test article.".repeat(20),
                  metadata: {
                    title: "Test Article",
                    url: "https://example.com/article",
                  },
                },
              });
            }, 100);
          }),
      );

      // Setup mock summarization stream with delay
      const mockStream = new ReadableStream({
        async start(controller) {
          await new Promise((r) => setTimeout(r, 100));
          controller.enqueue("Summary text");
          controller.close();
        },
      });
      mockProvider.summarize.mockResolvedValue(mockStream);

      render(<SidePanel />);

      await waitFor(() => {
        expect(screen.getByText("Summarize")).toBeInTheDocument();
      });

      // Click the extract button
      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // Verify extraction loading state
      await waitFor(() => {
        expect(screen.getByText(/Extracting/i)).toBeInTheDocument();
      });

      // Wait for extraction to complete and summarization to start
      await waitFor(() => {
        expect(chrome.tabs.sendMessage).toHaveBeenCalled();
        expect(mockProvider.summarize).toHaveBeenCalled();
      });

      // Verify summarization is happening
      await waitFor(() => {
        expect(screen.getByText(/Summary text/i)).toBeInTheDocument();
      });
    });

    it("should allow manual summarization if auto-summarize is skipped", async () => {
      const user = userEvent.setup();

      // Setup mock extraction response with text too short for auto-summarize
      chrome.tabs.sendMessage = vi.fn().mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "Short text", // Too short for summarization
          metadata: {
            title: "Test Article",
            url: "https://example.com/article",
          },
        },
      });

      render(<SidePanel />);

      await waitFor(() => {
        expect(screen.getByText("Summarize")).toBeInTheDocument();
      });

      // Click the extract button
      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // Wait for extraction to complete
      await waitFor(() => {
        expect(chrome.tabs.sendMessage).toHaveBeenCalled();
      });

      // Verify that summarization is NOT triggered (text too short)
      expect(mockProvider.summarize).not.toHaveBeenCalled();

      // Verify message about text being too short
      await waitFor(() => {
        expect(
          screen.getByText(/10 characters extracted/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("StreamingSummarizer auto-start prop", () => {
    it("should pass autoStart prop to StreamingSummarizer after extraction", async () => {
      const user = userEvent.setup();

      // Setup mock extraction response
      chrome.tabs.sendMessage = vi.fn().mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "This is a test article with enough content.".repeat(10),
          metadata: {
            title: "Test Article",
            url: "https://example.com/article",
          },
        },
      });

      // Setup mock summarization stream
      const mockStream = new ReadableStream({
        async start(controller) {
          controller.enqueue("Auto-started summary");
          controller.close();
        },
      });
      mockProvider.summarize.mockResolvedValue(mockStream);

      render(<SidePanel />);

      await waitFor(() => {
        expect(screen.getByText("Summarize")).toBeInTheDocument();
      });

      // Click the extract button
      const extractButton = screen.getByRole("button", {
        name: /Extract & Summarize/i,
      });
      await user.click(extractButton);

      // Wait for extraction and auto-summarization
      await waitFor(() => {
        expect(chrome.tabs.sendMessage).toHaveBeenCalled();
      });

      // Verify auto-summarization happens
      await waitFor(() => {
        expect(mockProvider.summarize).toHaveBeenCalled();
        expect(screen.getByText(/Auto-started summary/i)).toBeInTheDocument();
      });
    });
  });
});
