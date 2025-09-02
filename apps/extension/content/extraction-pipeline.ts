import { ContentExtractor, ExtractionResult } from "./extractor";
import { ManualSelectionMode } from "./manual-selection";
import { SiteExtractorFactory } from "../lib/extraction/registry/site-extractor-factory";
import { SPADetector } from "../lib/extraction/spa/spa-detector";
import { DOMAnalyzer } from "../lib/extraction/dom/dom-analyzer";

export interface PipelineOptions {
  timeout?: number;
  minimumContentLength?: number;
  preferredMethod?:
    | "readability"
    | "heuristic"
    | "site-specific"
    | "dom-analysis";
  skipSiteSpecific?: boolean;
  spaTimeout?: number;
  disabledMethods?: string[];
}

export interface PipelineMetrics {
  extractionTime: number;
  method: string;
  attempts?: number;
  breakdown?: {
    siteDetection: number;
    spaDetection: number;
    extraction: number;
    postProcessing: number;
  };
}

export interface PipelineResult extends ExtractionResult {
  requiresManualSelection?: boolean;
  metrics?: PipelineMetrics;
  suggestion?: string;
}

export interface ExtractionAnalytics {
  totalAttempts: number;
  successCount: number;
  successRate: number;
  methodBreakdown: Record<string, number>;
  manualSelectionRate: number;
  failurePatterns: Array<{
    pattern: string;
    count: number;
    urls: string[];
  }>;
  averageExtractionTime: number;
}

export class ExtractionPipeline {
  private extractor: ContentExtractor;
  private manualSelection: ManualSelectionMode;
  private siteFactory: SiteExtractorFactory;
  private spaDetector: SPADetector;
  private domAnalyzer: DOMAnalyzer;

  // Analytics tracking
  private analytics: {
    attempts: number;
    successes: number;
    methods: Record<string, number>;
    failures: Map<string, string[]>;
    totalTime: number;
  } = {
    attempts: 0,
    successes: 0,
    methods: {},
    failures: new Map(),
    totalTime: 0,
  };

  constructor() {
    this.extractor = new ContentExtractor();
    this.manualSelection = new ManualSelectionMode();
    this.siteFactory = new SiteExtractorFactory();
    this.spaDetector = new SPADetector();
    this.domAnalyzer = new DOMAnalyzer();
  }

  async extract(
    document: Document,
    url: string,
    options: PipelineOptions = {},
  ): Promise<PipelineResult> {
    const startTime = performance.now();
    const metrics: PipelineMetrics = {
      extractionTime: 0,
      method: "",
      breakdown: {
        siteDetection: 0,
        spaDetection: 0,
        extraction: 0,
        postProcessing: 0,
      },
    };

    this.analytics.attempts++;

    // Handle timeout by wrapping the extraction
    if (options.timeout) {
      return await this.extractWithTimeout(
        document,
        url,
        options,
        metrics,
        startTime,
      );
    }

    // Delegate to internal method for actual extraction
    return await this.extractInternal(
      document,
      url,
      options,
      metrics,
      startTime,
    );
  }

