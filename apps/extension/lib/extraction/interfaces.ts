/**
 * Abstract interfaces for extraction layer
 *
 * These interfaces define the contract between extraction and summarization layers,
 * ensuring clean separation of concerns and enabling future extensibility.
 */

/**
 * Core extraction result from content extraction pipeline
 */
export interface ExtractedContent {
  text: string;
  charCount: number;
  metadata?: ContentMetadata;
  error?: string;
}

/**
 * Metadata extracted from the content
 */
export interface ContentMetadata {
  title?: string;
  url?: string;
  extractedAt?: string;
  author?: string;
  publishedDate?: string;
  wordCount?: number;
  description?: string;
  imageUrl?: string;
  siteName?: string;
}

/**
 * Extraction pipeline configuration
 */
export interface ExtractionConfig {
  timeout?: number;
  minimumContentLength?: number;
  preferredMethod?: ExtractionMethod;
  skipSiteSpecific?: boolean;
  spaTimeout?: number;
  disabledMethods?: string[];
}

/**
 * Available extraction methods
 */
export type ExtractionMethod =
  | "readability"
  | "heuristic"
  | "site-specific"
  | "dom-analysis"
  | "manual";

/**
 * Extraction performance metrics
 */
export interface ExtractionMetrics {
  extractionTime: number;
  method: ExtractionMethod;
  attempts?: number;
  breakdown?: {
    siteDetection: number;
    spaDetection: number;
    extraction: number;
    postProcessing: number;
  };
}

/**
 * Complete extraction result with metrics
 */
export interface ExtractionResult {
  content: ExtractedContent;
  metrics?: ExtractionMetrics;
  requiresManualSelection?: boolean;
  suggestion?: string;
}

/**
 * Abstract interface for content extractors
 * All extractors must implement this interface
 */
export interface IContentExtractor {
  extract(
    document: Document,
    url: string,
    config?: ExtractionConfig,
  ): Promise<ExtractionResult>;

  /**
   * Check if this extractor can handle the given URL/document
   */
  canHandle?(url: string, document?: Document): boolean;

  /**
   * Priority for this extractor (higher = tried first)
   */
  priority?: number;
}

/**
 * Site-specific extractor interface
 */
export interface ISiteExtractor extends IContentExtractor {
  /**
   * Domains this extractor handles
   */
  supportedDomains: string[];

  /**
   * Extract content using site-specific logic
   */
  extractSiteContent(document: Document): ExtractedContent;
}

/**
 * Extraction pipeline interface
 * Orchestrates multiple extractors and fallback strategies
 */
export interface IExtractionPipeline {
  /**
   * Main extraction method with fallback chain
   */
  extract(
    document: Document,
    url: string,
    config?: ExtractionConfig,
  ): Promise<ExtractionResult>;

  /**
   * Register a custom extractor
   */
  registerExtractor?(extractor: IContentExtractor): void;

  /**
   * Get extraction analytics
   */
  getAnalytics?(): ExtractionAnalytics;
}

/**
 * Analytics for extraction performance tracking
 */
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

/**
 * Factory for creating extractors
 */
export interface IExtractorFactory {
  /**
   * Create an extractor for the given URL
   */
  createExtractor(url: string): IContentExtractor | null;

  /**
   * Register a new extractor type
   */
  registerExtractor(
    pattern: string | RegExp,
    extractor: IContentExtractor,
  ): void;
}

// Re-export types that are already well-defined
export type { PipelineResult } from "../../content/extraction-pipeline";
