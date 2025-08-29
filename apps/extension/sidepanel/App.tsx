import { FunctionalComponent } from "preact";
import { useState } from "preact/hooks";
import { Settings } from "./Settings";
import { Summarizer } from "./Summarizer";
import { RecentList } from "./RecentList";
import { DocumentViewer } from "./DocumentViewer";

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

type Tab = "summarize" | "recent" | "settings";

export const App: FunctionalComponent = () => {
  const [activeTab, setActiveTab] = useState<Tab>("summarize");
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  const handleViewDocument = (doc: Document) => {
    setViewingDocument(doc);
  };

  const handleBackFromDocument = () => {
    setViewingDocument(null);
  };

  return (
    <div className="app">
      <div className="mock-mode-banner">
        UI Preview Mode - Backend integration pending
      </div>
      <header className="header">
        <h1>Briefcase</h1>
      </header>

      {viewingDocument ? (
        <DocumentViewer
          document={viewingDocument}
          onBack={handleBackFromDocument}
        />
      ) : (
        <>
          <nav className="tabs">
            <button
              className={`tab ${activeTab === "summarize" ? "active" : ""}`}
              onClick={() => setActiveTab("summarize")}
            >
              Summarize
            </button>
            <button
              className={`tab ${activeTab === "recent" ? "active" : ""}`}
              onClick={() => setActiveTab("recent")}
            >
              Recent
            </button>
            <button
              className={`tab ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </button>
          </nav>

          <main className="main">
            {activeTab === "summarize" && <Summarizer />}
            {activeTab === "recent" && (
              <RecentList onViewDocument={handleViewDocument} />
            )}
            {activeTab === "settings" && <Settings />}
          </main>
        </>
      )}
    </div>
  );
};
