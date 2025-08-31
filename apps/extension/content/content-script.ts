import { ContentExtractor } from "./extractor";
import { DOMStabilityDetector } from "./dom-stability";

interface ContentMessage {
  type: "EXTRACT_CONTENT" | "MANUAL_SELECTION";
  payload?: {
    text?: string;
    metadata?: any;
    method?: string;
    error?: string;
  };
}

export class ContentScript {
  private extractor = new ContentExtractor();
  private stabilityDetector = new DOMStabilityDetector();
  private selectionHandler: ((text: string) => void) | null = null;

  async init() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "EXTRACT_CONTENT") {
        this.handleExtraction().then(sendResponse);
        return true;
      } else if (request.action === "ENABLE_SELECTION") {
        this.enableManualSelection();
        sendResponse({ success: true });
      }
      return false;
    });
  }

  private async handleExtraction(): Promise<ContentMessage> {
    try {
      if (this.isUnsupportedPage()) {
        return {
          type: "EXTRACT_CONTENT",
          payload: {
            error: "Unsupported page type (PDF, iframe, or app)",
          },
        };
      }

      await this.stabilityDetector.waitForStability(document);

      const result = this.extractor.extract(document);

      if (!result.success) {
        return {
          type: "EXTRACT_CONTENT",
          payload: {
            error: result.error || "Extraction failed",
          },
        };
      }

      const metadata = {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        method: result.method,
        ...result.metadata,
      };

      return {
        type: "EXTRACT_CONTENT",
        payload: {
          text: result.content?.text,
          metadata,
          method: result.method,
        },
      };
    } catch (error) {
      return {
        type: "EXTRACT_CONTENT",
        payload: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  private enableManualSelection() {
    if (this.selectionHandler) {
      document.removeEventListener("mouseup", this.handleSelection);
    }

    this.selectionHandler = this.handleSelection.bind(this);
    document.addEventListener("mouseup", this.selectionHandler);

    this.showSelectionIndicator();
  }

  private handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();

    if (text.length < 100) {
      this.showTooltip("Please select at least 100 characters");
      return;
    }

    chrome.runtime.sendMessage({
      type: "MANUAL_SELECTION",
      payload: {
        text,
        metadata: {
          url: window.location.href,
          timestamp: new Date().toISOString(),
          method: "manual",
        },
      },
    });

    selection.removeAllRanges();
    this.showTooltip("Content captured!");
  };

  private showSelectionIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "briefcase-selection-indicator";
    indicator.textContent = "Selection mode active - highlight text to capture";
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(indicator);

    setTimeout(() => indicator.remove(), 5000);
  }

  private showTooltip(message: string) {
    const tooltip = document.createElement("div");
    tooltip.textContent = message;
    tooltip.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 14px;
      z-index: 10000;
    `;
    document.body.appendChild(tooltip);

    setTimeout(() => tooltip.remove(), 3000);
  }

  private isUnsupportedPage(): boolean {
    if (window.location.href.endsWith(".pdf")) return true;

    if (window.self !== window.top) return true;

    const contentType = document.contentType || "";
    if (contentType.includes("pdf")) return true;

    return false;
  }
}

const contentScript = new ContentScript();
contentScript.init();
