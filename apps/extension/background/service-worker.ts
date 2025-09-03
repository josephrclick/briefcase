// Service Worker for Briefcase Chrome Extension

import { ExtensionResponse, isExtensionMessage } from "../lib/types";

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  try {
    console.log("Briefcase extension installed");
  } catch (error) {
    console.error("Error during extension installation:", error);
  }
});

// Listen for action button clicks to open side panel
chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (tab.id) {
      // Open the side panel for the current tab
      await chrome.sidePanel.open({ tabId: tab.id });
      console.log(`Side panel opened for tab ${tab.id}`);
    } else {
      console.warn("Cannot open side panel: tab.id is undefined");
    }
  } catch (error) {
    console.error("Error opening side panel:", error);
    // Could notify user via badge or notification in future
  }
});

// Message passing infrastructure with error handling
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  // Wrap in async function for better error handling
  (async () => {
    try {
      // Validate message format
      if (!isExtensionMessage(request)) {
        const errorResponse: ExtensionResponse = {
          success: false,
          error: "Invalid message format",
        };
        sendResponse(errorResponse);
        return;
      }

      console.log("Message received:", request);

      // Handle different message types
      switch (request.type) {
        case "ping":
          sendResponse({
            success: true,
            data: { type: "pong" },
          } as ExtensionResponse);
          break;

        case "extractContent":
          // Placeholder for future content extraction
          sendResponse({
            success: false,
            error: "Content extraction not yet implemented",
          } as ExtensionResponse);
          break;

        case "summarize":
          // Placeholder for future summarization
          sendResponse({
            success: false,
            error: "Summarization not yet implemented",
          } as ExtensionResponse);
          break;

        default:
          console.warn("Unknown message type:", request.type);
          sendResponse({
            success: false,
            error: `Unknown message type: ${request.type}`,
          } as ExtensionResponse);
      }
    } catch (error) {
      console.error("Error handling message:", error);

      // Sanitize error message to prevent leaking sensitive information
      let safeErrorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        safeErrorMessage = error.message
          .replace(/sk-[A-Za-z0-9_\-\.]+/g, "sk-***") // OpenAI API keys
          .replace(/Bearer [A-Za-z0-9_\-\.]+/g, "Bearer ***") // Bearer tokens
          .replace(/apiKey"?:\s*"[^"]+"/g, 'apiKey: "***"') // API key in JSON
          .replace(
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            "***@***.***",
          ); // Email addresses

        // Limit error message length
        if (safeErrorMessage.length > 200) {
          safeErrorMessage = safeErrorMessage.substring(0, 197) + "...";
        }
      }

      const errorResponse: ExtensionResponse = {
        success: false,
        error: safeErrorMessage,
      };
      sendResponse(errorResponse);
    }
  })();

  return true; // Keep the message channel open for async responses
});

// Global error handler for uncaught errors
self.addEventListener("error", (event) => {
  console.error("Uncaught error in service worker:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection in service worker:", event.reason);
});

// Export empty object to make this a module
export {};
