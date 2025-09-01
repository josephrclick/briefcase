import { SemanticAnalyzer } from "./semantic-analyzer";
import { ContentDensityAnalyzer } from "./content-density-analyzer";
import { VisualHierarchyAnalyzer } from "./visual-hierarchy-analyzer";

export interface ContentAnalysisResult {
  mainContent: HTMLElement | null;
  confidence: number;
  method: string;
  contentDensity?: number;
  textToNoiseRatio?: number;
  cleanText?: string;
  visualHierarchy?: {
    primary: string | null;
  };
  visualImportance?: number;
  metadata?: {
    title?: string;
    author?: string;
    description?: string;
  };
}

export interface ExtractionResult {
  success: boolean;
  content?: string;
  element?: HTMLElement;
  strategiesAttempted: number;
  successfulStrategy?: string;
  error?: string;
}

export class DOMAnalyzer {
  private semanticAnalyzer: SemanticAnalyzer;
  private densityAnalyzer: ContentDensityAnalyzer;
  private visualAnalyzer: VisualHierarchyAnalyzer;

  constructor() {
    this.semanticAnalyzer = new SemanticAnalyzer();
    this.densityAnalyzer = new ContentDensityAnalyzer();
    this.visualAnalyzer = new VisualHierarchyAnalyzer();
  }

  analyzeContent(doc: Document): ContentAnalysisResult {
    // Try semantic HTML5 first
    const semanticResult = this.semanticAnalyzer.analyze(doc);

    if (semanticResult.primaryElement && semanticResult.confidence > 0.7) {
      return {
        mainContent: semanticResult.primaryElement,
        confidence: semanticResult.confidence,
        method: "semantic-html5",
        ...this.extractMetadata(doc),
        ...this.calculateTextMetrics(semanticResult.primaryElement),
      };
    }

    // Try ARIA roles (but only if not already found via semantic HTML)
    if (!semanticResult.primaryElement && semanticResult.landmarks.main) {
      // Check if the main landmark is from ARIA role or HTML5 element
      const hasAriaRole = semanticResult.landmarks.main.hasAttribute("role");
      return {
        mainContent: semanticResult.landmarks.main,
        confidence: Math.max(0.7, semanticResult.confidence),
        method: hasAriaRole ? "aria-roles" : "semantic-html5",
        ...this.extractMetadata(doc),
        ...this.calculateTextMetrics(semanticResult.landmarks.main),
      };
    }

    // Try content density analysis
    const densityResult = this.densityAnalyzer.analyze(doc);

    if (densityResult.primaryBlock && densityResult.primaryBlock.score > 0.5) {
      return {
        mainContent: densityResult.primaryBlock.element,
        confidence: densityResult.primaryBlock.score,
        method: "content-density",
        contentDensity: densityResult.primaryBlock.score,
        ...this.extractMetadata(doc),
        ...this.calculateTextMetrics(densityResult.primaryBlock.element),
      };
    }

    // Try visual hierarchy
    const visualResult = this.visualAnalyzer.analyze(doc);

    if (visualResult.primary) {
      const element = this.findElementById(doc, visualResult.primary);
      if (element) {
        return {
          mainContent: element,
          confidence: visualResult.visualImportance,
          method: "visual-hierarchy",
          visualHierarchy: {
            primary: visualResult.primary,
          },
          visualImportance: visualResult.visualImportance,
          ...this.extractMetadata(doc),
          ...this.calculateTextMetrics(element),
        };
      }
    }

    // Fallback to heuristic approach
    const heuristicElement = this.findByHeuristics(doc);

    if (heuristicElement) {
      return {
        mainContent: heuristicElement,
        confidence: 0.4,
        method: "heuristic-fallback",
        ...this.extractMetadata(doc),
        ...this.calculateTextMetrics(heuristicElement),
      };
    }

    // No content found
    return {
      mainContent: null,
      confidence: 0,
      method: "none",
      ...this.extractMetadata(doc),
    };
  }

  getExtractionStrategies(): string[] {
    return [
      "semantic-html5",
      "aria-roles",
      "content-density",
      "visual-hierarchy",
      "text-to-noise",
      "heuristic-fallback",
    ];
  }

  extractWithFallback(doc: Document): ExtractionResult {
    const strategies = this.getExtractionStrategies();
    let strategiesAttempted = 0;

    for (const strategy of strategies) {
      strategiesAttempted++;

      try {
        const result = this.tryStrategy(doc, strategy);

        if (result.success && result.content && result.content.length > 100) {
          return {
            success: true,
            content: result.content,
            element: result.element,
            strategiesAttempted,
            successfulStrategy: strategy,
          };
        }
      } catch (error) {
        // Continue to next strategy
        console.debug(`Strategy ${strategy} failed:`, error);
      }
    }

    return {
      success: false,
      strategiesAttempted,
      error: "All extraction strategies failed",
    };
  }

