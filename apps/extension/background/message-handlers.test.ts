import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MessageHandlers } from "./message-handlers";
import { SettingsService } from "../lib/settings-service";
import { OpenAIProvider } from "../lib/openai-provider";

// Mock chrome runtime API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    sendMessage: vi.fn(),
    lastError: null,
  },
  tabs: {
    sendMessage: vi.fn(),
  },
} as any;

vi.mock("../lib/settings-service");
vi.mock("../lib/openai-provider");

describe("MessageHandlers", () => {
  let handlers: MessageHandlers;
  let mockProvider: any;
  let sendResponseSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProvider = {
      summarize: vi.fn(),
      summarizeComplete: vi.fn(),
      validateApiKey: vi.fn(),
    };

    (SettingsService.getProvider as any).mockResolvedValue(mockProvider);
    (SettingsService.loadSettings as any).mockResolvedValue({
      openaiApiKey: "sk-test123456789abcdefghijklmnop",
      summarization: { length: "brief", style: "bullets" },
      privacyBannerDismissed: false,
    });

    handlers = new MessageHandlers();
    sendResponseSpy = vi.fn();
  });

  afterEach(() => {
    handlers.cleanup();
  });

  describe("Initialization", () => {
    it("should register message listener on initialization", () => {
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    it("should remove listener on cleanup", () => {
      handlers.cleanup();
      expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalled();
    });
  });

  describe("Summarization Request", () => {
    it("should handle summarization request with streaming", async () => {
      const mockStream = new ReadableStream({
        async start(controller) {
          controller.enqueue("**Key Points:**\n");
          controller.enqueue("• Test point\n");
          controller.enqueue("\n**TL;DR:** Summary");
          controller.close();
        },
      });
      mockProvider.summarize.mockReturnValue(mockStream);

      const request = {
        type: "SUMMARIZE",
        data: {
          text: "Long article text here...",
          settings: { length: "brief", style: "bullets" },
        },
      };

      const result = await handlers.handleMessage(
        request,
        { tab: { id: 1 } } as any,
        sendResponseSpy,
      );

      expect(mockProvider.summarize).toHaveBeenCalledWith(
        "Long article text here...",
        { length: "brief", style: "bullets" },
        expect.any(AbortSignal),
      );

      expect(result).toBe(true); // Indicates async response
    });

    it("should stream tokens to the sender", async () => {
      const chunks = ["Chunk 1", "Chunk 2", "Chunk 3"];
      const mockStream = new ReadableStream({
        async start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          controller.close();
        },
      });
      mockProvider.summarize.mockReturnValue(mockStream);

      const request = {
        type: "SUMMARIZE",
        data: {
          text: "Text to summarize",
          settings: { length: "brief", style: "bullets" },
        },
      };

      await handlers.handleMessage(
        request,
        { tab: { id: 1 } } as any,
        sendResponseSpy,
      );

      // Wait for streaming to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check that tokens were sent
      expect(sendResponseSpy).toHaveBeenCalledWith({
        type: "STREAM_START",
      });

      for (const chunk of chunks) {
        expect(sendResponseSpy).toHaveBeenCalledWith({
          type: "STREAM_TOKEN",
          data: chunk,
        });
      }

      expect(sendResponseSpy).toHaveBeenCalledWith({
        type: "STREAM_COMPLETE",
      });
    });

    it("should handle summarization errors", async () => {
      mockProvider.summarize.mockImplementation(() => {
        throw new Error("API Error");
      });

      const request = {
        type: "SUMMARIZE",
        data: {
          text: "Text to summarize",
          settings: { length: "brief", style: "bullets" },
        },
      };

      await handlers.handleMessage(
        request,
        { tab: { id: 1 } } as any,
        sendResponseSpy,
      );

      expect(sendResponseSpy).toHaveBeenCalledWith({
        type: "ERROR",
        error: "API Error",
      });
    });

    it("should handle missing API key", async () => {
      (SettingsService.getProvider as any).mockResolvedValue(null);

      const request = {
        type: "SUMMARIZE",
        data: {
          text: "Text to summarize",
          settings: { length: "brief", style: "bullets" },
        },
      };

      await handlers.handleMessage(
        request,
        { tab: { id: 1 } } as any,
        sendResponseSpy,
      );

      expect(sendResponseSpy).toHaveBeenCalledWith({
        type: "ERROR",
        error: "No API key configured",
      });
    });
  });

  describe("Cancellation Support", () => {
    it("should handle summarization cancellation", async () => {
      let streamController: any;
      const mockStream = new ReadableStream({
        async start(controller) {
          streamController = controller;
          // Simulate streaming chunks
          for (let i = 0; i < 100; i++) {
            controller.enqueue(`Chunk ${i}`);
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          controller.close();
        },
      });

      mockProvider.summarize.mockImplementation(
        (text: string, params: any, signal?: AbortSignal) => {
          // Listen for abort signal
          if (signal) {
            signal.addEventListener("abort", () => {
              if (streamController) {
                streamController.error(
                  new DOMException("Aborted", "AbortError"),
                );
              }
            });
          }
          return mockStream;
        },
      );

      const request = {
        type: "SUMMARIZE",
        data: {
          text: "Text to summarize",
          settings: { length: "brief", style: "bullets" },
        },
      };

      const messagePromise = handlers.handleMessage(
        request,
        { tab: { id: 1 } } as any,
        sendResponseSpy,
      );

      // Wait for streaming to start
      await new Promise((resolve) => setTimeout(resolve, 20));

      // Send cancellation
      const cancelResponse = vi.fn();
      await handlers.handleMessage(
        { type: "CANCEL_SUMMARIZATION" },
        { tab: { id: 1 } } as any,
        cancelResponse,
      );

      await messagePromise;

      // Check that cancellation was sent
      expect(cancelResponse).toHaveBeenCalledWith({
        type: "STREAM_CANCELLED",
      });
    });
  });

  describe("Settings Updates", () => {
    it("should handle settings update messages", async () => {
      const request = {
        type: "UPDATE_SETTINGS",
        data: {
          openaiApiKey: "sk-new123456789abcdefghijklmnop",
          summarization: { length: "medium", style: "plain" },
        },
      };

      await handlers.handleMessage(
        request,
        { tab: { id: 1 } } as any,
        sendResponseSpy,
      );

      expect(SettingsService.saveSettings).toHaveBeenCalledWith({
        openaiApiKey: "sk-new123456789abcdefghijklmnop",
        summarization: { length: "medium", style: "plain" },
      });

      expect(sendResponseSpy).toHaveBeenCalledWith({
        type: "SETTINGS_UPDATED",
        success: true,
      });
    });

    it("should handle settings update errors", async () => {
      (SettingsService.saveSettings as any).mockRejectedValue(
        new Error("Storage error"),
      );

      const request = {
        type: "UPDATE_SETTINGS",
        data: {
          openaiApiKey: "sk-new123456789abcdefghijklmnop",
        },
      };

      await handlers.handleMessage(
        request,
        { tab: { id: 1 } } as any,
        sendResponseSpy,
      );

      expect(sendResponseSpy).toHaveBeenCalledWith({
        type: "ERROR",
        error: "Storage error",
      });
    });
  });

  describe("API Key Validation", () => {
    it("should handle API key validation request", async () => {
      // Mock OpenAIProvider constructor and validateApiKey method
      const mockValidateApiKey = vi.fn().mockResolvedValue(true);
      vi.mocked(OpenAIProvider).mockImplementation(
        () =>
          ({
            validateApiKey: mockValidateApiKey,
            summarize: vi.fn(),
            summarizeComplete: vi.fn(),
          }) as any,
      );

      const request = {
        type: "VALIDATE_API_KEY",
        data: {
          apiKey: "sk-test123456789abcdefghijklmnop",
        },
      };

      await handlers.handleMessage(
        request,
        { tab: { id: 1 } } as any,
        sendResponseSpy,
      );

      expect(mockValidateApiKey).toHaveBeenCalled();
      expect(sendResponseSpy).toHaveBeenCalledWith({
        type: "API_KEY_VALID",
        valid: true,
      });
    });

    it("should handle invalid API key", async () => {
      // Mock OpenAIProvider constructor and validateApiKey method
      const mockValidateApiKey = vi.fn().mockResolvedValue(false);
      vi.mocked(OpenAIProvider).mockImplementation(
        () =>
          ({
            validateApiKey: mockValidateApiKey,
            summarize: vi.fn(),
            summarizeComplete: vi.fn(),
          }) as any,
      );

      const request = {
        type: "VALIDATE_API_KEY",
        data: {
          apiKey: "invalid-key",
        },
      };

      await handlers.handleMessage(
        request,
        { tab: { id: 1 } } as any,
        sendResponseSpy,
      );

      expect(mockValidateApiKey).toHaveBeenCalled();
      expect(sendResponseSpy).toHaveBeenCalledWith({
        type: "API_KEY_VALID",
        valid: false,
      });
    });
  });

  describe("Get Settings", () => {
    it("should handle get settings request", async () => {
      const mockSettings = {
        openaiApiKey: "sk-test123456789abcdefghijklmnop",
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: true,
      };
      (SettingsService.loadSettings as any).mockResolvedValue(mockSettings);

      const request = {
        type: "GET_SETTINGS",
      };

      await handlers.handleMessage(
        request,
        { tab: { id: 1 } } as any,
        sendResponseSpy,
      );

      expect(sendResponseSpy).toHaveBeenCalledWith({
        type: "SETTINGS",
        data: mockSettings,
      });
    });

    it("should handle get settings error", async () => {
      (SettingsService.loadSettings as any).mockRejectedValue(
        new Error("Load failed"),
      );

      const request = {
        type: "GET_SETTINGS",
      };

      await handlers.handleMessage(
        request,
        { tab: { id: 1 } } as any,
        sendResponseSpy,
      );

      expect(sendResponseSpy).toHaveBeenCalledWith({
        type: "ERROR",
        error: "Load failed",
      });
    });
  });

  describe("Unknown Message Types", () => {
    it("should handle unknown message types gracefully", async () => {
      const request = {
        type: "UNKNOWN_TYPE",
        data: {},
      };

      await handlers.handleMessage(
        request,
        { tab: { id: 1 } } as any,
        sendResponseSpy,
      );

      expect(sendResponseSpy).toHaveBeenCalledWith({
        type: "ERROR",
        error: "Unknown message type: UNKNOWN_TYPE",
      });
    });
  });

  describe("Batch Processing", () => {
    it("should handle multiple simultaneous requests", async () => {
      const mockStream1 = new ReadableStream({
        async start(controller) {
          controller.enqueue("Stream 1");
          controller.close();
        },
      });
      const mockStream2 = new ReadableStream({
        async start(controller) {
          controller.enqueue("Stream 2");
          controller.close();
        },
      });

      mockProvider.summarize
        .mockReturnValueOnce(mockStream1)
        .mockReturnValueOnce(mockStream2);

      const request1 = {
        type: "SUMMARIZE",
        data: {
          text: "Text 1",
          settings: { length: "brief", style: "bullets" },
        },
      };

      const request2 = {
        type: "SUMMARIZE",
        data: {
          text: "Text 2",
          settings: { length: "medium", style: "plain" },
        },
      };

      const sendResponse1 = vi.fn();
      const sendResponse2 = vi.fn();

      // Start both requests
      const promise1 = handlers.handleMessage(
        request1,
        { tab: { id: 1 } } as any,
        sendResponse1,
      );
      const promise2 = handlers.handleMessage(
        request2,
        { tab: { id: 2 } } as any,
        sendResponse2,
      );

      await Promise.all([promise1, promise2]);

      // Both should have been processed
      expect(mockProvider.summarize).toHaveBeenCalledTimes(2);
      expect(sendResponse1).toHaveBeenCalled();
      expect(sendResponse2).toHaveBeenCalled();
    });
  });
});
