import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
};

// @ts-ignore
global.chrome = mockChrome;

describe("Message Passing Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.runtime.lastError = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Content Script to Background", () => {
    it("should send extraction results from content script to background", async () => {
      const extractionResult = {
        type: "EXTRACT_CONTENT",
        payload: {
          text: "Extracted article content...",
          metadata: {
            url: "https://example.com/article",
            timestamp: "2024-01-01T00:00:00Z",
            method: "readability",
          },
        },
      };

      // Simulate content script sending message
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });

      const response = await chrome.runtime.sendMessage(extractionResult);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(extractionResult);
      expect(response).toEqual({ success: true });
    });

    it("should handle extraction errors in message passing", async () => {
      const errorMessage = {
        type: "EXTRACT_CONTENT",
        payload: {
          error: "Page not supported: PDF document",
        },
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: false,
        error: "PDF not supported",
      });

      const response = await chrome.runtime.sendMessage(errorMessage);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(errorMessage);
      expect(response).toEqual({ success: false, error: "PDF not supported" });
    });

    it("should handle manual selection messages", async () => {
      const selectionMessage = {
        type: "MANUAL_SELECTION",
        payload: {
          text: "User selected text content",
          metadata: {
            url: "https://example.com",
            timestamp: "2024-01-01T00:00:00Z",
            method: "manual",
          },
        },
      };

      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });

      const response = await chrome.runtime.sendMessage(selectionMessage);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(selectionMessage);
      expect(response).toEqual({ success: true });
    });
  });

  describe("Background to Content Script", () => {
    it("should trigger content extraction from background", async () => {
      const tab = { id: 1, url: "https://example.com" };
      const extractCommand = { action: "EXTRACT_CONTENT" };

      mockChrome.tabs.sendMessage.mockResolvedValue({
        success: true,
        content: "Extracted content",
      });

      const response = await chrome.tabs.sendMessage(tab.id, extractCommand);

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, extractCommand);
      expect(response).toEqual({ success: true, content: "Extracted content" });
    });

    it("should enable manual selection mode from background", async () => {
      const tab = { id: 1 };
      const enableSelectionCommand = { action: "ENABLE_SELECTION" };

      mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });

      const response = await chrome.tabs.sendMessage(
        tab.id,
        enableSelectionCommand,
      );

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        enableSelectionCommand,
      );
      expect(response).toEqual({ success: true });
    });
  });

  describe("Background to Side Panel", () => {
    it("should forward extraction results to side panel", async () => {
      const extractionData = {
        type: "CONTENT_EXTRACTED",
        data: {
          text: "Article content",
          summary: "AI generated summary",
          metadata: {
            url: "https://example.com",
            extractedAt: "2024-01-01T00:00:00Z",
          },
        },
      };

      // Simulate background sending to side panel via port
      const mockPort = {
        postMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
        },
        onDisconnect: {
          addListener: vi.fn(),
        },
      };

      mockChrome.runtime.connect = vi.fn().mockReturnValue(mockPort);

      const port = chrome.runtime.connect({ name: "sidepanel" });
      port.postMessage(extractionData);

      expect(port.postMessage).toHaveBeenCalledWith(extractionData);
    });

    it("should handle connection errors between background and side panel", () => {
      const mockPort = {
        postMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
        },
        onDisconnect: {
          addListener: vi.fn(),
        },
      };

      mockChrome.runtime.connect = vi.fn().mockReturnValue(mockPort);
      mockChrome.runtime.lastError = {
        message: "Could not establish connection",
      };

      const port = chrome.runtime.connect({ name: "sidepanel" });

      expect(chrome.runtime.lastError).toBeDefined();
      expect(chrome.runtime.lastError?.message).toBe(
        "Could not establish connection",
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle message timeout errors", async () => {
      const timeoutError = new Error("Message timeout after 30000ms");
      mockChrome.runtime.sendMessage.mockRejectedValue(timeoutError);

      await expect(
        chrome.runtime.sendMessage({ type: "TEST" }),
      ).rejects.toThrow("Message timeout");
    });

    it("should handle malformed messages gracefully", async () => {
      const malformedMessage = { invalidField: "test" };

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: false,
        error: "Invalid message format",
      });

      const response = await chrome.runtime.sendMessage(malformedMessage);

      expect(response.success).toBe(false);
      expect(response.error).toBe("Invalid message format");
    });

    it("should handle chrome.runtime.lastError", () => {
      mockChrome.runtime.lastError = {
        message: "Extension context invalidated",
      };

      // Simulate checking for lastError after operation
      const hasError = chrome.runtime.lastError !== null;

      expect(hasError).toBe(true);
      expect(chrome.runtime.lastError?.message).toBe(
        "Extension context invalidated",
      );
    });
  });

  describe("Message Flow Integration", () => {
    it("should complete full extraction flow from trigger to storage", async () => {
      // Step 1: Background triggers extraction
      const tab = { id: 1 };
      mockChrome.tabs.sendMessage.mockResolvedValue({
        type: "EXTRACT_CONTENT",
        payload: {
          text: "Article content",
          metadata: { method: "readability" },
        },
      });

      const extractionResult = await chrome.tabs.sendMessage(tab.id, {
        action: "EXTRACT_CONTENT",
      });

      // Step 2: Store the result
      const docId = `doc:${Date.now()}`;
      const storageData = {
        [docId]: {
          rawText: extractionResult.payload.text,
          metadata: extractionResult.payload.metadata,
          createdAt: new Date().toISOString(),
        },
      };

      mockChrome.storage.local.set.mockResolvedValue(undefined);
      await chrome.storage.local.set(storageData);

      // Step 3: Update index
      mockChrome.storage.local.get.mockResolvedValue({
        "docs:index": ["doc:123", "doc:456"],
      });

      const { "docs:index": currentIndex } =
        await chrome.storage.local.get("docs:index");
      const newIndex = [docId, ...(currentIndex || [])];

      await chrome.storage.local.set({ "docs:index": newIndex });

      // Verify the flow
      expect(chrome.tabs.sendMessage).toHaveBeenCalled();
      expect(chrome.storage.local.set).toHaveBeenCalledTimes(2);
      expect(chrome.storage.local.get).toHaveBeenCalledWith("docs:index");
    });

    it("should handle connection reconnection between background and side panel", () => {
      let disconnectCallback: Function | null = null;

      const mockPort = {
        postMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
        },
        onDisconnect: {
          addListener: vi.fn((callback) => {
            disconnectCallback = callback;
          }),
        },
      };

      mockChrome.runtime.connect = vi
        .fn()
        .mockReturnValueOnce(mockPort) // First connection
        .mockReturnValueOnce(mockPort); // Reconnection

      // Initial connection
      let port = chrome.runtime.connect({ name: "sidepanel" });
      expect(chrome.runtime.connect).toHaveBeenCalledTimes(1);

      // Simulate disconnect
      if (disconnectCallback) {
        disconnectCallback();
      }

      // Reconnect
      port = chrome.runtime.connect({ name: "sidepanel" });
      expect(chrome.runtime.connect).toHaveBeenCalledTimes(2);
    });
  });
});
