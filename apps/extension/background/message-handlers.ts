import { SettingsService, Settings } from "../lib/settings-service";
import { OpenAIProvider } from "../lib/openai-provider";

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
    for (const [tabId, controller] of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();
    this.activeStreams.clear();
  }

  private handleMessageWrapper(
    message: Message,
    sender: MessageSender,
    sendResponse: (response: any) => void,
  ): boolean | undefined {
    // Handle async messages
    this.handleMessage(message, sender, sendResponse).catch((error) => {
      console.error("Message handler error:", error);
      sendResponse({
        type: "ERROR",
        error: error.message || "Unknown error",
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
      }

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
          const { done, value } = await reader.read();

          if (done) {
            sendResponse({ type: "STREAM_COMPLETE" });
            break;
          }

          if (value) {
            sendResponse({
              type: "STREAM_TOKEN",
              data: value,
            });
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
        this.abortControllers.delete(tabId);
        this.activeStreams.delete(tabId);
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
    data: Partial<Settings>,
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
      const provider = new OpenAIProvider(data.apiKey);
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
