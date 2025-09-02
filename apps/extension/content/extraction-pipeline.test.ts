import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ExtractionPipeline } from "./extraction-pipeline";
import { ContentExtractor } from "./extractor";
import { ManualSelectionMode } from "./manual-selection";
import { SiteExtractorFactory } from "../lib/extraction/registry/site-extractor-factory";
import { SPADetector } from "../lib/extraction/spa/spa-detector";
import { DOMAnalyzer } from "../lib/extraction/dom/dom-analyzer";

vi.mock("./extractor");
vi.mock("./manual-selection");
vi.mock("../lib/extraction/registry/site-extractor-factory");
vi.mock("../lib/extraction/spa/spa-detector");
vi.mock("../lib/extraction/dom/dom-analyzer");

describe("ExtractionPipeline", () => {
  let pipeline: ExtractionPipeline;
  let mockDocument: Document;
  let mockExtractor: ContentExtractor;
  let mockManualSelection: ManualSelectionMode;
  let mockSiteFactory: SiteExtractorFactory;
  let mockSPADetector: SPADetector;
  let mockDOMAnalyzer: DOMAnalyzer;

  beforeEach(() => {
    mockDocument = document.implementation.createHTMLDocument("Test");

    mockExtractor = new ContentExtractor();
    mockManualSelection = new ManualSelectionMode();
    mockSiteFactory = new SiteExtractorFactory();
    mockSPADetector = new SPADetector();
    mockDOMAnalyzer = new DOMAnalyzer();

    pipeline = new ExtractionPipeline();

    // Reset performance.now for metrics testing
    vi.spyOn(performance, "now").mockReturnValue(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Extraction Flow", () => {
    it("should try site-specific extractor first for supported sites", async () => {
      const mockResult = {
        success: true,
        method: "site-specific" as const,
        content: {
          text: "GitHub README content",
          title: "Repository Title",
        },
        metadata: {
          site: "github.com",
          extractorType: "github",
        },
      };

      vi.spyOn(mockSiteFactory, "canHandle").mockReturnValue(true);
      vi.spyOn(mockSiteFactory, "extract").mockResolvedValue(mockResult);

      const result = await pipeline.extract(
        mockDocument,
        "https://github.com/user/repo",
      );

      expect(result.method).toBe("site-specific");
      expect(result.metadata?.extractorType).toBe("github");
      expect(mockSiteFactory.canHandle).toHaveBeenCalledWith(
        "https://github.com/user/repo",
      );
    });

    it("should detect and wait for SPA content before extraction", async () => {
      vi.spyOn(mockSPADetector, "isSPA").mockReturnValue(true);
      vi.spyOn(mockSPADetector, "waitForContent").mockResolvedValue(true);

      vi.spyOn(mockExtractor, "extract").mockReturnValue({
        success: true,
        method: "readability",
        content: { text: "Dynamic content loaded" },
      });

      const result = await pipeline.extract(
        mockDocument,
        "https://app.example.com",
      );

      expect(mockSPADetector.isSPA).toHaveBeenCalled();
      expect(mockSPADetector.waitForContent).toHaveBeenCalled();
      expect(result.metadata?.spa).toBe(true);
    });

    it("should fall back through extraction methods in order", async () => {
      // Site-specific fails
      vi.spyOn(mockSiteFactory, "canHandle").mockReturnValue(false);

      // Readability fails
      vi.spyOn(mockExtractor, "extractWithReadability").mockReturnValue({
        success: false,
        method: "readability",
        error: "Not readable",
      });

      // DOM analysis succeeds
      vi.spyOn(mockDOMAnalyzer, "analyze").mockReturnValue({
        success: true,
        method: "dom-analysis",
        content: { text: "DOM analyzed content" },
        metadata: { score: 150 },
      });

      const result = await pipeline.extract(
        mockDocument,
        "https://example.com",
      );

      expect(result.method).toBe("dom-analysis");
      expect(result.metadata?.score).toBe(150);
    });

    it("should enable manual selection as final fallback", async () => {
      // All automatic methods fail
      vi.spyOn(mockSiteFactory, "canHandle").mockReturnValue(false);
      vi.spyOn(mockExtractor, "extract").mockReturnValue({
        success: false,
        method: "readability",
        error: "All methods failed",
      });
      vi.spyOn(mockDOMAnalyzer, "analyze").mockReturnValue({
        success: false,
        method: "dom-analysis",
        error: "No suitable content",
      });

      const result = await pipeline.extract(
        mockDocument,
        "https://example.com",
      );

      expect(result.success).toBe(false);
      expect(result.requiresManualSelection).toBe(true);
      expect(result.error).toContain("Manual selection required");
    });
  });

  describe("Performance Metrics", () => {
    it("should track extraction time for each method", async () => {
      let timeCounter = 0;
      vi.spyOn(performance, "now").mockImplementation(
        () => (timeCounter += 100),
      );

      vi.spyOn(mockExtractor, "extract").mockReturnValue({
        success: true,
        method: "readability",
        content: { text: "Content" },
      });

      const result = await pipeline.extract(
        mockDocument,
        "https://example.com",
      );

      expect(result.metrics?.extractionTime).toBeGreaterThan(0);
      expect(result.metrics?.method).toBe("readability");
    });

    it("should track attempt count for retries", async () => {
      vi.spyOn(mockSPADetector, "isSPA").mockReturnValue(true);

      let attemptCount = 0;
      vi.spyOn(mockSPADetector, "waitForContent").mockImplementation(
        async () => {
          attemptCount++;
          return attemptCount > 2;
        },
      );

      vi.spyOn(mockExtractor, "extract").mockReturnValue({
        success: true,
        method: "readability",
        content: { text: "Content after retries" },
      });

      const result = await pipeline.extract(
        mockDocument,
        "https://spa.example.com",
      );

      expect(result.metrics?.attempts).toBe(3);
    });

    it("should include performance breakdown by stage", async () => {
      const result = await pipeline.extract(
        mockDocument,
        "https://example.com",
      );

      expect(result.metrics?.breakdown).toHaveProperty("siteDetection");
      expect(result.metrics?.breakdown).toHaveProperty("spaDetection");
      expect(result.metrics?.breakdown).toHaveProperty("extraction");
      expect(result.metrics?.breakdown).toHaveProperty("postProcessing");
    });
  });

  describe("Analytics and Logging", () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, "log").mockImplementation();
    });

    it("should log extraction attempts with method and result", async () => {
      vi.spyOn(mockExtractor, "extract").mockReturnValue({
        success: true,
        method: "heuristic",
        content: { text: "Content" },
      });

      await pipeline.extract(mockDocument, "https://example.com");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ExtractionPipeline]"),
        expect.objectContaining({
          method: "heuristic",
          success: true,
        }),
      );
    });

    it("should track success rate over multiple extractions", async () => {
      vi.spyOn(mockExtractor, "extract")
        .mockReturnValueOnce({
          success: true,
          method: "readability",
          content: { text: "1" },
        })
        .mockReturnValueOnce({
          success: false,
          method: "readability",
          error: "Failed",
        })
        .mockReturnValueOnce({
          success: true,
          method: "heuristic",
          content: { text: "3" },
        });

      await pipeline.extract(mockDocument, "https://example1.com");
      await pipeline.extract(mockDocument, "https://example2.com");
      await pipeline.extract(mockDocument, "https://example3.com");

      const analytics = pipeline.getAnalytics();

      expect(analytics.totalAttempts).toBe(3);
      expect(analytics.successCount).toBe(2);
      expect(analytics.successRate).toBeCloseTo(0.667, 2);
      expect(analytics.methodBreakdown.readability).toBe(1);
      expect(analytics.methodBreakdown.heuristic).toBe(1);
    });

    it("should identify failure patterns", async () => {
      vi.spyOn(mockExtractor, "extract").mockReturnValue({
        success: false,
        method: "readability",
        error: "Content too short: 500 characters",
      });

      await pipeline.extract(mockDocument, "https://short1.com");
      await pipeline.extract(mockDocument, "https://short2.com");

      const analytics = pipeline.getAnalytics();

      expect(analytics.failurePatterns).toContainEqual({
        pattern: "Content too short",
        count: 2,
        urls: ["https://short1.com", "https://short2.com"],
      });
    });
  });

  describe("Manual Selection Integration", () => {
    it("should activate manual selection when requested", async () => {
      const activateSpy = vi.spyOn(mockManualSelection, "activate");

      await pipeline.enableManualSelection(mockDocument);

      expect(activateSpy).toHaveBeenCalled();
    });

    it("should handle manual selection completion", async () => {
      const mockSelectionResult = {
        success: true,
        method: "manual" as const,
        content: {
          text: "Manually selected content",
          title: "Page Title",
        },
        metadata: {
          selectionCount: 2,
          totalCharacters: 1500,
        },
      };

      vi.spyOn(mockManualSelection, "getExtractionResult").mockReturnValue(
        mockSelectionResult,
      );

      const result = await pipeline.completeManualSelection(mockDocument);

      expect(result).toEqual(mockSelectionResult);
      expect(result.method).toBe("manual");
    });

    it("should track manual selection metrics", async () => {
      vi.spyOn(mockManualSelection, "getExtractionResult").mockReturnValue({
        success: true,
        method: "manual",
        content: { text: "Selected" },
      });

      await pipeline.completeManualSelection(mockDocument);

      const analytics = pipeline.getAnalytics();

      expect(analytics.methodBreakdown.manual).toBe(1);
      expect(analytics.manualSelectionRate).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle extraction timeout gracefully", async () => {
      vi.spyOn(mockExtractor, "extract").mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)),
      );

      const result = await pipeline.extract(mockDocument, "https://slow.com", {
        timeout: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("timeout");
    });

    it("should handle document mutation during extraction", async () => {
      vi.spyOn(mockExtractor, "extract").mockImplementation(() => {
        // Simulate document being modified
        mockDocument.body.innerHTML = "";
        throw new Error("Document mutated during extraction");
      });

      const result = await pipeline.extract(
        mockDocument,
        "https://mutable.com",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Document mutated");
    });

    it("should provide helpful error messages for common failures", async () => {
      vi.spyOn(mockExtractor, "extract").mockReturnValue({
        success: false,
        method: "readability",
        error: "Content too short: 100 characters (minimum 800 required)",
      });

      const result = await pipeline.extract(mockDocument, "https://short.com");

      expect(result.error).toContain("minimum 800 required");
      expect(result.suggestion).toContain(
        "Try selecting more content manually",
      );
    });
  });

  describe("Configuration", () => {
    it("should respect custom extraction options", async () => {
      const options = {
        minimumContentLength: 500,
        preferredMethod: "heuristic" as const,
        skipSiteSpecific: true,
        spaTimeout: 5000,
      };

      vi.spyOn(mockExtractor, "extractWithHeuristics").mockReturnValue({
        success: true,
        method: "heuristic",
        content: { text: "Heuristic content" },
      });

      const result = await pipeline.extract(
        mockDocument,
        "https://example.com",
        options,
      );

      expect(mockSiteFactory.canHandle).not.toHaveBeenCalled();
      expect(mockExtractor.extractWithHeuristics).toHaveBeenCalled();
      expect(result.method).toBe("heuristic");
    });

    it("should allow disabling specific extraction methods", async () => {
      const options = {
        disabledMethods: ["readability", "heuristic"],
      };

      vi.spyOn(mockDOMAnalyzer, "analyze").mockReturnValue({
        success: true,
        method: "dom-analysis",
        content: { text: "DOM content" },
      });

      const result = await pipeline.extract(
        mockDocument,
        "https://example.com",
        options,
      );

      expect(mockExtractor.extractWithReadability).not.toHaveBeenCalled();
      expect(mockExtractor.extractWithHeuristics).not.toHaveBeenCalled();
      expect(result.method).toBe("dom-analysis");
    });
  });
});
