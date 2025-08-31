import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import { StreamingSummarizer } from "./StreamingSummarizer";
import { EnhancedSettings } from "./EnhancedSettings";
import { SettingsService, SettingsData } from "../lib/settings-service";
import { DocumentRepository, Document } from "../lib/document-repository";

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
  const [documentRepository] = useState(() => new DocumentRepository());

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
        action: "EXTRACT_CONTENT",
      });

      if (response?.type === "EXTRACT_CONTENT" && response.payload?.text) {
        setExtractedContent({
          text: response.payload.text,
          charCount: response.payload.text.length,
          metadata: response.payload.metadata,
        });
      } else {
        throw new Error(response?.payload?.error || "Failed to extract text");
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

  const handleSummarizationComplete = async (summaryText: string) => {
    try {
      // Get current tab URL for document
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs?.[0];

      // Extract domain from URL
      let domain = "";
      if (activeTab?.url) {
        try {
          const url = new URL(activeTab.url);
          domain = url.hostname;
        } catch {}
      }

      // Create document object
      const document: Document = {
        id: Date.now().toString(),
        url: activeTab?.url || extractedContent.metadata?.url || "",
        title:
          activeTab?.title || extractedContent.metadata?.title || "Untitled",
        domain: domain,
        rawText: extractedContent.text,
        summaryText: summaryText,
        metadata: {
          author: extractedContent.metadata?.author,
          publishedDate: extractedContent.metadata?.publishedDate,
          wordCount:
            extractedContent.metadata?.wordCount ||
            Math.round(extractedContent.text.split(/\s+/).length),
        },
        createdAt: new Date().toISOString(),
        summarizedAt: new Date().toISOString(),
      };

      // Save document to storage
      await documentRepository.saveDocument(document);
      console.log("Document saved successfully");
    } catch (error) {
      console.error("Failed to save document:", error);
      // Don't show error to user - summary is still displayed
    }
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
                onSummarizationComplete={handleSummarizationComplete}
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
