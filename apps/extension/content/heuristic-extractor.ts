import { ExtractionResult } from "./extractor";

const MINIMUM_CONTENT_LENGTH = 800;
const EXCLUDED_TAGS = ["nav", "footer", "aside", "header"];
const EXCLUDED_CLASSES = [
  "nav",
  "navbar",
  "navigation",
  "menu",
  "footer",
  "header",
  "sidebar",
  "aside",
  "breadcrumb",
  "pagination",
  "comments",
  "advertisement",
  "ads",
  "social",
  "share",
];
const CONTENT_SELECTORS = [
  "article",
  "main",
  '[role="main"]',
  ".post-content",
  ".entry-content",
  ".article-content",
  ".main-content",
  "#content",
  ".content",
];

export class HeuristicExtractor {
  extract(doc: Document): ExtractionResult {
    try {
      this.stripExcludedElements(doc);

      let contentElement = this.findContentContainer(doc);

      if (!contentElement) {
        contentElement = this.findLargestTextBlock(doc);
      }

      if (!contentElement) {
        return {
          success: false,
          method: "heuristic",
          error: "No suitable content found",
        };
      }

      const text = this.extractText(contentElement);

      if (text.length < MINIMUM_CONTENT_LENGTH) {
        return {
          success: false,
          method: "heuristic",
          error: `Content too short (minimum ${MINIMUM_CONTENT_LENGTH} characters required)`,
        };
      }

      return {
        success: true,
        method: "heuristic",
        content: {
          text: text.trim(),
        },
      };
    } catch (error) {
      return {
        success: false,
        method: "heuristic",
        error: `Heuristic extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private stripExcludedElements(doc: Document): void {
    EXCLUDED_TAGS.forEach((tag) => {
      const elements = doc.querySelectorAll(tag);
      elements.forEach((el) => el.remove());
    });

    EXCLUDED_CLASSES.forEach((className) => {
      const elements = doc.querySelectorAll(`.${className}`);
      elements.forEach((el) => {
        if (!this.isContentElement(el)) {
          el.remove();
        }
      });
    });
  }

  private isContentElement(element: Element): boolean {
    const text = element.textContent || "";
    const links = element.querySelectorAll("a");

    if (text.length < 200) return false;

    const linkText = Array.from(links)
      .map((a) => a.textContent || "")
      .join("");

    const textToLinkRatio = text.length / (linkText.length + 1);

    return textToLinkRatio > 3;
  }

  private findContentContainer(doc: Document): Element | null {
    for (const selector of CONTENT_SELECTORS) {
      const element = doc.querySelector(selector);
      if (
        element &&
        element.textContent &&
        element.textContent.trim().length > 0
      ) {
        return element;
      }
    }

    return null;
  }

  private findLargestTextBlock(doc: Document): Element | null {
    const candidates = doc.querySelectorAll("div, section, article, main");
    let bestCandidate: Element | null = null;
    let bestScore = 0;

    candidates.forEach((candidate) => {
      if (this.isExcludedElement(candidate)) return;

      const score = this.scoreCandidate(candidate);

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    });

    return bestCandidate;
  }

  private isExcludedElement(element: Element): boolean {
    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();

    return EXCLUDED_CLASSES.some(
      (excluded) => className.includes(excluded) || id.includes(excluded),
    );
  }

  private scoreCandidate(element: Element): number {
    const text = element.textContent || "";
    const paragraphs = element.querySelectorAll("p");
    const links = element.querySelectorAll("a");

    if (text.length < MINIMUM_CONTENT_LENGTH) return 0;

    const textDensity = this.calculateTextDensity(element);
    const paragraphBonus = paragraphs.length * 10;
    const linkPenalty = links.length * 5;

    const lengthScore = Math.min(text.length / 100, 100);

    return lengthScore + paragraphBonus - linkPenalty + textDensity * 100;
  }

  calculateTextDensity(element: Element): number {
    const text = element.textContent || "";
    const tags = element.querySelectorAll("*");

    if (tags.length === 0) return 0;

    const textLength = text.replace(/\s+/g, " ").trim().length;
    const tagCount = tags.length;

    const density = textLength / (tagCount * 50);

    return Math.min(density, 1);
  }

  private extractText(element: Element): string {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            return text && text.length > 0
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_SKIP;
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (
              el.tagName === "BR" ||
              el.tagName === "P" ||
              el.tagName === "DIV"
            ) {
              return NodeFilter.FILTER_ACCEPT;
            }
          }

          return NodeFilter.FILTER_SKIP;
        },
      },
    );

    const textParts: string[] = [];
    let node;

    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        textParts.push(node.textContent!.trim());
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.tagName === "BR" || el.tagName === "P" || el.tagName === "DIV") {
          if (
            textParts.length > 0 &&
            textParts[textParts.length - 1] !== "\n"
          ) {
            textParts.push("\n");
          }
        }
      }
    }

    return textParts
      .join(" ")
      .replace(/\s+/g, " ")
      .replace(/ \n /g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}
