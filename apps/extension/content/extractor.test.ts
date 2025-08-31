import { describe, it, expect, beforeEach, vi } from "vitest";
import { ContentExtractor } from "./extractor";
import { Readability, isProbablyReaderable } from "@mozilla/readability";

vi.mock("@mozilla/readability", () => ({
  Readability: vi.fn(),
  isProbablyReaderable: vi.fn(),
}));

describe("ContentExtractor", () => {
  let extractor: ContentExtractor;
  let mockDocument: Document;

  beforeEach(() => {
    mockDocument = document.implementation.createHTMLDocument("Test");
    extractor = new ContentExtractor();
    vi.clearAllMocks();
  });

  describe("Readability extraction", () => {
    it("should extract content using Readability when isProbablyReaderable returns true", () => {
      const mockArticle = {
        title: "Test Article",
        content:
          "<p>This is the article content with more than 800 characters...</p>",
        textContent:
          "This is the article content with more than 800 characters..." +
          "x".repeat(750),
        byline: "Test Author",
        excerpt: "Article excerpt",
      };

      vi.mocked(isProbablyReaderable).mockReturnValue(true);
      vi.mocked(Readability).mockImplementation(() => ({
        parse: vi.fn().mockReturnValue(mockArticle),
      }));

      const result = extractor.extractWithReadability(mockDocument);

      expect(result).toEqual({
        success: true,
        method: "readability",
        content: {
          text: mockArticle.textContent,
          title: mockArticle.title,
          html: mockArticle.content,
        },
        metadata: {
          byline: mockArticle.byline,
          excerpt: mockArticle.excerpt,
          siteName: null,
          publishedTime: null,
        },
      });
    });

    it("should return failure when isProbablyReaderable returns false", () => {
      vi.mocked(isProbablyReaderable).mockReturnValue(false);

      const result = extractor.extractWithReadability(mockDocument);

      expect(result).toEqual({
        success: false,
        method: "readability",
        error: "Document not suitable for Readability extraction",
      });
    });

    it("should return failure when Readability parse returns null", () => {
      vi.mocked(isProbablyReaderable).mockReturnValue(true);
      vi.mocked(Readability).mockImplementation(() => ({
        parse: vi.fn().mockReturnValue(null),
      }));

      const result = extractor.extractWithReadability(mockDocument);

      expect(result).toEqual({
        success: false,
        method: "readability",
        error: "Readability failed to extract content",
      });
    });

    it("should enforce minimum content length of 800 characters", () => {
      const shortArticle = {
        title: "Short Article",
        content: "<p>Short content</p>",
        textContent: "Short content",
        byline: null,
        excerpt: null,
      };

      vi.mocked(isProbablyReaderable).mockReturnValue(true);
      vi.mocked(Readability).mockImplementation(() => ({
        parse: vi.fn().mockReturnValue(shortArticle),
      }));

      const result = extractor.extractWithReadability(mockDocument);

      expect(result).toEqual({
        success: false,
        method: "readability",
        error: "Extracted content too short (minimum 800 characters required)",
      });
    });

    it("should clone document before passing to Readability to avoid DOM mutations", () => {
      const cloneSpy = vi.spyOn(mockDocument, "cloneNode");

      vi.mocked(isProbablyReaderable).mockReturnValue(false);

      extractor.extractWithReadability(mockDocument);

      expect(cloneSpy).toHaveBeenCalledWith(true);
    });

    it("should handle extraction errors gracefully", () => {
      vi.mocked(isProbablyReaderable).mockImplementation(() => {
        throw new Error("Readability error");
      });

      const result = extractor.extractWithReadability(mockDocument);

      expect(result).toEqual({
        success: false,
        method: "readability",
        error: "Readability extraction failed: Readability error",
      });
    });

    it("should preserve code blocks in extracted content", () => {
      const articleWithCode = {
        title: "Technical Article",
        content:
          "<p>Some text</p><pre><code>const x = 5;</code></pre><p>More text</p>",
        textContent:
          "Some text\n\n```\nconst x = 5;\n```\n\nMore text" + "x".repeat(760),
        byline: null,
        excerpt: null,
      };

      vi.mocked(isProbablyReaderable).mockReturnValue(true);
      vi.mocked(Readability).mockImplementation(() => ({
        parse: vi.fn().mockReturnValue(articleWithCode),
      }));

      const result = extractor.extractWithReadability(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).toContain("```");
    });

    it("should extract metadata when available", () => {
      const articleWithMetadata = {
        title: "Full Article",
        content: "<article>Content</article>",
        textContent: "x".repeat(800),
        byline: "John Doe",
        excerpt: "This is an excerpt",
        siteName: "Test Site",
        publishedTime: "2024-01-01",
      };

      vi.mocked(isProbablyReaderable).mockReturnValue(true);
      vi.mocked(Readability).mockImplementation(() => ({
        parse: vi.fn().mockReturnValue(articleWithMetadata),
      }));

      const result = extractor.extractWithReadability(mockDocument);

      expect(result.success).toBe(true);
      expect(result.metadata).toEqual({
        byline: "John Doe",
        excerpt: "This is an excerpt",
        siteName: "Test Site",
        publishedTime: "2024-01-01",
      });
    });
  });

  describe("Integration with extraction pipeline", () => {
    it("should be called as primary extraction method", () => {
      const extractReadabilitySpy = vi.spyOn(
        extractor,
        "extractWithReadability",
      );

      vi.mocked(isProbablyReaderable).mockReturnValue(true);
      vi.mocked(Readability).mockImplementation(() => ({
        parse: vi.fn().mockReturnValue({
          title: "Test",
          content: "<p>Content</p>",
          textContent: "x".repeat(800),
          byline: null,
          excerpt: null,
        }),
      }));

      extractor.extract(mockDocument);

      expect(extractReadabilitySpy).toHaveBeenCalledWith(mockDocument);
    });

    it("should fall back to heuristic extraction when Readability fails", () => {
      vi.mocked(isProbablyReaderable).mockReturnValue(false);

      const extractHeuristicSpy = vi.spyOn(extractor, "extractWithHeuristics");
      extractHeuristicSpy.mockReturnValue({
        success: true,
        method: "heuristic",
        content: { text: "x".repeat(800) },
      });

      const result = extractor.extract(mockDocument);

      expect(extractHeuristicSpy).toHaveBeenCalled();
      expect(result.method).toBe("heuristic");
    });
  });
});
