import { MessageHandlers } from "./message-handlers";

// Initialize message handlers
const messageHandlers = new MessageHandlers();

// Clean up on extension unload
chrome.runtime.onSuspend?.addListener(() => {
  messageHandlers.cleanup();
});

// Log that background script is ready
console.log("Briefcase background script initialized");

// Export for testing
export { messageHandlers };
