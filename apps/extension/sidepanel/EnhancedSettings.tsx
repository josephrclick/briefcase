import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  SettingsService,
  SettingsData,
  SummarizationSettings,
  DEFAULT_SETTINGS,
  OpenAIModel,
} from "../lib/settings-service";

interface EnhancedSettingsProps {
  onSettingsUpdate?: () => void;
}

export const EnhancedSettings: FunctionalComponent<EnhancedSettingsProps> = ({
  onSettingsUpdate,
}) => {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [validationError, setValidationError] = useState("");
  const [apiKeyValidated, setApiKeyValidated] = useState(false);
  const [configCollapsed, setConfigCollapsed] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await SettingsService.loadSettings();
      setSettings(loadedSettings);
      // Set collapsed state based on whether API key exists and collapse preference
      setConfigCollapsed(
        !!loadedSettings.openaiApiKey &&
          (loadedSettings.openaiConfigCollapsed ?? false),
      );
    } catch (error) {
      setMessage({ type: "error", text: "Failed to load settings" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeyChange = (apiKey: string) => {
    setSettings({ ...settings, openaiApiKey: apiKey });
    setValidationError("");
    setMessage(null);
    setApiKeyValidated(false); // Reset validation state when API key changes
  };

  const handleSummarizationChange = (
    updates: Partial<SummarizationSettings>,
  ) => {
    setSettings({
      ...settings,
      summarization: { ...settings.summarization, ...updates },
    });
  };

  const handleModelChange = async (model: OpenAIModel) => {
    setSettings({ ...settings, selectedModel: model });
    try {
      await SettingsService.saveModelSelection(model);
      if (onSettingsUpdate) {
        onSettingsUpdate();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save model selection" });
    }
  };

  const handleSaveApiKey = async () => {
    setValidationError("");
    setMessage(null);

    // Save the API key since it's already validated
    setIsSaving(true);
    try {
      await SettingsService.saveSettings({
        ...settings,
        openaiConfigCollapsed: true, // Automatically collapse after save
      });
      setMessage({ type: "success", text: "Settings saved successfully" });
      setApiKeyValidated(false); // Reset validation state after save
      setConfigCollapsed(true); // Collapse the section after successful save
      // Notify parent component that settings have been updated
      if (onSettingsUpdate) {
        onSettingsUpdate();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setValidationError("");
    setMessage(null);

    if (
      settings.openaiApiKey &&
      !SettingsService.validateApiKeyFormat(settings.openaiApiKey)
    ) {
      setValidationError(
        "Invalid API key format. Must start with 'sk-' and be at least 20 characters.",
      );
      return;
    }

    setIsSaving(true);
    try {
      await SettingsService.saveSettings(settings);
      setMessage({ type: "success", text: "Settings saved successfully" });
      // Notify parent component that settings have been updated
      if (onSettingsUpdate) {
        onSettingsUpdate();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setMessage(null);

    if (!settings.openaiApiKey) {
      setMessage({ type: "error", text: "Please enter an API key first" });
      return;
    }

    setIsTesting(true);
    try {
      const result = await SettingsService.testApiKey(settings.openaiApiKey);

      if (result.success) {
        setMessage({
          type: "success",
          text: "Connection successful! Your API key is valid.",
        });
        setApiKeyValidated(true); // Set validation flag on success
      } else {
        setMessage({
          type: "error",
          text: result.error || "Connection failed. Please check your API key.",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to test connection" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      await SettingsService.clearAllData();
      setSettings(DEFAULT_SETTINGS);
      setMessage({ type: "success", text: "All data has been deleted" });
      setShowDeleteConfirm(false);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete data" });
    } finally {
      setIsDeleting(false);
    }
  };

  const dismissPrivacyBanner = async () => {
    const newSettings = { ...settings, privacyBannerDismissed: true };
    setSettings(newSettings);
    await SettingsService.saveSettings({ privacyBannerDismissed: true });
  };

  const toggleConfigCollapse = async () => {
    const newCollapsedState = !configCollapsed;
    setConfigCollapsed(newCollapsedState);
    // Persist the collapse preference
    await SettingsService.saveSettings({
      openaiConfigCollapsed: newCollapsedState,
    });
  };

  if (isLoading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings">
      <h2>Settings</h2>

      {!settings.privacyBannerDismissed && (
        <div className="privacy-banner">
          <h3>🔒 Privacy First</h3>
          <p>
            Your settings and API key are stored locally on your device. We
            never send your data to our servers. When you use the summarization
            feature, your API key is sent directly to OpenAI's servers.
          </p>
          <button onClick={dismissPrivacyBanner} className="dismiss-button">
            Got it
          </button>
        </div>
      )}

      <div className="settings-section">
        <div className="section-header">
          <h3>OpenAI Configuration</h3>
          {settings.openaiApiKey && (
            <button
              className="collapse-toggle"
              onClick={toggleConfigCollapse}
              aria-label={configCollapsed ? "Expand" : "Collapse"}
            >
              {configCollapsed ? "▶" : "▼"}
            </button>
          )}
        </div>

        {!configCollapsed && (
          <>
            <div className="form-group">
              <label htmlFor="api-key">API Key</label>
              <div className="input-group">
                <input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  value={settings.openaiApiKey}
                  onInput={(e) =>
                    handleApiKeyChange((e.target as HTMLInputElement).value)
                  }
                  placeholder="sk-..."
                  className={validationError ? "error" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  aria-label={showApiKey ? "Hide API Key" : "Show API Key"}
                  className="toggle-visibility"
                >
                  {showApiKey ? "🙈" : "👁️"}
                </button>
              </div>
              {validationError && (
                <div className="error-message">{validationError}</div>
              )}
              <div className="help-text">
                Get your API key from{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  OpenAI Platform
                </a>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="ai-model">AI Model</label>
              <select
                id="ai-model"
                value={settings.selectedModel || "gpt-4o-mini"}
                onChange={(e) =>
                  handleModelChange(
                    (e.target as HTMLSelectElement).value as OpenAIModel,
                  )
                }
              >
                <option value="gpt-5-nano">
                  GPT-5 Nano (Fastest, Cheapest)
                </option>
                <option value="gpt-4o-mini">GPT-4o Mini (Balanced)</option>
                <option value="gpt-4.1-nano">
                  GPT-4.1 Nano (Fast, Large Context)
                </option>
              </select>
              <div className="help-text">
                Choose the AI model for summarization
              </div>
            </div>

            <div className="button-group">
              <button
                onClick={
                  apiKeyValidated ? handleSaveApiKey : handleTestConnection
                }
                disabled={!settings.openaiApiKey || isTesting || isSaving}
                className={apiKeyValidated ? "primary" : "secondary"}
              >
                {isTesting
                  ? "Testing..."
                  : isSaving
                    ? "Saving..."
                    : apiKeyValidated
                      ? "Save Key"
                      : "Test Connection"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="settings-section">
        <h3>Summarization Preferences</h3>

        <div className="form-group">
          <label htmlFor="summary-length">Summary Length</label>
          <select
            id="summary-length"
            value={settings.summarization.length}
            onChange={(e) =>
              handleSummarizationChange({
                length: (e.target as HTMLSelectElement).value as
                  | "brief"
                  | "medium",
              })
            }
          >
            <option value="brief">Brief (100-150 words)</option>
            <option value="medium">Medium (200-300 words)</option>
          </select>
          <div className="help-text">
            Choose how detailed you want your summaries to be
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="summary-style">Summary Style</label>
          <select
            id="summary-style"
            value={settings.summarization.style}
            onChange={(e) =>
              handleSummarizationChange({
                style: (e.target as HTMLSelectElement).value as
                  | "bullets"
                  | "plain",
              })
            }
          >
            <option value="bullets">Bullet Points</option>
            <option value="plain">Plain Text</option>
          </select>
          <div className="help-text">
            Format for the key points section of summaries
          </div>
        </div>
      </div>

      <div className="button-group primary-actions">
        <button onClick={handleSave} disabled={isSaving} className="primary">
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          <span className="message-icon">
            {message.type === "success" && "✓"}
            {message.type === "error" && "✗"}
            {message.type === "info" && "ℹ"}
          </span>
          {message.text}
        </div>
      )}

      <div className="danger-zone">
        <h3>⚠️ Danger Zone</h3>
        {!showDeleteConfirm ? (
          <button
            className="delete-button"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete All Data
          </button>
        ) : (
          <div className="delete-confirm">
            <p>
              Are you sure you want to delete all data? This will remove your
              API key, all saved documents, and settings. This action cannot be
              undone.
            </p>
            <div className="button-group">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="secondary"
              >
                Cancel
              </button>
              <button
                className="confirm-delete danger"
                onClick={handleDeleteAllData}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Everything"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
