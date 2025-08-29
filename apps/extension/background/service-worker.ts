// Service Worker for Briefcase Chrome Extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Briefcase extension installed");
});

// Listen for action button clicks to open side panel
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // Open the side panel for the current tab
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Message passing infrastructure
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log("Message received:", request);

  // Handle different message types
  switch (request.type) {
    case "ping":
      sendResponse({ type: "pong" });
      break;
    default:
      console.log("Unknown message type:", request.type);
  }

  return true; // Keep the message channel open for async responses
});

// Export empty object to make this a module
export {};
