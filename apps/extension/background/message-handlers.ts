import { SettingsService, SettingsData } from "../lib/settings-service";
import { LazyOpenAIProvider } from "../lib/openai-provider-lazy";

export interface Message {
  type: string;
  data?: any;
}

export interface MessageSender {
  tab?: chrome.tabs.Tab;
  frameId?: number;
  id?: string;
  url?: string;
  tlsChannelId?: string;
}

export class MessageHandlers {
  private abortControllers: Map<number, AbortController> = new Map();
  private activeStreams: Map<number, ReadableStreamDefaultReader<string>> =
    new Map();
  // Track request IDs to handle concurrent requests properly
  private requestIds: Map<number, string> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize() {
    chrome.runtime.onMessage.addListener(this.handleMessageWrapper.bind(this));
  }

  cleanup() {
    chrome.runtime.onMessage.removeListener(
      this.handleMessageWrapper.bind(this),
    );

    // Cancel all active streams
    for (const [, controller] of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();
    this.activeStreams.clear();
    this.requestIds.clear();
  }

  private handleMessageWrapper(
    message: Message,
    sender: MessageSender,
    sendResponse: (response: any) => void,
  ): boolean | undefined {
    // Handle async messages
    this.handleMessage(message, sender, sendResponse).catch((error) => {
      console.error("Message handler error:", error);

      // Sanitize error message to prevent leaking sensitive information
      let safeErrorMessage = "Unknown error";
      if (error instanceof Error) {
        // Remove any API keys or sensitive patterns from error messages
        safeErrorMessage = error.message
          .replace(/sk-[A-Za-z0-9_\-\.]+/g, "sk-***") // OpenAI API keys
          .replace(/Bearer [A-Za-z0-9_\-\.]+/g, "Bearer ***") // Bearer tokens
          .replace(/apiKey"?:\s*"[^"]+"/g, 'apiKey: "***"') // API key in JSON
          .replace(
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            "***@***.***",
          ); // Email addresses

        // Limit error message length to prevent overly verbose errors
        if (safeErrorMessage.length > 200) {
          safeErrorMessage = safeErrorMessage.substring(0, 197) + "...";
        }
      }

      sendResponse({
        type: "ERROR",
        error: safeErrorMessage,
      });
    });

    // Return true to indicate async response
    return true;
  }

  async handleMessage(
    message: Message,
    sender: MessageSender,
    sendResponse: (response: any) => void,
  ): Promise<boolean> {
    const tabId = sender.tab?.id || 0;

    switch (message.type) {
      case "SUMMARIZE":
        await this.handleSummarize(message.data, tabId, sendResponse);
        break;

      case "CANCEL_SUMMARIZATION":
        this.handleCancelSummarization(tabId, sendResponse);
        break;

      case "UPDATE_SETTINGS":
        await this.handleUpdateSettings(message.data, sendResponse);
        break;

      case "GET_SETTINGS":
        await this.handleGetSettings(sendResponse);
        break;

      case "VALIDATE_API_KEY":
        await this.handleValidateApiKey(message.data, sendResponse);
        break;

      default:
        sendResponse({
          type: "ERROR",
          error: `Unknown message type: ${message.type}`,
        });
        break;
    }

    return true;
  }

  private async handleSummarize(
    data: { text: string; settings: any },
    tabId: number,
    sendResponse: (response: any) => void,
  ) {
    // Generate unique request ID to handle concurrent requests
    const requestId = `${tabId}-${Date.now()}-${Math.random()}`;

    try {
      const provider = await SettingsService.getProvider();

      if (!provider) {
        sendResponse({
          type: "ERROR",
          error: "No API key configured",
        });
        return;
      }

      // Cancel any existing summarization for this tab
      const existingController = this.abortControllers.get(tabId);
      if (existingController) {
        existingController.abort();
        // Wait for cleanup to complete to avoid race conditions
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Store the new request ID
      this.requestIds.set(tabId, requestId);

      // Create new abort controller
      const abortController = new AbortController();
      this.abortControllers.set(tabId, abortController);

      try {
        const stream = provider.summarize(
          data.text,
          data.settings,
          abortController.signal,
        );

        // Check if stream is valid
        if (!stream || typeof stream.getReader !== "function") {
          throw new Error("Invalid stream returned from provider");
        }

        // Start streaming
        sendResponse({ type: "STREAM_START" });

        const reader = stream.getReader();
        this.activeStreams.set(tabId, reader);

        while (true) {
          // Check if this request is still the active one for this tab
          if (this.requestIds.get(tabId) !== requestId) {
            // This request has been superseded, clean up and exit
            reader.cancel();
            break;
          }

          const { done, value } = await reader.read();

          if (done) {
            // Only send complete if this is still the active request
            if (this.requestIds.get(tabId) === requestId) {
              sendResponse({ type: "STREAM_COMPLETE" });
            }
            break;
          }

          if (value) {
            // Only send tokens if this is still the active request
            if (this.requestIds.get(tabId) === requestId) {
              sendResponse({
                type: "STREAM_TOKEN",
                data: value,
              });
            }
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          sendResponse({ type: "STREAM_CANCELLED" });
        } else {
          sendResponse({
            type: "ERROR",
            error: error.message || "Stream error",
          });
        }
      } finally {
        // Only clean up if this is still the active request for this tab
        if (this.requestIds.get(tabId) === requestId) {
          this.abortControllers.delete(tabId);
          this.activeStreams.delete(tabId);
          this.requestIds.delete(tabId);
        }
      }
    } catch (error: any) {
      sendResponse({
        type: "ERROR",
        error: error.message || "Failed to summarize",
      });
    }
  }

  private handleCancelSummarization(
    tabId: number,
    sendResponse: (response: any) => void,
  ) {
    const controller = this.abortControllers.get(tabId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(tabId);
    }

    const stream = this.activeStreams.get(tabId);
    if (stream) {
      stream.cancel();
      this.activeStreams.delete(tabId);
    }

    sendResponse({ type: "STREAM_CANCELLED" });
  }

  private async handleUpdateSettings(
    data: Partial<SettingsData>,
    sendResponse: (response: any) => void,
  ) {
    try {
      await SettingsService.saveSettings(data);
      sendResponse({
        type: "SETTINGS_UPDATED",
        success: true,
      });
    } catch (error: any) {
      sendResponse({
        type: "ERROR",
        error: error.message || "Failed to update settings",
      });
    }
  }

  private async handleGetSettings(sendResponse: (response: any) => void) {
    try {
      const settings = await SettingsService.loadSettings();
      sendResponse({
        type: "SETTINGS",
        data: settings,
      });
    } catch (error: any) {
      sendResponse({
        type: "ERROR",
        error: error.message || "Failed to load settings",
      });
    }
  }

  private async handleValidateApiKey(
    data: { apiKey: string },
    sendResponse: (response: any) => void,
  ) {
    try {
      const provider = new LazyOpenAIProvider(data.apiKey);
      const valid = await provider.validateApiKey();
      sendResponse({
        type: "API_KEY_VALID",
        valid,
      });
    } catch (error: any) {
      sendResponse({
        type: "ERROR",
        error: error.message || "Failed to validate API key",
      });
    }
  }
}
