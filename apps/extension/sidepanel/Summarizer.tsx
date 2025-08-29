import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";

interface ExtractionStatus {
  extracted: boolean;
  charCount?: number;
  text?: string;
  error?: string;
}

interface Summary {
  keyPoints: string[];
  tldr: string;
}

export const Summarizer: FunctionalComponent = () => {
  const [extractionStatus, setExtractionStatus] =
    useState<ExtractionStatus | null>(null);
  const [summaryLength, setSummaryLength] = useState("concise");
  const [summaryStyle, setSummaryStyle] = useState("neutral");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mock extraction status for UI demo
    setExtractionStatus({
      extracted: true,
      charCount: 2847,
      text: "Mock content extracted from page",
    });
  }, []);

  const handleSummarize = async () => {
    setError(null);
    setSummary(null);
    setIsSummarizing(true);

    // Simulate summarization with mock data
    setTimeout(() => {
      setSummary({
        keyPoints: [
          "This is a mock summary for UI demonstration",
          "Content extraction will be implemented in the next sprint",
          "OpenAI integration will follow after that",
        ],
        tldr: "This side panel UI is currently in preview mode. Backend functionality including content extraction and AI summarization will be implemented in upcoming sprints.",
      });
      setIsSummarizing(false);
    }, 1500);
  };

  const canSummarize = extractionStatus?.extracted && !isSummarizing;

  return (
    <div className="summarizer">
      <h2>Summarize</h2>

      {extractionStatus && (
        <div className="extraction-status">
          {extractionStatus.extracted ? (
            <p className="status-success">
              ✓ {extractionStatus.charCount} characters extracted
            </p>
          ) : (
            <p className="status-error">{extractionStatus.error}</p>
          )}
        </div>
      )}

      <div className="controls">
        <div className="form-group">
          <label htmlFor="summary-length">Summary Length</label>
          <select
            id="summary-length"
            value={summaryLength}
            onChange={(e) =>
              setSummaryLength((e.target as HTMLSelectElement).value)
            }
            disabled={isSummarizing}
          >
            <option value="brief">Brief (2-3 sentences)</option>
            <option value="concise">Concise (1 paragraph)</option>
            <option value="detailed">Detailed (2-3 paragraphs)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="summary-style">Summary Style</label>
          <select
            id="summary-style"
            value={summaryStyle}
            onChange={(e) =>
              setSummaryStyle((e.target as HTMLSelectElement).value)
            }
            disabled={isSummarizing}
          >
            <option value="neutral">Neutral</option>
            <option value="technical">Technical</option>
            <option value="simple">Simple</option>
            <option value="academic">Academic</option>
          </select>
        </div>

        <button
          onClick={handleSummarize}
          disabled={!canSummarize}
          className="summarize-button"
        >
          {isSummarizing ? "Summarizing..." : "Summarize Page"}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {summary && (
        <div className="summary-results">
          <div className="key-points">
            <h3>Key Points</h3>
            <ul>
              {summary.keyPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>

          <div className="tldr">
            <h3>TL;DR</h3>
            <p>{summary.tldr}</p>
          </div>
        </div>
      )}
    </div>
  );
};
