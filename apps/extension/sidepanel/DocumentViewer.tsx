import { FunctionalComponent } from "preact";
import { useState } from "preact/hooks";

interface Document {
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

interface DocumentViewerProps {
  document: Document;
  onBack: () => void;
}

export const DocumentViewer: FunctionalComponent<DocumentViewerProps> = ({
  document,
  onBack,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);

  return (
    <div className="document-viewer">
      <div className="viewer-header">
        <button onClick={onBack} className="back-button">
          ← Back
        </button>
        <h2>{document.title}</h2>
      </div>

      <div className="document-metadata">
        <span className="domain">{document.domain}</span>
        <span className="date">{new Date(document.date).toLocaleString()}</span>
      </div>

      {document.summary && (
        <div className="summary-content">
          <div className="key-points">
            <h3>Key Points</h3>
            <ul>
              {document.summary.keyPoints.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>

          <div className="tldr">
            <h3>TL;DR</h3>
            <p>{document.summary.tldr}</p>
          </div>
        </div>
      )}

      {document.rawText && (
        <div className="original-text-section">
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="toggle-button"
          >
            {showOriginal ? "Hide" : "Show"} Original Text
          </button>

          {showOriginal && (
            <div className="original-text">
              <pre>{document.rawText}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
