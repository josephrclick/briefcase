import { FunctionalComponent } from "preact";
import { useState, useEffect } from "preact/hooks";

interface Document {
  id: string;
  title: string;
  domain: string;
  date: string;
  summary?: {
    keyPoints: string[];
    tldr: string;
  };
}

interface RecentListProps {
  onViewDocument: (doc: Document) => void;
}

export const RecentList: FunctionalComponent<RecentListProps> = ({
  onViewDocument,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentDocuments();
  }, []);

  const loadRecentDocuments = async () => {
    // Mock documents for UI demo
    setTimeout(() => {
      setDocuments([
        {
          id: "mock-1",
          title: "Understanding React Hooks",
          domain: "react.dev",
          date: "2024-03-15",
          summary: {
            keyPoints: ["Hooks allow state in functional components", "useEffect handles side effects"],
            tldr: "React Hooks provide a way to use state and lifecycle methods in functional components."
          }
        },
        {
          id: "mock-2",
          title: "Chrome Extension Development Guide",
          domain: "developer.chrome.com",
          date: "2024-03-14",
          summary: {
            keyPoints: ["Manifest V3 is the latest version", "Service workers replace background pages"],
            tldr: "Chrome extensions use Manifest V3 with service workers for better performance."
          }
        },
        {
          id: "mock-3",
          title: "Introduction to TypeScript",
          domain: "typescriptlang.org",
          date: "2024-03-13",
          summary: {
            keyPoints: ["TypeScript adds static typing to JavaScript", "Improves code maintainability"],
            tldr: "TypeScript is a superset of JavaScript that adds optional static typing."
          }
        }
      ]);
      setIsLoading(false);
    }, 500);
  };

  const handleDelete = async (docId: string) => {
    try {
      await chrome.storage.local.remove(`doc:${docId}`);
      const result = await chrome.storage.local.get("docs:index");
      const docIds = (result["docs:index"] || []) as string[];
      const newDocIds = docIds.filter((id) => id !== docId);
      await chrome.storage.local.set({ "docs:index": newDocIds });

      setDocuments(documents.filter((doc) => doc.id !== docId));
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading recent documents...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="recent-list empty">
        <h2>Recent Documents</h2>
        <p>No documents yet. Start summarizing pages to see them here!</p>
      </div>
    );
  }

  return (
    <div className="recent-list">
      <h2>Recent Documents</h2>
      <ul className="document-list">
        {documents.map((doc) => (
          <li key={doc.id} className="document-item">
            <div className="document-info" onClick={() => onViewDocument(doc)}>
              <h3>{doc.title}</h3>
              <div className="metadata">
                <span className="domain">{doc.domain}</span>
                <span className="date">
                  {new Date(doc.date).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button
              className="delete-button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(doc.id);
              }}
              aria-label="Delete document"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
