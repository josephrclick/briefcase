import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import {
  ExportService,
  ExportFormat,
  ExportOptions,
  ExportResult,
} from "./export-service";
import { Document, DocumentRepository } from "./document-repository";
import { MOCK_API_KEY } from "../src/test-utils/constants";

// Mock dependencies
vi.mock("./document-repository");

describe("ExportService", () => {
  const mockDocuments: Document[] = [
    {
      id: "doc1",
      url: "https://example.com/article1",
      title: "Test Article 1",
      domain: "example.com",
      rawText: "This is the raw text content of article 1.",
      summaryText: "Summary of article 1",
      summary: {
        keyPoints: ["Key point 1", "Key point 2"],
        tldr: "Brief summary of article 1",
      },
      metadata: {
        author: "John Doe",
        publishedDate: "2023-12-01",
        readingTime: 5,
        wordCount: 250,
      },
      createdAt: "2023-12-01T10:00:00.000Z",
      summarizedAt: "2023-12-01T10:01:00.000Z",
    },
    {
      id: "doc2",
      url: "https://example.org/article2",
      title: "Test Article 2",
      domain: "example.org",
      rawText: "This is the raw text content of article 2.",
      summaryText: "Summary of article 2",
      summary: {
        keyPoints: [
          "Important point A",
          "Important point B",
          "Important point C",
        ],
        tldr: "Brief summary of article 2",
      },
      metadata: {
        publishedDate: "2023-12-02",
        wordCount: 300,
      },
      createdAt: "2023-12-02T14:30:00.000Z",
      summarizedAt: "2023-12-02T14:31:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock chrome.downloads API
    global.chrome = {
      ...global.chrome,
      downloads: {
        download: vi.fn().mockResolvedValue(123),
        search: vi.fn(),
        cancel: vi.fn(),
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      permissions: {
        contains: vi.fn().mockResolvedValue(true),
      },
    } as any;

    // Mock DocumentRepository
    (DocumentRepository.prototype.getRecentDocuments as Mock).mockResolvedValue(
      mockDocuments,
    );
  });

  describe("Format Support", () => {
    it("should support JSON export format", () => {
      expect(ExportService.getSupportedFormats()).toContain("json");
    });

    it("should support Markdown export format", () => {
      expect(ExportService.getSupportedFormats()).toContain("markdown");
    });

    it("should support CSV export format", () => {
      expect(ExportService.getSupportedFormats()).toContain("csv");
    });

    it("should return proper MIME type for each format", () => {
      expect(ExportService.getMimeType("json")).toBe("application/json");
      expect(ExportService.getMimeType("markdown")).toBe("text/markdown");
      expect(ExportService.getMimeType("csv")).toBe("text/csv");
    });
  });

  describe("JSON Export", () => {
    it("should export documents as valid JSON", async () => {
      const result = await ExportService.exportAsJSON();

      expect(result.success).toBe(true);
      expect(result.format).toBe("json");
      expect(result.documentCount).toBe(2);
      expect(result.downloadId).toBe(123);
    });

    it("should generate proper JSON structure with all document fields", async () => {
      const json = await ExportService.generateJSON(mockDocuments);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty("exportedAt");
      expect(parsed).toHaveProperty("documentCount", 2);
      expect(parsed).toHaveProperty("documents");
      expect(Array.isArray(parsed.documents)).toBe(true);

      const firstDoc = parsed.documents[0];
      expect(firstDoc).toHaveProperty("id", "doc1");
      expect(firstDoc).toHaveProperty("title", "Test Article 1");
      expect(firstDoc).toHaveProperty("url", "https://example.com/article1");
      expect(firstDoc).toHaveProperty("summaryText");
      expect(firstDoc).toHaveProperty("summary");
      expect(firstDoc.summary).toHaveProperty("keyPoints");
      expect(firstDoc.summary).toHaveProperty("tldr");
      expect(firstDoc).toHaveProperty("metadata");
    });

    it("should handle documents with missing optional fields", async () => {
      const incompleteDoc: Document = {
        id: "incomplete",
        url: "https://test.com",
        title: "Incomplete Doc",
        domain: "test.com",
        rawText: "Raw text",
        metadata: { wordCount: 100 },
        createdAt: "2023-12-03T00:00:00.000Z",
      };

      const json = await ExportService.generateJSON([incompleteDoc]);
      const parsed = JSON.parse(json);

      expect(parsed.documents[0]).toHaveProperty("id", "incomplete");
      expect(parsed.documents[0]).not.toHaveProperty("summaryText");
      expect(parsed.documents[0]).not.toHaveProperty("author");
    });
  });

  describe("Markdown Export", () => {
    it("should export documents as formatted Markdown", async () => {
      const result = await ExportService.exportAsMarkdown();

      expect(result.success).toBe(true);
      expect(result.format).toBe("markdown");
      expect(result.documentCount).toBe(2);
      expect(result.downloadId).toBe(123);
    });

    it("should generate proper Markdown structure with headers", async () => {
      const markdown = await ExportService.generateMarkdown(mockDocuments);

      expect(markdown).toContain("# Briefcase Export");
      expect(markdown).toContain("## Test Article 1");
      expect(markdown).toContain("## Test Article 2");
      expect(markdown).toMatch(/Exported on: \d{4}-\d{2}-\d{2}/);
      expect(markdown).toContain("Total documents: 2");
    });

    it("should include metadata table for each document", async () => {
      const markdown = await ExportService.generateMarkdown(mockDocuments);

      expect(markdown).toContain("| Field | Value |");
      expect(markdown).toContain("| Author | John Doe |");
      expect(markdown).toContain("| Published | 2023-12-01 |");
      expect(markdown).toContain("| Word Count | 250 |");
      expect(markdown).toContain("| Reading Time | 5 min |");
    });

    it("should format key points as bullet lists", async () => {
      const markdown = await ExportService.generateMarkdown(mockDocuments);

      expect(markdown).toContain("### Key Points");
      expect(markdown).toContain("- Key point 1");
      expect(markdown).toContain("- Key point 2");
      expect(markdown).toContain("- Important point A");
    });

    it("should include TL;DR section", async () => {
      const markdown = await ExportService.generateMarkdown(mockDocuments);

      expect(markdown).toContain("### TL;DR");
      expect(markdown).toContain("Brief summary of article 1");
      expect(markdown).toContain("Brief summary of article 2");
    });

    it("should handle documents without summary data", async () => {
      const docWithoutSummary: Document = {
        ...mockDocuments[0],
        summary: undefined,
        summaryText: undefined,
      };

      const markdown = await ExportService.generateMarkdown([
        docWithoutSummary,
      ]);

      expect(markdown).not.toContain("### Key Points");
      expect(markdown).not.toContain("### TL;DR");
      expect(markdown).toContain("*No summary available*");
    });
  });

  describe("CSV Export", () => {
    it("should export documents as CSV format", async () => {
      const result = await ExportService.exportAsCSV();

      expect(result.success).toBe(true);
      expect(result.format).toBe("csv");
      expect(result.documentCount).toBe(2);
      expect(result.downloadId).toBe(123);
    });

    it("should generate proper CSV structure with headers", async () => {
      const csv = await ExportService.generateCSV(mockDocuments);
      const lines = csv.split("\n");

      expect(lines[0]).toContain("id,title,url,domain");
      expect(lines[0]).toContain("author,publishedDate,wordCount");
      expect(lines[0]).toContain("keyPoints,tldr,createdAt");
    });

    it("should properly escape commas in content", async () => {
      const docWithCommas: Document = {
        ...mockDocuments[0],
        title: "Article with, commas in title",
        summary: {
          keyPoints: ["Point with, comma", "Another, point"],
          tldr: "Summary with, commas",
        },
      };

      const csv = await ExportService.generateCSV([docWithCommas]);

      expect(csv).toContain('"Article with, commas in title"');
      expect(csv).toContain('"Point with, comma; Another, point"');
      expect(csv).toContain('"Summary with, commas"');
    });

    it("should handle array fields by joining with semicolons", async () => {
      const csv = await ExportService.generateCSV(mockDocuments);

      expect(csv).toContain("Key point 1; Key point 2");
      expect(csv).toContain(
        "Important point A; Important point B; Important point C",
      );
    });

    it("should handle missing optional fields", async () => {
      const docMissingFields: Document = {
        id: "minimal",
        url: "https://minimal.com",
        title: "Minimal Doc",
        domain: "minimal.com",
        rawText: "Text",
        metadata: { wordCount: 50 },
        createdAt: "2023-12-03T00:00:00.000Z",
      };

      const csv = await ExportService.generateCSV([docMissingFields]);
      const lines = csv.split("\n");

      // Should not break with missing fields
      expect(lines[1]).toContain("minimal");
      expect(lines[1]).toContain("Minimal Doc");
    });
  });

  describe("Batch Processing", () => {
    it("should process large datasets in batches", async () => {
      const largeMockDocuments = Array(60)
        .fill(null)
        .map((_, i) => ({
          ...mockDocuments[0],
          id: `doc${i}`,
          title: `Document ${i}`,
        }));

      (
        DocumentRepository.prototype.getRecentDocuments as Mock
      ).mockResolvedValue(largeMockDocuments);

      const result = await ExportService.exportAsJSON();

      expect(result.success).toBe(true);
      expect(result.documentCount).toBe(60);
    });

    it("should respect batch size configuration", () => {
      expect(ExportService.getBatchSize()).toBe(25);
    });

    it("should process documents in correct batch sizes", async () => {
      const documents = Array(100).fill(mockDocuments[0]);
      const batches = ExportService.createBatches(documents);

      expect(batches.length).toBe(4); // 25, 25, 25, 25
      expect(batches[0].length).toBe(25);
      expect(batches[1].length).toBe(25);
      expect(batches[2].length).toBe(25);
      expect(batches[3].length).toBe(25);
    });

    it("should handle partial last batch", async () => {
      const documents = Array(37).fill(mockDocuments[0]);
      const batches = ExportService.createBatches(documents);

      expect(batches.length).toBe(2); // 25, 12
      expect(batches[0].length).toBe(25);
      expect(batches[1].length).toBe(12);
    });
  });

  describe("Filename Generation", () => {
    it("should generate filename with timestamp for JSON", () => {
      const filename = ExportService.generateFilename("json");
      expect(filename).toMatch(/^briefcase-summaries-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it("should generate filename with timestamp for Markdown", () => {
      const filename = ExportService.generateFilename("markdown");
      expect(filename).toMatch(/^briefcase-summaries-\d{4}-\d{2}-\d{2}\.md$/);
    });

    it("should generate filename with timestamp for CSV", () => {
      const filename = ExportService.generateFilename("csv");
      expect(filename).toMatch(/^briefcase-summaries-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it("should use current date for timestamp", () => {
      const today = new Date().toISOString().split("T")[0];
      const filename = ExportService.generateFilename("json");
      expect(filename).toContain(today);
    });
  });

  describe("Error Handling", () => {
    it("should handle DocumentRepository errors gracefully", async () => {
      (
        DocumentRepository.prototype.getRecentDocuments as Mock
      ).mockRejectedValue(new Error("Storage error"));

      const result = await ExportService.exportAsJSON();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Storage error");
    });

    it("should handle Chrome downloads API errors", async () => {
      (chrome.downloads.download as Mock).mockRejectedValue(
        new Error("Download failed"),
      );

      const result = await ExportService.exportAsJSON();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Download failed");
    });

    it("should handle missing downloads permission", async () => {
      (chrome.permissions.contains as Mock).mockResolvedValue(false);

      const result = await ExportService.exportAsJSON();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Downloads permission not granted");
    });

    it("should validate export format", async () => {
      const result = await ExportService.exportDocuments(
        "invalid" as ExportFormat,
        {},
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported export format");
    });

    it("should handle empty document list", async () => {
      (
        DocumentRepository.prototype.getRecentDocuments as Mock
      ).mockResolvedValue([]);

      const result = await ExportService.exportAsJSON();

      expect(result.success).toBe(false);
      expect(result.error).toContain("No documents to export");
    });
  });

  describe("Export Options", () => {
    it("should respect document limit option", async () => {
      const options: ExportOptions = { limit: 1 };

      await ExportService.exportAsJSON(options);

      expect(
        DocumentRepository.prototype.getRecentDocuments,
      ).toHaveBeenCalledWith(1);
    });

    it("should use default limit when not specified", async () => {
      await ExportService.exportAsJSON();

      expect(
        DocumentRepository.prototype.getRecentDocuments,
      ).toHaveBeenCalledWith(undefined);
    });

    it("should support custom filename prefix", async () => {
      const options: ExportOptions = { filenamePrefix: "custom-export" };

      const filename = ExportService.generateFilename("json", options);
      expect(filename).toMatch(/^custom-export-\d{4}-\d{2}-\d{2}\.json$/);
    });
  });

  describe("Progress Tracking", () => {
    it("should provide progress callbacks for large exports", async () => {
      const progressCallback = vi.fn();
      const largeDocs = Array(75).fill(mockDocuments[0]);

      (
        DocumentRepository.prototype.getRecentDocuments as Mock
      ).mockResolvedValue(largeDocs);

      await ExportService.exportAsJSON({
        onProgress: progressCallback,
      });

      expect(progressCallback).toHaveBeenCalledTimes(3); // 3 batches of 25 each
    });

    it("should report correct progress percentages", async () => {
      const progressCallback = vi.fn();
      const docs = Array(50).fill(mockDocuments[0]);

      (
        DocumentRepository.prototype.getRecentDocuments as Mock
      ).mockResolvedValue(docs);

      await ExportService.exportAsJSON({
        onProgress: progressCallback,
      });

      expect(progressCallback).toHaveBeenCalledWith(25, 50); // 25 processed (50%) after first batch
      expect(progressCallback).toHaveBeenCalledWith(50, 100); // 50 processed (100%) after second batch
    });
  });

  describe("Cancellation Support", () => {
    it("should support AbortController for cancellation", async () => {
      const abortController = new AbortController();
      const largeDocs = Array(100).fill(mockDocuments[0]);

      (
        DocumentRepository.prototype.getRecentDocuments as Mock
      ).mockResolvedValue(largeDocs);

      // Cancel immediately to guarantee cancellation
      abortController.abort();

      const result = await ExportService.exportAsJSON({
        signal: abortController.signal,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Export cancelled");
    });

    it("should clean up resources on cancellation", async () => {
      const abortController = new AbortController();
      abortController.abort(); // Pre-aborted

      const result = await ExportService.exportAsJSON({
        signal: abortController.signal,
      });

      expect(result.success).toBe(false);
      expect(chrome.downloads.download).not.toHaveBeenCalled();
    });
  });
});
