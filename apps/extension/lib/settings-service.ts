import { OpenAIProvider } from "./openai-provider";

export interface SummarizationSettings {
  length: "brief" | "medium";
  style: "bullets" | "plain";
}

export interface SettingsData {
  openaiApiKey: string;
  summarization: SummarizationSettings;
  privacyBannerDismissed: boolean;
}

export const DEFAULT_SETTINGS: SettingsData = {
  openaiApiKey: "",
  summarization: {
    length: "brief",
    style: "bullets",
  },
  privacyBannerDismissed: false,
};

export class SettingsService {
  private static STORAGE_KEY = "settings";

  /**
   * Load settings from chrome.storage.local
   */
  static async loadSettings(): Promise<SettingsData> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      if (result && result[this.STORAGE_KEY]) {
        // Merge with defaults to ensure all fields exist
        return { ...DEFAULT_SETTINGS, ...result[this.STORAGE_KEY] };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error("Failed to load settings:", error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save settings to chrome.storage.local
   */
  static async saveSettings(settings: Partial<SettingsData>): Promise<void> {
    const currentSettings = await this.loadSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await chrome.storage.local.set({ [this.STORAGE_KEY]: updatedSettings });
  }

  /**
   * Update only the API key
   */
  static async saveApiKey(apiKey: string): Promise<void> {
    await this.saveSettings({ openaiApiKey: apiKey });
  }

  /**
   * Update summarization preferences
   */
  static async saveSummarizationSettings(
    settings: SummarizationSettings,
  ): Promise<void> {
    await this.saveSettings({ summarization: settings });
  }

  /**
   * Dismiss the privacy banner
   */
  static async dismissPrivacyBanner(): Promise<void> {
    await this.saveSettings({ privacyBannerDismissed: true });
  }

  /**
   * Validate an API key format
   */
  static validateApiKeyFormat(apiKey: string): boolean {
    // OpenAI API keys start with 'sk-' and have at least 20 characters
    return /^sk-[A-Za-z0-9-]{20,}$/.test(apiKey);
  }

  /**
   * Test the API key with OpenAI
   */
  static async testApiKey(
    apiKey: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.validateApiKeyFormat(apiKey)) {
      return { success: false, error: "Invalid API key format" };
    }

    try {
      const provider = new OpenAIProvider(apiKey);
      const isValid = await provider.validateApiKey();

      if (isValid) {
        return { success: true };
      } else {
        return { success: false, error: "Invalid API key" };
      }
    } catch (error: any) {
      if (error?.status === 429) {
        return {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
        };
      }
      if (error?.message) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "Failed to validate API key" };
    }
  }

  /**
   * Clear all settings data
   */
  static async clearAllData(): Promise<void> {
    await chrome.storage.local.clear();
  }

  /**
   * Get a configured OpenAI provider instance
   */
  static async getProvider(): Promise<OpenAIProvider | null> {
    const settings = await this.loadSettings();
    if (!settings.openaiApiKey) {
      return null;
    }
    return new OpenAIProvider(settings.openaiApiKey);
  }
}
