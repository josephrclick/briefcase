import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { DocumentRepository } from "./document-repository";
import type { Document } from "./document-repository";

// Mock chrome.storage.local
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      getBytesInUse: vi.fn(),
    },
  },
} as any;

describe("DocumentRepository", () => {
  let repository: DocumentRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new DocumentRepository();
    // Default mock implementations
    (chrome.storage.local.get as Mock).mockResolvedValue({});
    (chrome.storage.local.set as Mock).mockResolvedValue(undefined);
    (chrome.storage.local.remove as Mock).mockResolvedValue(undefined);
    (chrome.storage.local.clear as Mock).mockResolvedValue(undefined);
    (chrome.storage.local.getBytesInUse as Mock).mockResolvedValue(0);
  });

  describe("saveDocument", () => {
    it("should save a new document and update the index", async () => {
      const document: Document = {
        id: "1234567890",
        url: "https://example.com/article",
        title: "Test Article",
        domain: "example.com",
        rawText: "This is the raw text content",
        summaryText: "This is a summary",
        summary: {
          keyPoints: ["Point 1", "Point 2"],
          tldr: "Brief summary",
        },
        metadata: {
          author: "John Doe",
          publishedDate: "2025-01-01",
          readingTime: 5,
          wordCount: 1000,
        },
        createdAt: new Date().toISOString(),
        summarizedAt: new Date().toISOString(),
      };

      (chrome.storage.local.get as Mock).mockResolvedValue({
        "docs:index": [],
      });

      await repository.saveDocument(document);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [`doc:${document.id}`]: document,
        "docs:index": [document.id],
      });
    });

    it("should prepend new document ID to existing index", async () => {
      const existingIds = ["existing1", "existing2"];
      const newDocument: Document = {
        id: "new123",
        url: "https://example.com",
        title: "New Article",
        domain: "example.com",
        rawText: "Content",
        metadata: { wordCount: 100 },
        createdAt: new Date().toISOString(),
      };

      (chrome.storage.local.get as Mock).mockResolvedValue({
        "docs:index": existingIds,
      });

      await repository.saveDocument(newDocument);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [`doc:${newDocument.id}`]: newDocument,
        "docs:index": ["new123", "existing1", "existing2"],
      });
    });

    it("should handle storage errors gracefully", async () => {
      const document: Document = {
        id: "test123",
        url: "https://example.com",
        title: "Test",
        domain: "example.com",
        rawText: "Content",
        metadata: { wordCount: 100 },
        createdAt: new Date().toISOString(),
      };

      const error = new Error("Storage quota exceeded");
      (chrome.storage.local.set as Mock).mockRejectedValue(error);

      await expect(repository.saveDocument(document)).rejects.toThrow(
        "Storage quota exceeded",
      );
    });

    it("should generate ID if not provided", async () => {
      const documentWithoutId = {
        url: "https://example.com",
        title: "Test",
        domain: "example.com",
        rawText: "Content",
        metadata: { wordCount: 100 },
        createdAt: new Date().toISOString(),
      } as Document;

      await repository.saveDocument(documentWithoutId);

      expect(chrome.storage.local.set).toHaveBeenCalled();
      const call = (chrome.storage.local.set as Mock).mock.calls[0][0];
      const savedKeys = Object.keys(call);
      expect(savedKeys).toContain("docs:index");
      const docKey = savedKeys.find((key) => key.startsWith("doc:"));
      expect(docKey).toBeDefined();
      expect(call[docKey!].id).toBeDefined();
    });
  });

  describe("getDocument", () => {
    it("should retrieve a document by ID", async () => {
      const document: Document = {
        id: "test123",
        url: "https://example.com",
        title: "Test Article",
        domain: "example.com",
        rawText: "Content",
        metadata: { wordCount: 100 },
        createdAt: new Date().toISOString(),
      };

      (chrome.storage.local.get as Mock).mockResolvedValue({
        [`doc:test123`]: document,
      });

      const result = await repository.getDocument("test123");
      expect(result).toEqual(document);
      expect(chrome.storage.local.get).toHaveBeenCalledWith("doc:test123");
    });

    it("should return null for non-existent document", async () => {
      (chrome.storage.local.get as Mock).mockResolvedValue({});

      const result = await repository.getDocument("nonexistent");
      expect(result).toBeNull();
    });

    it("should handle retrieval errors gracefully", async () => {
      (chrome.storage.local.get as Mock).mockRejectedValue(
        new Error("Storage error"),
      );

      const result = await repository.getDocument("test123");
      expect(result).toBeNull();
    });
  });

  describe("getRecentDocuments", () => {
    it("should retrieve recent documents in order", async () => {
      const doc1: Document = {
        id: "1",
        url: "https://example.com/1",
        title: "Article 1",
        domain: "example.com",
        rawText: "Content 1",
        metadata: { wordCount: 100 },
        createdAt: new Date().toISOString(),
      };

      const doc2: Document = {
        id: "2",
        url: "https://example.com/2",
        title: "Article 2",
        domain: "example.com",
        rawText: "Content 2",
        metadata: { wordCount: 200 },
        createdAt: new Date().toISOString(),
      };

      (chrome.storage.local.get as Mock)
        .mockResolvedValueOnce({ "docs:index": ["2", "1"] })
        .mockResolvedValueOnce({
          "doc:2": doc2,
          "doc:1": doc1,
        });

      const result = await repository.getRecentDocuments();
      expect(result).toEqual([doc2, doc1]);
    });

    it("should respect the limit parameter", async () => {
      const ids = ["1", "2", "3", "4", "5"];
      (chrome.storage.local.get as Mock)
        .mockResolvedValueOnce({ "docs:index": ids })
        .mockResolvedValueOnce({
          "doc:1": { id: "1" },
          "doc:2": { id: "2" },
          "doc:3": { id: "3" },
        });

      const result = await repository.getRecentDocuments(3);
      expect(result).toHaveLength(3);
    });

    it("should return empty array when no documents exist", async () => {
      (chrome.storage.local.get as Mock).mockResolvedValue({
        "docs:index": [],
      });

      const result = await repository.getRecentDocuments();
      expect(result).toEqual([]);
    });

    it("should filter out non-existent documents", async () => {
      (chrome.storage.local.get as Mock)
        .mockResolvedValueOnce({ "docs:index": ["1", "2", "3"] })
        .mockResolvedValueOnce({
          "doc:1": { id: "1" },
          "doc:3": { id: "3" },
          // doc:2 is missing
        });

      const result = await repository.getRecentDocuments();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("3");
    });

    it("should handle errors gracefully and return empty array", async () => {
      (chrome.storage.local.get as Mock).mockRejectedValue(
        new Error("Storage error"),
      );

      const result = await repository.getRecentDocuments();
      expect(result).toEqual([]);
    });
  });

  describe("deleteDocument", () => {
    it("should remove document and update index", async () => {
      (chrome.storage.local.get as Mock).mockResolvedValue({
        "docs:index": ["1", "2", "3"],
      });

      await repository.deleteDocument("2");

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(["doc:2"]);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        "docs:index": ["1", "3"],
      });
    });

    it("should handle deleting non-existent document gracefully", async () => {
      (chrome.storage.local.get as Mock).mockResolvedValue({
        "docs:index": ["1", "3"],
      });

      await repository.deleteDocument("2");

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(["doc:2"]);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        "docs:index": ["1", "3"],
      });
    });

    it("should handle empty index", async () => {
      (chrome.storage.local.get as Mock).mockResolvedValue({});

      await repository.deleteDocument("1");

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(["doc:1"]);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        "docs:index": [],
      });
    });

    it("should handle deletion errors gracefully", async () => {
      (chrome.storage.local.remove as Mock).mockRejectedValue(
        new Error("Remove failed"),
      );

      await expect(repository.deleteDocument("1")).rejects.toThrow(
        "Remove failed",
      );
    });
  });

  describe("clearAllDocuments", () => {
    it("should remove all documents and reset index", async () => {
      (chrome.storage.local.get as Mock).mockResolvedValue({
        "docs:index": ["1", "2", "3"],
      });

      await repository.clearAllDocuments();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith([
        "doc:1",
        "doc:2",
        "doc:3",
      ]);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        "docs:index": [],
      });
    });

    it("should handle empty storage gracefully", async () => {
      (chrome.storage.local.get as Mock).mockResolvedValue({});

      await repository.clearAllDocuments();

      expect(chrome.storage.local.remove).not.toHaveBeenCalled();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        "docs:index": [],
      });
    });

    it("should handle clear errors gracefully", async () => {
      (chrome.storage.local.get as Mock).mockResolvedValue({
        "docs:index": ["1"],
      });
      (chrome.storage.local.remove as Mock).mockRejectedValue(
        new Error("Clear failed"),
      );

      await expect(repository.clearAllDocuments()).rejects.toThrow(
        "Clear failed",
      );
    });
  });

  describe("FIFO enforcement", () => {
    it("should enforce 200 document limit by removing oldest documents", async () => {
      // Create 201 document IDs
      const existingIds = Array.from({ length: 200 }, (_, i) => `doc${i}`);
      const newDocument: Document = {
        id: "new201",
        url: "https://example.com",
        title: "New Article",
        domain: "example.com",
        rawText: "Content",
        metadata: { wordCount: 100 },
        createdAt: new Date().toISOString(),
      };

      (chrome.storage.local.get as Mock).mockResolvedValue({
        "docs:index": existingIds,
      });

      await repository.saveDocument(newDocument);

      // Should keep only the first 199 existing docs plus the new one
      const expectedIndex = ["new201", ...existingIds.slice(0, 199)];
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [`doc:${newDocument.id}`]: newDocument,
        "docs:index": expectedIndex,
      });

      // Should remove the oldest document
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(["doc:doc199"]);
    });

    it("should remove multiple documents when exceeding limit", async () => {
      // Create 205 document IDs (exceeding limit by 5)
      const existingIds = Array.from({ length: 205 }, (_, i) => `doc${i}`);
      const newDocument: Document = {
        id: "new206",
        url: "https://example.com",
        title: "New Article",
        domain: "example.com",
        rawText: "Content",
        metadata: { wordCount: 100 },
        createdAt: new Date().toISOString(),
      };

      (chrome.storage.local.get as Mock).mockResolvedValue({
        "docs:index": existingIds,
      });

      await repository.saveDocument(newDocument);

      // Should keep only 199 docs plus the new one (200 total)
      const expectedIndex = ["new206", ...existingIds.slice(0, 199)];
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [`doc:${newDocument.id}`]: newDocument,
        "docs:index": expectedIndex,
      });

      // Should remove documents 199-204 (6 documents)
      const expectedRemovals = [
        "doc:doc199",
        "doc:doc200",
        "doc:doc201",
        "doc:doc202",
        "doc:doc203",
        "doc:doc204",
      ];
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(
        expectedRemovals,
      );
    });

    it("should not enforce limit when under 200 documents", async () => {
      const existingIds = Array.from({ length: 50 }, (_, i) => `doc${i}`);
      const newDocument: Document = {
        id: "new51",
        url: "https://example.com",
        title: "New Article",
        domain: "example.com",
        rawText: "Content",
        metadata: { wordCount: 100 },
        createdAt: new Date().toISOString(),
      };

      (chrome.storage.local.get as Mock).mockResolvedValue({
        "docs:index": existingIds,
      });

      await repository.saveDocument(newDocument);

      expect(chrome.storage.local.remove).not.toHaveBeenCalled();
    });
  });

  describe("storage monitoring", () => {
    it("should get storage bytes in use", async () => {
      (chrome.storage.local.getBytesInUse as Mock).mockResolvedValue(5242880); // 5MB

      const bytes = await repository.getStorageUsage();
      expect(bytes).toBe(5242880);
      expect(chrome.storage.local.getBytesInUse).toHaveBeenCalled();
    });

    it("should handle storage monitoring errors", async () => {
      (chrome.storage.local.getBytesInUse as Mock).mockRejectedValue(
        new Error("API error"),
      );

      const bytes = await repository.getStorageUsage();
      expect(bytes).toBe(0);
    });
  });
});
