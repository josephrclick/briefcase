import { FunctionalComponent } from "preact";
import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import {
  DocumentRepository,
  Document as StoredDocument,
  extractDomain,
} from "../lib/document-repository";

// Display-specific document type that extends stored document fields
type DisplayDocument = Pick<
  StoredDocument,
  "id" | "title" | "rawText" | "summaryText" | "summary"
> & {
  domain: string;
  date: string; // Pre-formatted display date
};

interface RecentListProps {
  onViewDocument: (doc: DisplayDocument) => void;
}

export const RecentList: FunctionalComponent<RecentListProps> = ({
  onViewDocument,
}) => {
  const [documents, setDocuments] = useState<DisplayDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [documentRepository] = useState(() => new DocumentRepository());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadRecentDocuments();
  }, []);

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const loadRecentDocuments = async () => {
    setIsLoading(true);
    try {
      // Load real documents from storage
      const storedDocs = await documentRepository.getRecentDocuments(20);

      // Transform stored documents to display format
      const displayDocs: DisplayDocument[] = storedDocs.map((doc) => ({
        id: doc.id,
        title: doc.title || "Untitled",
        domain: doc.domain || extractDomain(doc.url),
        date: new Date(doc.createdAt).toLocaleDateString(),
        summary: doc.summary,
        rawText: doc.rawText,
        summaryText: doc.summaryText,
      }));

      setDocuments(displayDocs);
    } catch (error) {
      console.error("Failed to load recent documents:", error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await documentRepository.deleteDocument(docId);
      setDocuments(documents.filter((doc) => doc.id !== docId));
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const handleSearchInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setSearchQuery(target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClearSearch();
    }
  };

  // Filter documents based on debounced search query
  const filteredDocuments = useMemo(() => {
    if (!debouncedSearchQuery) {
      return documents;
    }

    const query = debouncedSearchQuery.toLowerCase();
    return documents.filter((doc) => {
      const titleMatch = doc.title.toLowerCase().includes(query);
      const domainMatch = doc.domain.toLowerCase().includes(query);
      const summaryMatch =
        doc.summaryText?.toLowerCase().includes(query) || false;
      return titleMatch || domainMatch || summaryMatch;
    });
  }, [documents, debouncedSearchQuery]);

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
      <div className="search-container">
        <input
          ref={searchInputRef}
          type="text"
          className="search-input"
          placeholder="Search documents..."
          aria-label="Search documents"
          value={searchQuery}
          onInput={handleSearchInput}
          onKeyDown={handleKeyDown}
        />
        {searchQuery && (
          <button
            className="search-clear-button"
            onClick={handleClearSearch}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      {filteredDocuments.length === 0 && debouncedSearchQuery ? (
        <div className="empty-search">
          <p>No documents match your search. Try different keywords.</p>
        </div>
      ) : (
        <ul className="document-list">
          {filteredDocuments.map((doc) => (
            <li key={doc.id} className="document-item">
              <div
                className="document-info"
                onClick={() => onViewDocument(doc)}
              >
                <h3>{doc.title}</h3>
                <div className="metadata">
                  <span className="domain">{doc.domain}</span>
                  <span className="date">{doc.date}</span>
                </div>
                {doc.summaryText && (
                  <div className="summary-preview">
                    {doc.summaryText.slice(0, 150)}
                    {doc.summaryText.length > 150 && "..."}
                  </div>
                )}
              </div>
              <button
                className="document-delete-button"
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
      )}
    </div>
  );
};
