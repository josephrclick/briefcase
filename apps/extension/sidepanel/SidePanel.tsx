import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { StreamingSummarizer } from "./StreamingSummarizer";
import { EnhancedSettings } from "./EnhancedSettings";
import { SettingsService, SettingsData } from "../lib/settings-service";

interface TabProps {
  id: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const Tab: FunctionalComponent<TabProps> = ({ label, isActive, onClick }) => (
  <button
    role="tab"
    aria-selected={isActive}
    className={`tab ${isActive ? "active" : ""}`}
    onClick={onClick}
  >
    {label}
  </button>
);

interface ExtractedContent {
  text: string;
  charCount: number;
  metadata?: {
    title?: string;
    url?: string;
    extractedAt?: string;
  };
  error?: string;
}

export const SidePanel: FunctionalComponent = () => {
  const [activeTab, setActiveTab] = useState("summarize");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [extractedContent, setExtractedContent] = useState<ExtractedContent>({
    text: "",
    charCount: 0,
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(false);

  useEffect(() => {
    loadSettings();
    extractTextFromCurrentTab();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await SettingsService.loadSettings();
      setSettings(loadedSettings);
      setShowPrivacyBanner(!loadedSettings.privacyBannerDismissed);
    } catch (error) {
      console.error("Failed to load settings:", error);
      // Use default settings
      setSettings({
        openaiApiKey: "",
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: false,
      });
      setShowPrivacyBanner(true);
    }
  };

  const extractTextFromCurrentTab = async () => {
    setIsExtracting(true);
    try {
      // Get the active tab
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs?.[0];

      if (!activeTab?.id) {
        throw new Error("No active tab found");
      }

      // Check if URL is accessible
      if (
        activeTab.url?.startsWith("chrome://") ||
        activeTab.url?.startsWith("chrome-extension://") ||
        activeTab.url?.startsWith("edge://") ||
        activeTab.url?.startsWith("about:")
      ) {
        throw new Error("Cannot extract text from this page");
      }

      // Send message to content script to extract text
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        type: "EXTRACT_TEXT",
      });

      if (response?.success && response.text) {
        setExtractedContent({
          text: response.text,
          charCount: response.text.length,
          metadata: response.metadata,
        });
      } else {
        throw new Error(response?.error || "Failed to extract text");
      }
    } catch (error: any) {
      console.error("Text extraction failed:", error);
      setExtractedContent({
        text: "",
        charCount: 0,
        error: error.message || "Failed to extract text from page",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDismissPrivacyBanner = async () => {
    setShowPrivacyBanner(false);
    await SettingsService.saveSettings({ privacyBannerDismissed: true });
  };

  const handleSettingsUpdate = async () => {
    // Reload settings after they've been updated
    await loadSettings();
  };

  const handleRefresh = () => {
    extractTextFromCurrentTab();
  };

  return (
    <div className="side-panel">
      {showPrivacyBanner && (
        <div className="privacy-banner">
          <h3>🔒 Privacy First</h3>
          <p>
            Your data is stored locally on your device. API calls go directly to
            OpenAI - we never see or store your content.
          </p>
          <button
            onClick={handleDismissPrivacyBanner}
            className="dismiss-button"
          >
            Got it
          </button>
        </div>
      )}

      <div className="tabs" role="tablist">
        <Tab
          id="summarize"
          label="Summarize"
          isActive={activeTab === "summarize"}
          onClick={() => setActiveTab("summarize")}
        />
        <Tab
          id="settings"
          label="Settings"
          isActive={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        />
      </div>

      <div className="tab-content">
        {activeTab === "summarize" && (
          <div role="tabpanel" aria-label="Summarize">
            {isExtracting ? (
              <div className="extracting-status">
                <div className="spinner" />
                <p>Extracting text from page...</p>
              </div>
            ) : extractedContent.error ? (
              <div className="extraction-error">
                <p className="error-message">{extractedContent.error}</p>
                <button onClick={handleRefresh} className="retry-button">
                  Try Again
                </button>
              </div>
            ) : (
              <StreamingSummarizer
                extractedText={extractedContent.text}
                charCount={extractedContent.charCount}
              />
            )}

            {!settings?.openaiApiKey && !extractedContent.error && (
              <div className="setup-prompt">
                <p>
                  To use the summarization feature, please configure your OpenAI
                  API key in Settings.
                </p>
                <button
                  onClick={() => setActiveTab("settings")}
                  className="settings-link primary"
                >
                  Go to Settings
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div role="tabpanel" aria-label="Settings">
            <EnhancedSettings onSettingsUpdate={handleSettingsUpdate} />
          </div>
        )}
      </div>
    </div>
  );
};