  private tryStrategy(doc: Document, strategy: string): ExtractionResult {
    switch (strategy) {
      case "semantic-html5": {
        const result = this.semanticAnalyzer.analyze(doc);
        if (result.primaryElement) {
          const content = this.extractText(result.primaryElement);
          return {
            success: true,
            content,
            element: result.primaryElement,
            strategiesAttempted: 1,
            successfulStrategy: strategy,
          };
        }
        break;
      }

      case "aria-roles": {
        const result = this.semanticAnalyzer.analyze(doc);
        if (result.landmarks.main) {
          const content = this.extractText(result.landmarks.main);
          return {
            success: true,
            content,
            element: result.landmarks.main,
            strategiesAttempted: 1,
            successfulStrategy: strategy,
          };
        }
        break;
      }

      case "content-density": {
        const result = this.densityAnalyzer.analyze(doc);
        if (result.primaryBlock) {
          const content = this.extractText(result.primaryBlock.element);
          return {
            success: true,
            content,
            element: result.primaryBlock.element,
            strategiesAttempted: 1,
            successfulStrategy: strategy,
          };
        }
        break;
      }

      case "visual-hierarchy": {
        const result = this.visualAnalyzer.analyze(doc);
        if (result.primary) {
          const element = this.findElementById(doc, result.primary);
          if (element) {
            const content = this.extractText(element);
            return {
              success: true,
              content,
              element,
              strategiesAttempted: 1,
              successfulStrategy: strategy,
            };
          }
        }
        break;
      }

      case "text-to-noise": {
        const element = this.findByTextToNoise(doc);
        if (element) {
          const content = this.extractText(element);
          return {
            success: true,
            content,
            element,
            strategiesAttempted: 1,
            successfulStrategy: strategy,
          };
        }
        break;
      }

      case "heuristic-fallback": {
        const element = this.findByHeuristics(doc);
        if (element) {
          const content = this.extractText(element);
          return {
            success: true,
            content,
            element,
            strategiesAttempted: 1,
            successfulStrategy: strategy,
          };
        }
        break;
      }
    }

    return {
      success: false,
      strategiesAttempted: 1,
      error: `Strategy ${strategy} failed`,
    };
  }

  private findByHeuristics(doc: Document): HTMLElement | null {
    // Look for common content containers
    const selectors = [
      "article",
      "[role='main']",
      "[role='article']",
      ".content",
      "#content",
      ".post",
      ".entry",
      ".story",
      ".article-body",
      ".post-content",
      "main",
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (
        element instanceof HTMLElement &&
        element.textContent?.length! > 100
      ) {
        return element;
      }
    }

    // Find largest text block
    const blocks = doc.querySelectorAll("div, section, article");
    let largestBlock: HTMLElement | null = null;
    let maxLength = 0;

    blocks.forEach((block) => {
      if (block instanceof HTMLElement) {
        const length = block.textContent?.length || 0;
        if (length > maxLength) {
          maxLength = length;
          largestBlock = block;
        }
      }
    });

    return largestBlock;
  }

  private findByTextToNoise(doc: Document): HTMLElement | null {
    const candidates = doc.querySelectorAll("div, section, article, main");
    let bestElement: HTMLElement | null = null;
    let bestRatio = 0;

    candidates.forEach((candidate) => {
      if (candidate instanceof HTMLElement) {
        const ratio = this.calculateTextToNoiseRatio(candidate);
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestElement = candidate;
        }
      }
    });

    return bestRatio > 0.5 ? bestElement : null;
  }

  private calculateTextToNoiseRatio(element: HTMLElement): number {
    const clone = element.cloneNode(true) as HTMLElement;

    // Remove noise elements
    const noiseSelectors = "script, style, noscript, iframe, embed, object";
    const noiseElements = clone.querySelectorAll(noiseSelectors);
    noiseElements.forEach((el) => el.remove());

    // Get clean text
    const cleanText = clone.textContent?.replace(/\s+/g, " ").trim() || "";
    const originalHtml = element.innerHTML;

    if (originalHtml.length === 0) return 0;

    return cleanText.length / originalHtml.length;
  }

  private calculateTextMetrics(element: HTMLElement): {
    textToNoiseRatio?: number;
    cleanText?: string;
  } {
    const ratio = this.calculateTextToNoiseRatio(element);
    const cleanText = this.extractText(element);

    return {
      textToNoiseRatio: ratio,
      cleanText: cleanText.substring(0, 200), // First 200 chars as preview
    };
  }

  private extractText(element: HTMLElement): string {
    const clone = element.cloneNode(true) as HTMLElement;

    // Remove unwanted elements
    const unwanted = clone.querySelectorAll("script, style, noscript");
    unwanted.forEach((el) => el.remove());

    return clone.textContent?.replace(/\s+/g, " ").trim() || "";
  }

  private extractMetadata(doc: Document): { metadata?: any } {
    const metadata: any = {};

    // Try Open Graph tags
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    if (ogTitle) metadata.title = ogTitle.getAttribute("content");

    const ogDescription = doc.querySelector('meta[property="og:description"]');
    if (ogDescription)
      metadata.description = ogDescription.getAttribute("content");

    // Try standard meta tags
    if (!metadata.title) {
      const title = doc.querySelector("title");
      if (title) metadata.title = title.textContent;
    }

    const author = doc.querySelector('meta[name="author"]');
    if (author) metadata.author = author.getAttribute("content");

    return Object.keys(metadata).length > 0 ? { metadata } : {};
  }

  private findElementById(doc: Document, id: string): HTMLElement | null {
    // Try standard ID first
    const element = doc.getElementById(id);
    if (element instanceof HTMLElement) return element;

    // Try data attributes
    const dataElement =
      doc.querySelector(`[data-analyzer-id="${id}"]`) ||
      doc.querySelector(`[data-visual-id="${id}"]`);

    return dataElement instanceof HTMLElement ? dataElement : null;
  }
}
