import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";

interface SettingsData {
  apiKey: string;
  privacyBannerDismissed: boolean;
}

export const Settings: FunctionalComponent = () => {
  const [settings, setSettings] = useState<SettingsData>({
    apiKey: "",
    privacyBannerDismissed: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [validationError, setValidationError] = useState("");

  // Load settings from storage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get("settings");
      if (result && result.settings) {
        setSettings(result.settings);
      }
      setIsLoading(false);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to load settings" });
      setIsLoading(false);
    }
  };

  const validateApiKey = (key: string): boolean => {
    // OpenAI API keys start with 'sk-' and are typically 48+ characters
    const apiKeyPattern = /^sk-[A-Za-z0-9]{20,}$/;
    return apiKeyPattern.test(key);
  };

  const handleSave = async () => {
    setValidationError("");
    setMessage(null);

    if (!validateApiKey(settings.apiKey)) {
      setValidationError("Invalid API key format");
      return;
    }

    setIsSaving(true);
    try {
      await chrome.storage.local.set({ settings });
      setMessage({ type: "success", text: "API key saved successfully" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setMessage(null);
    setIsTesting(true);

    // Mock connection test for UI demo
    setTimeout(() => {
      if (settings.apiKey.startsWith("sk-") && settings.apiKey.length > 20) {
        setMessage({ type: "success", text: "Connection successful (mock)" });
      } else {
        setMessage({
          type: "error",
          text: "Connection failed: Invalid API key format (mock)",
        });
      }
      setIsTesting(false);
    }, 1000);
  };

  const handleDeleteAllData = async () => {
    try {
      await chrome.storage.local.clear();
      setSettings({ apiKey: "", privacyBannerDismissed: false });
      setMessage({ type: "success", text: "All data has been deleted" });
      setShowDeleteConfirm(false);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete data" });
    }
  };

  const dismissPrivacyBanner = async () => {
    const newSettings = { ...settings, privacyBannerDismissed: true };
    setSettings(newSettings);
    await chrome.storage.local.set({ settings: newSettings });
  };

  if (isLoading) {
    return <div className="settings-loading">Loading settings...</div>;
  }

  return (
    <div className="settings">
      <h2>Settings</h2>

      {!settings.privacyBannerDismissed && (
        <div className="privacy-banner">
          <p>
            <strong>Privacy First</strong>
          </p>
          <p>
            Your API key is stored locally on your device and never sent to our
            servers.
          </p>
          <button onClick={dismissPrivacyBanner}>Got it</button>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="api-key">OpenAI API Key</label>
        <div className="input-group">
          <input
            id="api-key"
            type={showApiKey ? "text" : "password"}
            value={settings.apiKey}
            onChange={(e) =>
              setSettings({
                ...settings,
                apiKey: (e.target as HTMLInputElement).value,
              })
            }
            placeholder="sk-..."
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            aria-label={showApiKey ? "Hide API Key" : "Show API Key"}
          >
            {showApiKey ? "Hide API Key" : "Show API Key"}
          </button>
        </div>
        {validationError && <div className="error">{validationError}</div>}
      </div>

      <div className="button-group">
        <button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={handleTestConnection}
          disabled={!settings.apiKey || isTesting}
        >
          {isTesting ? "Testing connection..." : "Test Connection"}
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="danger-zone">
        <h3>Danger Zone</h3>
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
              Are you sure you want to delete all data? This cannot be undone.
            </p>
            <div className="button-group">
              <button onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="confirm-delete" onClick={handleDeleteAllData}>
                Confirm Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