  private async extractInternal(
    document: Document,
    url: string,
    options: PipelineOptions,
    metrics: PipelineMetrics,
    startTime: number,
  ): Promise<PipelineResult> {
    try {
      // Stage 1: Site-specific extraction
      const siteStart = performance.now();
      if (
        !options.skipSiteSpecific &&
        !options.disabledMethods?.includes("site-specific")
      ) {
        const extractor = this.siteFactory.getExtractorForUrl(url, document);
        if (extractor) {
          try {
            const extractedContent = extractor.extract(document);
            if (
              extractedContent &&
              extractedContent.text.length >=
                (options.minimumContentLength || 800)
            ) {
              const result: ExtractionResult = {
                success: true,
                method: "readability" as const,
                content: {
                  text: extractedContent.text,
                  title:
                    typeof extractedContent.metadata?.title === "string"
                      ? extractedContent.metadata.title
                      : undefined,
                },
                metadata: extractedContent.metadata,
              };
              metrics.breakdown!.siteDetection = performance.now() - siteStart;
              metrics.method = "site-specific";
              metrics.extractionTime = performance.now() - startTime;
              this.trackSuccess("site-specific", url);
              this.logExtraction("site-specific", true, metrics);
              return { ...result, metrics } as PipelineResult;
            }
          } catch (error) {
            this.logExtraction("site-specific", false, metrics, error as Error);
          }
        }
      }
      metrics.breakdown!.siteDetection = performance.now() - siteStart;

      // Stage 2: SPA detection and waiting
      const spaStart = performance.now();
      const spaResult = this.spaDetector.detectSPA(document, window);
      let isSPA = spaResult.isSPA;
      if (isSPA) {
        const waitOptions = {
          timeout: options.spaTimeout || 3000,
          minStableTime: 500,
        };
        const waited = await this.spaDetector.waitForContent(
          document,
          waitOptions,
        );
        if (!waited) {
          this.trackFailure(url, "SPA content timeout");
          return {
            success: false,
            method: "readability",
            error: "SPA content failed to load within timeout",
            suggestion: "Try refreshing the page or using manual selection",
            metrics,
          };
        }
      }
      metrics.breakdown!.spaDetection = performance.now() - spaStart;

      // Stage 3: Try extraction methods in order
      const extractionStart = performance.now();

      // Try preferred method first if specified
      if (
        options.preferredMethod &&
        !options.disabledMethods?.includes(options.preferredMethod)
      ) {
        const result = await this.tryExtractionMethod(
          options.preferredMethod,
          document,
        );
        if (result.success) {
          metrics.breakdown!.extraction = performance.now() - extractionStart;
          metrics.method = options.preferredMethod;
          metrics.extractionTime = performance.now() - startTime;
          this.trackSuccess(options.preferredMethod, url);
          this.logExtraction(options.preferredMethod, true, metrics);
          return {
            ...result,
            metrics,
            metadata: result.metadata,
          };
        }
      }

      // Try Readability
      if (!options.disabledMethods?.includes("readability")) {
        const readabilityResult =
          this.extractor.extractWithReadability(document);
        if (readabilityResult.success) {
          metrics.breakdown!.extraction = performance.now() - extractionStart;
          metrics.method = "readability";
          metrics.extractionTime = performance.now() - startTime;
          this.trackSuccess("readability", url);
          this.logExtraction("readability", true, metrics);
          return {
            ...readabilityResult,
            metrics,
            metadata: { ...readabilityResult.metadata },
          };
        }
      }

      // Try DOM Analysis
      if (!options.disabledMethods?.includes("dom-analysis")) {
        const domResult = this.domAnalyzer.analyzeContent(document);
        if (
          domResult.mainContent &&
          domResult.mainContent.textContent &&
          domResult.mainContent.textContent.length >=
            (options.minimumContentLength || 800)
        ) {
          metrics.breakdown!.extraction = performance.now() - extractionStart;
          metrics.method = "dom-analysis";
          metrics.extractionTime = performance.now() - startTime;
          this.trackSuccess("dom-analysis", url);
          this.logExtraction("dom-analysis", true, metrics);
          return {
            success: true,
            method: "readability" as const,
            content: {
              text: domResult.mainContent.textContent,
              title: undefined,
            },
            metrics,
            metadata: {},
          };
        }
      }

      // Try Heuristics
      if (!options.disabledMethods?.includes("heuristic")) {
        const heuristicResult = this.extractor.extractWithHeuristics(document);
        if (heuristicResult.success) {
          metrics.breakdown!.extraction = performance.now() - extractionStart;
          metrics.method = "heuristic";
          metrics.extractionTime = performance.now() - startTime;
          this.trackSuccess("heuristic", url);
          this.logExtraction("heuristic", true, metrics);
          return {
            ...heuristicResult,
            metrics,
            metadata: { ...heuristicResult.metadata },
          };
        }
      }

      metrics.breakdown!.extraction = performance.now() - extractionStart;

      // All methods failed - suggest manual selection
      this.trackFailure(url, "All automatic methods failed");
      this.logExtraction("all", false, metrics);

      return {
        success: false,
        method: "readability",
        error: "Manual selection required - automatic extraction failed",
        requiresManualSelection: true,
        suggestion:
          "Click 'Select Manually' to choose the content you want to extract",
        metrics,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.trackFailure(url, errorMessage);

      // Handle specific error types
      if (errorMessage.includes("Document mutated")) {
        return {
          success: false,
          method: "readability",
          error: "Document mutated during extraction",
          suggestion:
            "The page content changed during extraction. Please try again.",
          metrics,
        };
      }

      return {
        success: false,
        method: "readability",
        error: errorMessage,
        metrics,
      };
    } finally {
      this.analytics.totalTime += performance.now() - startTime;
    }
  }

  private async extractWithTimeout(
    document: Document,
    url: string,
    options: PipelineOptions,
    metrics: PipelineMetrics,
    startTime: number,
  ): Promise<PipelineResult> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.trackFailure(url, "Extraction timeout");
        resolve({
          success: false,
          method: "readability",
          error: `Extraction timeout after ${options.timeout}ms`,
          suggestion:
            "The page is taking too long to process. Try manual selection instead.",
          metrics,
        });
      }, options.timeout);

      // Use internal extraction method to prevent recursion
      this.extractInternal(
        document,
        url,
        { ...options, timeout: undefined },
        metrics,
        startTime,
      )
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            method: "readability",
            error: error.message,
            metrics,
          });
        });
    });
  }

  private async tryExtractionMethod(
    method: string,
    document: Document,
  ): Promise<ExtractionResult> {
    switch (method) {
      case "readability":
        return this.extractor.extractWithReadability(document);
      case "heuristic":
        return this.extractor.extractWithHeuristics(document);
      case "dom-analysis": {
        const domResult = this.domAnalyzer.analyzeContent(document);
        if (domResult.mainContent) {
          const text = domResult.mainContent.textContent || "";
          return {
            success: text.length > 800,
            method: "readability" as const,
            content: {
              text,
              title: undefined,
            },
            metadata: {},
          };
        }
        return {
          success: false,
          method: "readability" as const,
          error: "No main content found",
        };
      }
      default:
        return {
          success: false,
          method: "readability" as const,
          error: `Unknown extraction method: ${method}`,
        };
    }
  }

  async enableManualSelection(_document: Document): Promise<void> {
    this.manualSelection.activate();
    this.logExtraction(
      "manual",
      false,
      undefined,
      undefined,
      "Manual selection activated",
    );
  }

  async completeManualSelection(_document: Document): Promise<PipelineResult> {
    const startTime = performance.now();

    try {
      const result = this.manualSelection.getExtractionResult();

      const metrics: PipelineMetrics = {
        extractionTime: performance.now() - startTime,
        method: "manual",
      };

      if (result.success) {
        this.trackSuccess("manual", window.location.href);
        this.logExtraction("manual", true, metrics);
      }

      return { ...result, metrics } as PipelineResult;
    } catch (error) {
      const errorMetrics: PipelineMetrics = {
        extractionTime: performance.now() - startTime,
        method: "manual",
      };
      return {
        success: false,
        method: "manual" as const,
        error:
          error instanceof Error ? error.message : "Manual selection failed",
        metrics: errorMetrics,
      };
    }
  }

  private trackSuccess(method: string, _url?: string): void {
    this.analytics.successes++;
    this.analytics.methods[method] = (this.analytics.methods[method] || 0) + 1;
  }

  private trackFailure(url: string, error: string): void {
    // Extract failure pattern
    const pattern = this.extractFailurePattern(error);

    if (!this.analytics.failures.has(pattern)) {
      this.analytics.failures.set(pattern, []);
    }

    const urls = this.analytics.failures.get(pattern)!;
    if (!urls.includes(url)) {
      urls.push(url);
      // Limit URLs per pattern to prevent unbounded growth
      if (urls.length > 100) {
        urls.shift(); // Remove oldest entry
      }
    }
  }

  private extractFailurePattern(error: string): string {
    // Extract common patterns from error messages
    if (error.includes("Content too short")) {
      return "Content too short";
    }
    if (error.includes("timeout")) {
      return "Timeout";
    }
    if (error.includes("SPA")) {
      return "SPA loading failed";
    }
    if (error.includes("Document mutated")) {
      return "Document mutation";
    }
    if (error.includes("not readable")) {
      return "Not readable";
    }
    return "Other";
  }

  private logExtraction(
    method: string,
    success: boolean,
    metrics?: PipelineMetrics,
    error?: Error,
    message?: string,
  ): void {
    const logData = {
      method,
      success,
      metrics,
      error: error?.message,
      message,
      timestamp: new Date().toISOString(),
    };

    console.log("[ExtractionPipeline]", logData);
  }

  getAnalytics(): ExtractionAnalytics {
    const successRate =
      this.analytics.attempts > 0
        ? this.analytics.successes / this.analytics.attempts
        : 0;

    const manualCount = this.analytics.methods.manual || 0;
    const manualSelectionRate =
      this.analytics.attempts > 0 ? manualCount / this.analytics.attempts : 0;

    const failurePatterns = Array.from(this.analytics.failures.entries()).map(
      ([pattern, urls]) => ({
        pattern,
        count: urls.length,
        urls,
      }),
    );

    const averageExtractionTime =
      this.analytics.attempts > 0
        ? this.analytics.totalTime / this.analytics.attempts
        : 0;

    return {
      totalAttempts: this.analytics.attempts,
      successCount: this.analytics.successes,
      successRate,
      methodBreakdown: this.analytics.methods,
      manualSelectionRate,
      failurePatterns,
      averageExtractionTime,
    };
  }

  resetAnalytics(): void {
    this.analytics = {
      attempts: 0,
      successes: 0,
      methods: {},
      failures: new Map(),
      totalTime: 0,
    };
  }
}
