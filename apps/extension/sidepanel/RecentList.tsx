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
    try {
      const result = await chrome.storage.local.get("docs:index");
      if (result["docs:index"]) {
        const docIds = result["docs:index"] as string[];
        const docs: Document[] = [];

        for (const id of docIds.slice(0, 20)) {
          const docResult = await chrome.storage.local.get(`doc:${id}`);
          if (docResult[`doc:${id}`]) {
            docs.push(docResult[`doc:${id}`]);
          }
        }

        setDocuments(docs);
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setIsLoading(false);
    }
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
