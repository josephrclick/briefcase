import { FunctionalComponent } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import {
  SettingsService,
  SummarizationSettings,
} from "../lib/settings-service";
import { OpenAIProvider } from "../lib/openai-provider";

interface StreamingSummarizerProps {
  extractedText: string;
  charCount: number;
}

interface SummaryState {
  content: string;
  isStreaming: boolean;
  isComplete: boolean;
  error?: string;
}

export const StreamingSummarizer: FunctionalComponent<
  StreamingSummarizerProps
> = ({ extractedText, charCount }) => {
  const [settings, setSettings] = useState<SummarizationSettings>({
    length: "brief",
    style: "bullets",
  });
  const [summary, setSummary] = useState<SummaryState>({
    content: "",
    isStreaming: false,
    isComplete: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [provider, setProvider] = useState<OpenAIProvider | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<string> | null>(
    null,
  );

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await SettingsService.loadSettings();
      setSettings(loadedSettings.summarization);
      const providerInstance = await SettingsService.getProvider();
      setProvider(providerInstance);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const updateSettings = async (updates: Partial<SummarizationSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await SettingsService.saveSummarizationSettings(newSettings);
  };

  const MIN_TEXT_LENGTH = 100;
  const MAX_TEXT_LENGTH = 12000;

  const textValidation = () => {
    if (!extractedText || charCount === 0) {
      return { valid: false, message: "No text extracted from page" };
    }
    if (charCount < MIN_TEXT_LENGTH) {
      return {
        valid: false,
        message: `Text too short (minimum ${MIN_TEXT_LENGTH} characters)`,
      };
    }
    if (charCount > MAX_TEXT_LENGTH) {
      return {
        valid: false,
        message: `Text too long (maximum ${MAX_TEXT_LENGTH} characters)`,
      };
    }
    return { valid: true, message: null };
  };

  const validation = textValidation();
  const canSummarize = validation.valid && !summary.isStreaming && !isLoading;

  const handleSummarize = async () => {
    if (!provider) {
      setError("Please configure your OpenAI API key in Settings");
      return;
    }

    setError(null);
    setCopied(false);
    setSummary({
      content: "",
      isStreaming: true,
      isComplete: false,
    });
    setIsLoading(true);

    try {
      abortControllerRef.current = new AbortController();

      const stream = provider.summarize(
        extractedText,
        settings,
        abortControllerRef.current.signal,
      );

      setIsLoading(false);

      const reader = stream.getReader();
      streamReaderRef.current = reader;

      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setSummary((prev) => ({
            ...prev,
            isStreaming: false,
            isComplete: true,
          }));
          break;
        }

        if (value) {
          accumulatedContent += value;
          setSummary((prev) => ({
            ...prev,
            content: accumulatedContent,
          }));
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setSummary((prev) => ({
        ...prev,
        isStreaming: false,
        isComplete: false,
      }));

      if (err.name === "AbortError") {
        setError("Summarization cancelled");
      } else if (err.status === 429) {
        setError("Rate limit exceeded. Please try again in a moment.");
      } else {
        setError(err.message || "Failed to generate summary");
      }
    } finally {
      abortControllerRef.current = null;
      streamReaderRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (streamReaderRef.current) {
      streamReaderRef.current.cancel();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatSummary = (content: string) => {
    const sections = content.split(/\*\*([^*]+)\*\*/g).filter(Boolean);
    const formatted: JSX.Element[] = [];

    for (let i = 0; i < sections.length; i += 2) {
      const heading = sections[i];
      const text = sections[i + 1] || "";

      if (heading.includes("Key Points")) {
        const points = text
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => line.replace(/^[•\-*]\s*/, ""));

        formatted.push(
          <div key={`section-${i}`} className="summary-section">
            <h3>{heading.replace(":", "")}</h3>
            {settings.style === "bullets" ? (
              <ul>
                {points.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            ) : (
              <div className="plain-text">
                {points.map((point, idx) => (
                  <p key={idx}>{point}</p>
                ))}
              </div>
            )}
          </div>,
        );
      } else if (heading.includes("TL;DR")) {
        formatted.push(
          <div key={`section-${i}`} className="summary-section">
            <h3>{heading.replace(":", "")}</h3>
            <p>{text.trim()}</p>
          </div>,
        );
      }
    }

    // If no formatted sections, just show the raw content
    if (formatted.length === 0 && content) {
      return <div className="summary-raw">{content}</div>;
    }

    return <>{formatted}</>;
  };

  return (
    <div className="streaming-summarizer">
      <h2>Summarize</h2>

      <div className="extraction-status">
        {validation.valid ? (
          <p className="status-success">✓ {charCount} characters extracted</p>
        ) : validation.message ? (
          <p className="status-error">⚠️ {validation.message}</p>
        ) : null}
      </div>

      <div className="controls">
        <div className="form-group">
          <label htmlFor="summary-length">Summary Length</label>
          <select
            id="summary-length"
            value={settings.length}
            onChange={(e) =>
              updateSettings({
                length: (e.target as HTMLSelectElement).value as
                  | "brief"
                  | "medium",
              })
            }
            disabled={summary.isStreaming || isLoading}
          >
            <option value="brief">Brief (100-150 words)</option>
            <option value="medium">Medium (200-300 words)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="summary-style">Summary Style</label>
          <select
            id="summary-style"
            value={settings.style}
            onChange={(e) =>
              updateSettings({
                style: (e.target as HTMLSelectElement).value as
                  | "bullets"
                  | "plain",
              })
            }
            disabled={summary.isStreaming || isLoading}
          >
            <option value="bullets">Bullet Points</option>
            <option value="plain">Plain Text</option>
          </select>
        </div>

        <div className="button-group">
          {!summary.isStreaming ? (
            <button
              onClick={handleSummarize}
              disabled={!canSummarize}
              className="summarize-button primary"
            >
              {isLoading ? (
                <>
                  <span data-testid="loading-spinner" className="spinner" />
                  Initializing...
                </>
              ) : (
                "Summarize Page"
              )}
            </button>
          ) : (
            <button onClick={handleCancel} className="cancel-button secondary">
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
          {error.includes("API key") && (
            <a href="#settings" className="settings-link">
              Go to Settings
            </a>
          )}
          {!error.includes("API key") && !error.includes("cancelled") && (
            <button
              onClick={handleSummarize}
              className="retry-button"
              disabled={!canSummarize}
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {(summary.content || summary.isStreaming) && (
        <div className="summary-container">
          <div className="summary-header" role="status" aria-live="polite">
            {summary.isStreaming && !summary.isComplete && (
              <>
                <span role="progressbar" className="progress-indicator" />
                <span className="status-text">Generating summary...</span>
                {summary.content && (
                  <span
                    data-testid="typing-indicator"
                    className="typing-indicator"
                  >
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                )}
              </>
            )}
            {summary.isComplete && (
              <div className="completion-status">
                <span className="check-icon">✓</span>
                <span>Summary complete</span>
                <button
                  onClick={handleCopy}
                  className="copy-button"
                  aria-label="Copy Summary"
                >
                  {copied ? "✓ Copied!" : "📋 Copy Summary"}
                </button>
              </div>
            )}
          </div>

          <div className="summary-content">
            {formatSummary(summary.content)}
          </div>
        </div>
      )}

      {!provider && !error && (
        <div className="setup-prompt">
          <p>
            To use the summarization feature, please configure your OpenAI API
            key.
          </p>
          <a href="#settings" className="settings-link primary">
            Go to Settings
          </a>
        </div>
      )}
    </div>
  );
};
