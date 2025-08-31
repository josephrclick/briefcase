/**
 * Document Repository for managing local storage of summarized documents
 */

/**
 * Extract domain from a URL string
 */
export const extractDomain = (url: string): string => {
  if (!url) return "Unknown";
  try {
    return new URL(url).hostname;
  } catch {
    return "Unknown";
  }
};

export interface Document {
  id: string;
  url: string;
  title: string;
  domain: string;
  rawText: string;
  summaryText?: string;
  summary?: {
    keyPoints: string[];
    tldr: string;
  };
  metadata: {
    author?: string;
    publishedDate?: string;
    readingTime?: number;
    wordCount: number;
  };
  createdAt: string;
  summarizedAt?: string;
}

export class DocumentRepository {
  private static readonly MAX_DOCUMENTS = 200;
  private static readonly INDEX_KEY = "docs:index";
  private static readonly DOCUMENT_PREFIX = "doc:";

  /**
   * Save a document to storage and update the index
   * Enforces FIFO retention at 200 documents
   */
  async saveDocument(document: Document): Promise<void> {
    try {
      // Generate ID if not provided
      if (!document.id) {
        document.id = Date.now().toString();
      }

      // Get current index
      const result = await chrome.storage.local.get(
        DocumentRepository.INDEX_KEY,
      );
      const currentIndex = (result[DocumentRepository.INDEX_KEY] ||
        []) as string[];

      // Add new document ID to beginning of index
      const newIndex = [
        document.id,
        ...currentIndex.filter((id) => id !== document.id),
      ];

      // Enforce FIFO limit
      if (newIndex.length > DocumentRepository.MAX_DOCUMENTS) {
        const idsToRemove = newIndex.slice(DocumentRepository.MAX_DOCUMENTS);
        const keysToRemove = idsToRemove.map(
          (id) => `${DocumentRepository.DOCUMENT_PREFIX}${id}`,
        );

        // Remove old documents
        await chrome.storage.local.remove(keysToRemove);

        // Keep only MAX_DOCUMENTS in index
        newIndex.length = DocumentRepository.MAX_DOCUMENTS;
      }

      // Save document and updated index
      await chrome.storage.local.set({
        [`${DocumentRepository.DOCUMENT_PREFIX}${document.id}`]: document,
        [DocumentRepository.INDEX_KEY]: newIndex,
      });
    } catch (error) {
      console.error("Failed to save document:", error);
      throw error;
    }
  }

  /**
   * Retrieve a single document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    try {
      const key = `${DocumentRepository.DOCUMENT_PREFIX}${id}`;
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error("Failed to get document:", error);
      return null;
    }
  }

  /**
   * Get recent documents in reverse chronological order
   */
  async getRecentDocuments(limit?: number): Promise<Document[]> {
    try {
      // Get index
      const indexResult = await chrome.storage.local.get(
        DocumentRepository.INDEX_KEY,
      );
      const index = (indexResult[DocumentRepository.INDEX_KEY] ||
        []) as string[];

      if (index.length === 0) {
        return [];
      }

      // Apply limit if specified
      const idsToFetch = limit ? index.slice(0, limit) : index;
      const keys = idsToFetch.map(
        (id) => `${DocumentRepository.DOCUMENT_PREFIX}${id}`,
      );

      // Fetch documents
      const documentsResult = await chrome.storage.local.get(keys);

      // Filter and order documents
      const documents: Document[] = [];
      for (const id of idsToFetch) {
        const doc =
          documentsResult[`${DocumentRepository.DOCUMENT_PREFIX}${id}`];
        if (doc) {
          documents.push(doc);
        }
      }

      return documents;
    } catch (error) {
      console.error("Failed to get recent documents:", error);
      return [];
    }
  }

  /**
   * Delete a document and update the index
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      // Remove document
      const key = `${DocumentRepository.DOCUMENT_PREFIX}${id}`;
      await chrome.storage.local.remove([key]);

      // Update index
      const indexResult = await chrome.storage.local.get(
        DocumentRepository.INDEX_KEY,
      );
      const currentIndex = (indexResult[DocumentRepository.INDEX_KEY] ||
        []) as string[];
      const newIndex = currentIndex.filter((docId) => docId !== id);

      await chrome.storage.local.set({
        [DocumentRepository.INDEX_KEY]: newIndex,
      });
    } catch (error) {
      console.error("Failed to delete document:", error);
      throw error;
    }
  }

  /**
   * Clear all documents and reset index
   */
  async clearAllDocuments(): Promise<void> {
    try {
      // Get all document IDs
      const indexResult = await chrome.storage.local.get(
        DocumentRepository.INDEX_KEY,
      );
      const index = (indexResult[DocumentRepository.INDEX_KEY] ||
        []) as string[];

      if (index.length > 0) {
        // Remove all documents
        const keys = index.map(
          (id) => `${DocumentRepository.DOCUMENT_PREFIX}${id}`,
        );
        await chrome.storage.local.remove(keys);
      }

      // Reset index
      await chrome.storage.local.set({
        [DocumentRepository.INDEX_KEY]: [],
      });
    } catch (error) {
      console.error("Failed to clear documents:", error);
      throw error;
    }
  }

  /**
   * Get current storage usage in bytes
   */
  async getStorageUsage(): Promise<number> {
    try {
      return await chrome.storage.local.getBytesInUse();
    } catch (error) {
      console.error("Failed to get storage usage:", error);
      return 0;
    }
  }
}
