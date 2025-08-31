import { describe, it, expect, beforeEach, vi } from "vitest";
import { SettingsService, DEFAULT_SETTINGS } from "./settings-service";
import { OpenAIProvider } from "./openai-provider";
import {
  MOCK_API_KEY,
  MOCK_API_KEY_ALT,
  INVALID_API_KEY_SHORT,
  INVALID_API_KEY_NO_PREFIX,
} from "../src/test-utils/constants";

vi.mock("./openai-provider");

describe("SettingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (chrome.storage.local.get as any).mockResolvedValue({});
    (chrome.storage.local.set as any).mockResolvedValue(undefined);
    (chrome.storage.local.clear as any).mockResolvedValue(undefined);
  });

  describe("loadSettings", () => {
    it("should return default settings when storage is empty", async () => {
      const settings = await SettingsService.loadSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it("should load settings from storage", async () => {
      const storedSettings = {
        openaiApiKey: MOCK_API_KEY,
        summarization: { length: "medium", style: "plain" },
        privacyBannerDismissed: true,
      };
      (chrome.storage.local.get as any).mockResolvedValue({
        settings: storedSettings,
      });

      const settings = await SettingsService.loadSettings();
      expect(settings).toEqual(storedSettings);
    });

    it("should merge with defaults when some fields are missing", async () => {
      const partialSettings = {
        openaiApiKey: MOCK_API_KEY,
      };
      (chrome.storage.local.get as any).mockResolvedValue({
        settings: partialSettings,
      });

      const settings = await SettingsService.loadSettings();
      expect(settings).toEqual({
        ...DEFAULT_SETTINGS,
        ...partialSettings,
      });
    });

    it("should handle storage errors gracefully", async () => {
      (chrome.storage.local.get as any).mockRejectedValue(
        new Error("Storage error"),
      );

      const settings = await SettingsService.loadSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe("saveSettings", () => {
    it("should save full settings object", async () => {
      const newSettings = {
        openaiApiKey: MOCK_API_KEY_ALT,
        summarization: { length: "medium" as const, style: "plain" as const },
        privacyBannerDismissed: true,
      };

      await SettingsService.saveSettings(newSettings);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        settings: newSettings,
      });
    });

    it("should merge with existing settings when saving partial data", async () => {
      const existingSettings = {
        openaiApiKey: MOCK_API_KEY,
        summarization: { length: "brief" as const, style: "bullets" as const },
        privacyBannerDismissed: false,
      };
      (chrome.storage.local.get as any).mockResolvedValue({
        settings: existingSettings,
      });

      await SettingsService.saveSettings({
        openaiApiKey: MOCK_API_KEY_ALT,
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        settings: {
          ...existingSettings,
          openaiApiKey: MOCK_API_KEY_ALT,
        },
      });
    });
  });

  describe("saveApiKey", () => {
    it("should save only the API key", async () => {
      const existingSettings = {
        ...DEFAULT_SETTINGS,
        privacyBannerDismissed: true,
      };
      (chrome.storage.local.get as any).mockResolvedValue({
        settings: existingSettings,
      });

      await SettingsService.saveApiKey(MOCK_API_KEY);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        settings: {
          ...existingSettings,
          openaiApiKey: MOCK_API_KEY,
        },
      });
    });
  });

  describe("saveSummarizationSettings", () => {
    it("should save summarization preferences", async () => {
      const newSummarizationSettings = {
        length: "medium" as const,
        style: "plain" as const,
      };

      await SettingsService.saveSummarizationSettings(newSummarizationSettings);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        settings: expect.objectContaining({
          summarization: newSummarizationSettings,
        }),
      });
    });
  });

  describe("dismissPrivacyBanner", () => {
    it("should set privacyBannerDismissed to true", async () => {
      await SettingsService.dismissPrivacyBanner();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        settings: expect.objectContaining({
          privacyBannerDismissed: true,
        }),
      });
    });
  });

  describe("validateApiKeyFormat", () => {
    it("should validate correct API key format", () => {
      expect(SettingsService.validateApiKeyFormat(MOCK_API_KEY)).toBe(true);
      expect(SettingsService.validateApiKeyFormat(MOCK_API_KEY_ALT)).toBe(true);
    });

    it("should reject invalid API key formats", () => {
      expect(SettingsService.validateApiKeyFormat("")).toBe(false);
      expect(SettingsService.validateApiKeyFormat("invalid")).toBe(false);
      expect(SettingsService.validateApiKeyFormat(INVALID_API_KEY_SHORT)).toBe(
        false,
      );
      expect(
        SettingsService.validateApiKeyFormat(INVALID_API_KEY_NO_PREFIX),
      ).toBe(false);
    });
  });

  describe("testApiKey", () => {
    it("should return success for valid API key", async () => {
      const mockProvider = {
        validateApiKey: vi.fn().mockResolvedValue(true),
      };
      (OpenAIProvider as any).mockImplementation(() => mockProvider);

      const result = await SettingsService.testApiKey(MOCK_API_KEY);

      expect(result).toEqual({ success: true });
      expect(mockProvider.validateApiKey).toHaveBeenCalled();
    });

    it("should return error for invalid API key format", async () => {
      const result = await SettingsService.testApiKey("invalid-key");

      expect(result).toEqual({
        success: false,
        error: "Invalid API key format",
      });
      expect(OpenAIProvider).not.toHaveBeenCalled();
    });

    it("should return error when API key validation fails", async () => {
      const mockProvider = {
        validateApiKey: vi.fn().mockResolvedValue(false),
      };
      (OpenAIProvider as any).mockImplementation(() => mockProvider);

      const result = await SettingsService.testApiKey(MOCK_API_KEY);

      expect(result).toEqual({
        success: false,
        error: "Invalid API key",
      });
    });

    it("should handle rate limiting errors", async () => {
      const error = new Error("Rate limit exceeded");
      (error as any).status = 429;
      const mockProvider = {
        validateApiKey: vi.fn().mockRejectedValue(error),
      };
      (OpenAIProvider as any).mockImplementation(() => mockProvider);

      const result = await SettingsService.testApiKey(MOCK_API_KEY);

      expect(result).toEqual({
        success: false,
        error: "Rate limit exceeded. Please try again later.",
      });
    });

    it("should handle generic errors", async () => {
      const mockProvider = {
        validateApiKey: vi.fn().mockRejectedValue(new Error("Network error")),
      };
      (OpenAIProvider as any).mockImplementation(() => mockProvider);

      const result = await SettingsService.testApiKey(MOCK_API_KEY);

      expect(result).toEqual({
        success: false,
        error: "Network error",
      });
    });
  });

  describe("clearAllData", () => {
    it("should call chrome.storage.local.clear", async () => {
      await SettingsService.clearAllData();
      expect(chrome.storage.local.clear).toHaveBeenCalled();
    });
  });

  describe("getProvider", () => {
    it("should return configured provider when API key exists", async () => {
      const apiKey = MOCK_API_KEY;
      (chrome.storage.local.get as any).mockResolvedValue({
        settings: { openaiApiKey: apiKey },
      });

      const mockProvider = {} as OpenAIProvider;
      (OpenAIProvider as any).mockImplementation(() => mockProvider);

      const provider = await SettingsService.getProvider();

      expect(provider).toBe(mockProvider);
      expect(OpenAIProvider).toHaveBeenCalledWith(apiKey);
    });

    it("should return null when no API key is set", async () => {
      (chrome.storage.local.get as any).mockResolvedValue({
        settings: { openaiApiKey: "" },
      });

      const provider = await SettingsService.getProvider();

      expect(provider).toBeNull();
      expect(OpenAIProvider).not.toHaveBeenCalled();
    });
  });
});
