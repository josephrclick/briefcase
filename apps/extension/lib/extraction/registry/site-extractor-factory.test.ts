import { describe, it, expect, beforeEach, vi } from "vitest";
import { SiteExtractorFactory } from "./site-extractor-factory";
import type { IContentExtractor, ExtractedContent } from "../types";

class MockExtractor implements IContentExtractor {
  constructor(
    private urlPattern: RegExp,
    private priority: number = 10,
    private shouldExtract: boolean = true,
  ) {}

  canHandle(url: string, doc: Document): boolean {
    return this.urlPattern.test(url);
  }

  extract(doc: Document): ExtractedContent | null {
    if (!this.shouldExtract) return null;
    return {
      text:
        "Mock extracted content with sufficient length to pass minimum requirements. " +
        "This content simulates a successful extraction from the mock extractor. " +
        "It includes multiple sentences to ensure proper testing of the extraction pipeline.",
      title: "Mock Title",
      wordCount: 50,
    };
  }

  getPriority(): number {
    return this.priority;
  }
}

describe("SiteExtractorFactory", () => {
  let factory: SiteExtractorFactory;
  let mockDocument: Document;

  beforeEach(() => {
    factory = new SiteExtractorFactory();
    mockDocument = document.implementation.createHTMLDocument("Test");
  });

  describe("register", () => {
    it("should register extractors", () => {
      const extractor = new MockExtractor(/github\.com/);
      factory.register(extractor);

      expect(factory.getAllExtractors()).toContain(extractor);
    });

    it("should register multiple extractors", () => {
      const github = new MockExtractor(/github\.com/);
      const stackoverflow = new MockExtractor(/stackoverflow\.com/);

      factory.register(github);
      factory.register(stackoverflow);

      const extractors = factory.getAllExtractors();
      expect(extractors).toContain(github);
      expect(extractors).toContain(stackoverflow);
    });
  });

  describe("getExtractorForUrl", () => {
    it("should return matching extractor for URL", () => {
      const github = new MockExtractor(/github\.com/);
      const stackoverflow = new MockExtractor(/stackoverflow\.com/);

      factory.register(github);
      factory.register(stackoverflow);

      expect(
        factory.getExtractorForUrl(
          "https://github.com/user/repo",
          mockDocument,
        ),
      ).toBe(github);
      expect(
        factory.getExtractorForUrl(
          "https://stackoverflow.com/questions/123",
          mockDocument,
        ),
      ).toBe(stackoverflow);
    });

    it("should return null for non-matching URL", () => {
      const github = new MockExtractor(/github\.com/);
      factory.register(github);

      expect(
        factory.getExtractorForUrl("https://example.com", mockDocument),
      ).toBeNull();
    });

    it("should return highest priority extractor when multiple match", () => {
      const genericDocs = new MockExtractor(/.*/, 5);
      const specificGithub = new MockExtractor(/github\.com/, 10);

      factory.register(genericDocs);
      factory.register(specificGithub);

      expect(
        factory.getExtractorForUrl(
          "https://github.com/user/repo",
          mockDocument,
        ),
      ).toBe(specificGithub);
    });

    it("should sort extractors by priority on first access", () => {
      const low = new MockExtractor(/low\.com/, 1);
      const medium = new MockExtractor(/medium\.com/, 5);
      const high = new MockExtractor(/high\.com/, 10);

      factory.register(medium);
      factory.register(low);
      factory.register(high);

      factory.getExtractorForUrl("https://test.com", mockDocument);

      const extractors = factory.getAllExtractors();
      expect(extractors[0]).toBe(high);
      expect(extractors[1]).toBe(medium);
      expect(extractors[2]).toBe(low);
    });
  });

  describe("extractContent", () => {
    it("should extract content using matching extractor", () => {
      const github = new MockExtractor(/github\.com/);
      factory.register(github);

      const result = factory.extractContent(
        "https://github.com/user/repo",
        mockDocument,
      );

      expect(result).toBeTruthy();
      expect(result?.text).toContain("Mock extracted content");
      expect(result?.title).toBe("Mock Title");
    });

    it("should return null when no extractor matches", () => {
      const github = new MockExtractor(/github\.com/);
      factory.register(github);

      const result = factory.extractContent(
        "https://example.com",
        mockDocument,
      );

      expect(result).toBeNull();
    });

    it("should return null when extractor fails", () => {
      const failing = new MockExtractor(/github\.com/, 10, false);
      factory.register(failing);

      const result = factory.extractContent(
        "https://github.com/user/repo",
        mockDocument,
      );

      expect(result).toBeNull();
    });

    it("should try extractors in priority order", () => {
      const failingHigh = new MockExtractor(/github\.com/, 10, false);
      const successLow = new MockExtractor(/github\.com/, 5, true);

      factory.register(failingHigh);
      factory.register(successLow);

      const result = factory.extractContent(
        "https://github.com/user/repo",
        mockDocument,
      );

      expect(result).toBeTruthy();
      expect(result?.text).toContain("Mock extracted content");
    });
  });

  describe("getAllExtractors", () => {
    it("should return empty array when no extractors registered", () => {
      expect(factory.getAllExtractors()).toEqual([]);
    });

    it("should return all registered extractors", () => {
      const e1 = new MockExtractor(/test1/);
      const e2 = new MockExtractor(/test2/);
      const e3 = new MockExtractor(/test3/);

      factory.register(e1);
      factory.register(e2);
      factory.register(e3);

      const extractors = factory.getAllExtractors();
      expect(extractors).toHaveLength(3);
      expect(extractors).toContain(e1);
      expect(extractors).toContain(e2);
      expect(extractors).toContain(e3);
    });
  });

  describe("initialization with default extractors", () => {
    it("should register default extractors on creation", () => {
      const factoryWithDefaults = SiteExtractorFactory.withDefaultExtractors();
      const extractors = factoryWithDefaults.getAllExtractors();

      expect(extractors.length).toBeGreaterThan(0);

      const githubExtractor = factoryWithDefaults.getExtractorForUrl(
        "https://github.com/user/repo",
        mockDocument,
      );
      expect(githubExtractor).toBeTruthy();

      const stackoverflowExtractor = factoryWithDefaults.getExtractorForUrl(
        "https://stackoverflow.com/questions/123",
        mockDocument,
      );
      expect(stackoverflowExtractor).toBeTruthy();
    });
  });

  describe("URL pattern matching", () => {
    it("should handle URLs with query parameters", () => {
      const github = new MockExtractor(/github\.com/);
      factory.register(github);

      expect(
        factory.getExtractorForUrl(
          "https://github.com/repo?tab=readme",
          mockDocument,
        ),
      ).toBe(github);
    });

    it("should handle URLs with hash fragments", () => {
      const github = new MockExtractor(/github\.com/);
      factory.register(github);

      expect(
        factory.getExtractorForUrl(
          "https://github.com/repo#installation",
          mockDocument,
        ),
      ).toBe(github);
    });

    it("should handle subdomains", () => {
      const docs = new MockExtractor(/docs\..*\.com/);
      factory.register(docs);

      expect(
        factory.getExtractorForUrl(
          "https://docs.example.com/guide",
          mockDocument,
        ),
      ).toBe(docs);
    });
  });
});
