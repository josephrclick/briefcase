// Test constants for API key validation
export const MOCK_API_KEY = "sk-test1234567890abcdefghijklmnopqrstuvwxyz123456";
export const MOCK_API_KEY_ALT =
  "sk-test0987654321zyxwvutsrqponmlkjihgfedcba654321";
export const MOCK_API_KEY_LONG =
  "sk-test1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz";

// Invalid API keys for testing
export const INVALID_API_KEY_SHORT = "sk-test123";
export const INVALID_API_KEY_NO_PREFIX =
  "test1234567890abcdefghijklmnopqrstuvwxyz123456";
export const INVALID_API_KEY_EMPTY = "";
