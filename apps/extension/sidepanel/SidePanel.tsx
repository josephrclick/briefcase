import { FunctionalComponent } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { StreamingSummarizer } from "./StreamingSummarizer";
import { EnhancedSettings } from "./EnhancedSettings";
import { RecentList } from "./RecentList";
import { DocumentViewer } from "./DocumentViewer";

// DocumentViewer expects this format
interface ViewerDocument {
  id: string;
  title: string;
  domain: string;
  date: string;
  rawText?: string;
  summary?: {
    keyPoints: string[];
    tldr: string;
  };
}
import {
  SettingsService,
  SettingsData,
  SummarizationSettings,
  ThemePreference,
} from "../lib/settings-service";
import {
  DocumentRepository,
  Document,
  extractDomain,
} from "../lib/document-repository";

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
    author?: string;
    publishedDate?: string;
    wordCount?: number;
  };
  error?: string;
  showRefreshButton?: boolean;
}

type UIState = "idle" | "extracting" | "extracted" | "error";

interface TabInfo {
  url: string;
  title: string;
  domain: string;
}

export const SidePanel: FunctionalComponent = () => {
  const [activeTab, setActiveTab] = useState<
    "summarize" | "history" | "settings"
  >("summarize");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [extractedContent, setExtractedContent] = useState<ExtractedContent>({
    text: "",
    charCount: 0,
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(false);
  const [documentRepository] = useState(() => new DocumentRepository());
  const [viewingDocument, setViewingDocument] = useState<ViewerDocument | null>(
    null,
  );
  const [uiState, setUiState] = useState<UIState>("idle");
  const [currentTabInfo, setCurrentTabInfo] = useState<TabInfo | null>(null);
  const [autoStartSummarization, setAutoStartSummarization] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");
  const [themePreference, setThemePreference] =
    useState<ThemePreference>("system");
  const extractingRef = useRef(false);

  useEffect(() => {
    loadSettings();
    loadCurrentTabInfo();

    // Set up tab change listener
    const handleTabChange = () => {
      // Reset state when tab changes
      setUiState("idle");
      setExtractedContent({ text: "", charCount: 0 });
      setIsExtracting(false);
      setAutoStartSummarization(false);
      extractingRef.current = false;

      // Load new tab info
      loadCurrentTabInfo();
    };

    chrome.tabs.onActivated.addListener(handleTabChange);

    // Cleanup listener on unmount
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabChange);
    };
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
  }, [currentTheme]);

  // Detect and apply theme based on preference
  useEffect(() => {
    if (themePreference === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setCurrentTheme(mediaQuery.matches ? "dark" : "light");

      // Set up listener for system theme changes
      const handleThemeChange = (e: MediaQueryListEvent) => {
        if (themePreference === "system") {
          setCurrentTheme(e.matches ? "dark" : "light");
        }
      };

      mediaQuery.addEventListener("change", handleThemeChange);
      return () => mediaQuery.removeEventListener("change", handleThemeChange);
    } else {
      setCurrentTheme(themePreference);
    }
  }, [themePreference]);

  const toggleTheme = async () => {
    let newPreference: ThemePreference;

    // Cycle through: light -> dark -> system
    if (themePreference === "light") {
      newPreference = "dark";
    } else if (themePreference === "dark") {
      newPreference = "system";
    } else {
      newPreference = "light";
    }

    setThemePreference(newPreference);
    await SettingsService.saveSettings({ theme: newPreference });
  };

  const loadCurrentTabInfo = async () => {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs?.[0];

      if (activeTab?.url && activeTab?.title) {
        setCurrentTabInfo({
          url: activeTab.url,
          title: activeTab.title,
          domain: extractDomain(activeTab.url),
        });
      } else {
        // No active tab, clear tab info
        setCurrentTabInfo(null);
      }
    } catch (error) {
      console.error("Failed to load tab info:", error);
      setCurrentTabInfo(null);
    }
  };

  const loadSettings = async () => {
    try {
      const loadedSettings = await SettingsService.loadSettings();
      setSettings(loadedSettings);
      setShowPrivacyBanner(!loadedSettings.privacyBannerDismissed);
      setThemePreference(loadedSettings.theme || "system");
    } catch (error) {
      console.error("Failed to load settings:", error);
      // Use default settings
      setSettings({
        openaiApiKey: "",
        summarization: { length: "brief", style: "bullets" },
        privacyBannerDismissed: false,
      });
      setShowPrivacyBanner(true);
      setThemePreference("system");
    }
  };

  const extractTextFromCurrentTab = async () => {
    if (extractingRef.current) return;
    extractingRef.current = true;
    setIsExtracting(true);
    setUiState("extracting");

    // Store initial tab state to detect if tab changed during extraction
    const initialTabQuery = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const initialTabId = initialTabQuery?.[0]?.id;
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

      // Check if tab changed during extraction
      const currentTabQuery = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const currentTabId = currentTabQuery?.[0]?.id;

      if (currentTabId !== initialTabId) {
        // Tab changed during extraction, discard results
        return;
      }

      if (response?.type === "EXTRACT_CONTENT" && response.payload?.text) {
        setExtractedContent({
          text: response.payload.text,
          charCount: response.payload.text.length,
          metadata: response.payload.metadata,
        });
        setUiState("extracted");
        // Set flag to auto-start summarization after successful extraction
        setAutoStartSummarization(true);
      } else {
        throw new Error(response?.payload?.error || "Failed to extract text");
      }
    } catch (error: any) {
      console.error("Text extraction failed:", error);

      // Detect specific error types and provide helpful messages
      let errorMessage = error.message || "Failed to extract text from page";
      let showRefreshButton = false;

      if (error.message?.includes("Receiving end does not exist")) {
        errorMessage =
          "Please refresh this page and try again. This usually happens when the extension was installed or updated after the page was loaded.";
        showRefreshButton = true;
      } else if (error.message?.includes("Cannot access chrome://")) {
        errorMessage = "Cannot extract text from browser system pages.";
      } else if (error.message?.includes("Cannot access contents of")) {
        errorMessage = "Extension doesn't have permission to access this page.";
      } else if (error.message?.includes("Extension context invalidated")) {
        errorMessage =
          "Extension was installed after this page loaded. Please refresh the page.";
        showRefreshButton = true;
      } else if (error.message?.includes("Frame not found")) {
        errorMessage =
          "Unable to access page content. This might be an embedded frame.";
      } else if (error.message?.includes("NetworkError")) {
        errorMessage =
          "Network error occurred. Please check your connection and try again.";
      }

      setExtractedContent({
        text: "",
        charCount: 0,
        error: errorMessage,
        showRefreshButton,
      });
      setUiState("error");
    } finally {
      setIsExtracting(false);
      extractingRef.current = false;
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
    setUiState("idle");
    setExtractedContent({ text: "", charCount: 0 });
    setAutoStartSummarization(false);
    loadCurrentTabInfo();
  };

  const handleExtractClick = () => {
    if (!extractingRef.current && uiState === "idle") {
      extractTextFromCurrentTab();
    }
  };

  const handleSummarizationSettingChange = async (
    key: "length" | "style",
    value: string,
  ) => {
    const newSummarizationSettings: SummarizationSettings = {
      length:
        key === "length"
          ? (value as "brief" | "medium")
          : settings?.summarization?.length || "brief",
      style:
        key === "style"
          ? (value as "bullets" | "plain")
          : settings?.summarization?.style || "bullets",
    };

    // Update local state first
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        summarization: newSummarizationSettings,
      };
    });

    // Then save to storage
    await SettingsService.saveSummarizationSettings(newSummarizationSettings);
  };

  const handleSummarizationComplete = async (summaryText: string) => {
    try {
      // Get current tab URL for document
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs?.[0];

      // Create document object
      const document: Document = {
        id: Date.now().toString(),
        url: activeTab?.url || extractedContent.metadata?.url || "",
        title:
          activeTab?.title || extractedContent.metadata?.title || "Untitled",
        domain: extractDomain(
          activeTab?.url || extractedContent.metadata?.url || "",
        ),
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
      <div className="panel-header">
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label="Toggle theme"
          title={`Current: ${themePreference} (${currentTheme} mode)`}
        >
          {currentTheme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

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
          id="history"
          label="History"
          isActive={activeTab === "history"}
          onClick={() => setActiveTab("history")}
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
            {uiState === "idle" && (
              <div data-testid="state-idle" className="idle-state">
                <h2>Ready to Extract Content</h2>
                {currentTabInfo && (
                  <div className="tab-info">
                    <p className="tab-title">{currentTabInfo.title}</p>
                    <p className="tab-domain">{currentTabInfo.domain}</p>
                    <p className="tab-url">{currentTabInfo.url}</p>
                  </div>
                )}
                <div className="summary-settings">
                  <div className="form-group">
                    <label htmlFor="summary-length">Summary Length</label>
                    <select
                      id="summary-length"
                      value={settings?.summarization?.length || "brief"}
                      onChange={(e) =>
                        handleSummarizationSettingChange(
                          "length",
                          (e.target as HTMLSelectElement).value,
                        )
                      }
                      disabled={false}
                    >
                      <option value="brief">Brief (100-150 words)</option>
                      <option value="medium">Medium (200-300 words)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="summary-style">Summary Style</label>
                    <select
                      id="summary-style"
                      value={settings?.summarization?.style || "bullets"}
                      onChange={(e) =>
                        handleSummarizationSettingChange(
                          "style",
                          (e.target as HTMLSelectElement).value,
                        )
                      }
                      disabled={false}
                    >
                      <option value="bullets">Bullet Points</option>
                      <option value="plain">Plain Text</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleExtractClick}
                  className="extract-button primary"
                  disabled={isExtracting}
                >
                  Extract & Summarize
                </button>
                {!settings?.openaiApiKey && (
                  <div className="setup-prompt">
                    <p>
                      Note: You'll need to configure your OpenAI API key to
                      summarize content.
                    </p>
                    <button
                      onClick={() => setActiveTab("settings")}
                      className="settings-link"
                    >
                      Go to Settings
                    </button>
                  </div>
                )}
              </div>
            )}

            {uiState === "extracting" && (
              <div data-testid="state-extracting" className="extracting-status">
                <div data-testid="extraction-spinner" className="spinner" />
                <p>Extracting text from page...</p>
              </div>
            )}

            {uiState === "error" && (
              <div
                data-testid="error-container"
                className="extraction-error error"
              >
                <p className="error-message">
                  <span className="error-icon">⚠️</span>{" "}
                  {extractedContent.error}
                </p>
                {extractedContent.showRefreshButton ? (
                  <button
                    onClick={async () => {
                      const tabs = await chrome.tabs.query({
                        active: true,
                        currentWindow: true,
                      });
                      const activeTab = tabs?.[0];
                      if (activeTab?.id && chrome.tabs.reload) {
                        chrome.tabs.reload(activeTab.id);
                        // Reset state after triggering reload
                        setTimeout(() => {
                          setUiState("idle");
                          setExtractedContent({ text: "", charCount: 0 });
                          loadCurrentTabInfo();
                        }, 100);
                      }
                    }}
                    className="refresh-button primary"
                  >
                    🔄 Refresh Page
                  </button>
                ) : (
                  <button onClick={handleRefresh} className="retry-button">
                    Try Again
                  </button>
                )}
              </div>
            )}

            {uiState === "extracted" && (
              <div data-testid="state-extracted">
                <StreamingSummarizer
                  extractedText={extractedContent.text}
                  charCount={extractedContent.charCount}
                  autoStart={autoStartSummarization}
                  onSummarizationComplete={handleSummarizationComplete}
                />
                <button
                  onClick={handleRefresh}
                  className="refresh-button secondary"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div role="tabpanel" aria-label="History">
            {viewingDocument ? (
              <DocumentViewer
                document={viewingDocument}
                onBack={() => setViewingDocument(null)}
              />
            ) : (
              <RecentList
                onViewDocument={(doc) => {
                  // Convert DisplayDocument to ViewerDocument format
                  setViewingDocument({
                    id: doc.id,
                    title: doc.title,
                    domain: doc.domain,
                    date: doc.date, // This comes from RecentList already formatted
                    rawText: doc.rawText,
                    summary: doc.summary,
                  });
                }}
              />
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
