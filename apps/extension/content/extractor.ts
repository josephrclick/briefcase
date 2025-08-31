import { Readability, isProbablyReaderable } from "@mozilla/readability";
import { HeuristicExtractor } from "./heuristic-extractor";

export interface ExtractionResult {
  success: boolean;
  method: "readability" | "heuristic" | "manual";
  content?: {
    text: string;
    title?: string;
    html?: string;
  };
  metadata?: {
    byline?: string | null;
    excerpt?: string | null;
    siteName?: string | null;
    publishedTime?: string | null;
  };
  error?: string;
}

const MINIMUM_CONTENT_LENGTH = 800;

export class ContentExtractor {
  private heuristicExtractor = new HeuristicExtractor();
  extractWithReadability(doc: Document): ExtractionResult {
    try {
      const documentClone = doc.cloneNode(true) as Document;

      if (!isProbablyReaderable(documentClone)) {
        return {
          success: false,
          method: "readability",
          error: "Document not suitable for Readability extraction",
        };
      }

      const reader = new Readability(documentClone);
      const article = reader.parse();

      if (!article) {
        return {
          success: false,
          method: "readability",
          error: "Readability failed to extract content",
        };
      }

      if (
        !article.textContent ||
        article.textContent.length < MINIMUM_CONTENT_LENGTH
      ) {
        return {
          success: false,
          method: "readability",
          error: `Extracted content too short (minimum ${MINIMUM_CONTENT_LENGTH} characters required)`,
        };
      }

      const normalizedText = this.normalizeText(
        article.textContent,
        article.content,
      );

      return {
        success: true,
        method: "readability",
        content: {
          text: normalizedText,
          title: article.title,
          html: article.content,
        },
        metadata: {
          byline: article.byline,
          excerpt: article.excerpt,
          siteName: (article as any).siteName || null,
          publishedTime: (article as any).publishedTime || null,
        },
      };
    } catch (error) {
      return {
        success: false,
        method: "readability",
        error: `Readability extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  extractWithHeuristics(doc: Document): ExtractionResult {
    return this.heuristicExtractor.extract(doc);
  }

  extractManualSelection(): ExtractionResult {
    return {
      success: false,
      method: "manual",
      error: "Manual selection not yet implemented",
    };
  }

  extract(doc: Document): ExtractionResult {
    const readabilityResult = this.extractWithReadability(doc);

    if (readabilityResult.success) {
      return readabilityResult;
    }

    const heuristicResult = this.extractWithHeuristics(doc);

    if (heuristicResult.success) {
      return heuristicResult;
    }

    return {
      success: false,
      method: "readability",
      error: "All extraction methods failed",
    };
  }

  private normalizeText(textContent: string, htmlContent?: string): string {
    let normalized = textContent;

    if (htmlContent && !textContent.includes("```")) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = htmlContent;

      const codeBlocks = tempDiv.querySelectorAll("pre code, pre");
      codeBlocks.forEach((block) => {
        const codeText = (block as HTMLElement).innerText;
        const wrappedCode = `\n\`\`\`\n${codeText}\n\`\`\`\n`;
        const placeholder = `__CODE_BLOCK_${Math.random()}__`;

        normalized = normalized.replace(codeText, placeholder);
        normalized = normalized.replace(placeholder, wrappedCode);
      });

      const inlineCode = tempDiv.querySelectorAll("code:not(pre code)");
      inlineCode.forEach((code) => {
        const codeText = (code as HTMLElement).innerText;
        const wrappedCode = `\`${codeText}\``;
        normalized = normalized.replace(codeText, wrappedCode);
      });
    }

    normalized = normalized
      .split(/\n{3,}/)
      .join("\n\n")
      .trim();

    return normalized;
  }
}
