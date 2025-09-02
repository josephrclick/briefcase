export interface ContentBlock {
  element: HTMLElement;
  score: number;
  textLength: number;
  linkDensity: number;
  paragraphCount: number;
  wordCount: number;
}

export interface DensityAnalysisResult {
  blocks: ContentBlock[];
  primaryBlock: ContentBlock | null;
  averageDensity: number;
}

export class ContentDensityAnalyzer {
  private readonly minTextLength = 25;
  private readonly minWordCount = 5;
  private readonly blockTags = [
    "div",
    "section",
    "article",
    "main",
    "aside",
    "blockquote",
    "figure",
    "pre",
  ];

  calculateDensity(element: HTMLElement): number {
    const text = this.getTextContent(element);
    const textLength = text.length;

    if (textLength < this.minTextLength) return 0;

    // Calculate link density (penalty for too many links)
    const linkDensity = this.calculateLinkDensity(element);

    // Calculate text-to-html ratio
    const htmlLength = element.innerHTML.length;
    const textRatio = htmlLength > 0 ? textLength / htmlLength : 0;

    // Calculate paragraph density
    const paragraphs = element.querySelectorAll("p");
    const paragraphBonus = Math.min(paragraphs.length * 0.1, 0.3);

    // Calculate word count density
    const wordCount = this.countWords(text);
    const wordDensity = Math.min(wordCount / 100, 1.0);

    // Calculate list density (lists are often content)
    const lists = element.querySelectorAll("ul, ol");
    const listBonus = Math.min(lists.length * 0.05, 0.15);

    // Combine scores with weights
    const score =
      textRatio * 0.3 +
      wordDensity * 0.3 +
      paragraphBonus * 0.2 +
      listBonus * 0.1 +
      (1 - linkDensity) * 0.1;

    return Math.min(Math.max(score, 0), 1.0);
  }

  identifyContentBlocks(root: HTMLElement): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    const candidates = this.findBlockElements(root);

    for (const element of candidates) {
      const block = this.analyzeBlock(element);
      if (block.score > 0.1 && block.wordCount >= this.minWordCount) {
        blocks.push(block);
      }
    }

    // Sort by score descending
    blocks.sort((a, b) => b.score - a.score);

    // Filter out blocks that are contained within higher scoring blocks
    return this.filterNestedBlocks(blocks);
  }

  analyze(doc: Document): DensityAnalysisResult {
    const root = doc.body;
    const blocks = this.identifyContentBlocks(root);

    // Calculate average density
    const averageDensity =
      blocks.length > 0
        ? blocks.reduce((sum, block) => sum + block.score, 0) / blocks.length
        : 0;

    // Find primary block (highest scoring)
    const primaryBlock = blocks.length > 0 ? blocks[0] : null;

    return {
      blocks,
      primaryBlock,
      averageDensity,
    };
  }

  private analyzeBlock(element: HTMLElement): ContentBlock {
    const text = this.getTextContent(element);
    const textLength = text.length;
    const wordCount = this.countWords(text);
    const linkDensity = this.calculateLinkDensity(element);
    const paragraphCount = element.querySelectorAll("p").length;

    // Calculate comprehensive score
    const lengthScore = Math.min(textLength / 1000, 1.0);
    const wordScore = Math.min(wordCount / 100, 1.0);
    const paragraphScore = Math.min(paragraphCount / 5, 1.0);
    const densityPenalty = linkDensity > 0.3 ? 0.5 : 1.0;

    // Check for content indicators
    const hasHeadings = element.querySelector("h1, h2, h3, h4") !== null;
    const hasParagraphs = paragraphCount > 0;
    const hasLists = element.querySelector("ul, ol") !== null;

    let contentBonus = 0;
    if (hasHeadings) contentBonus += 0.1;
    if (hasParagraphs) contentBonus += 0.1;
    if (hasLists) contentBonus += 0.05;

    const score =
      (lengthScore * 0.3 +
        wordScore * 0.3 +
        paragraphScore * 0.2 +
        contentBonus) *
      densityPenalty;

    return {
      element,
      score: Math.min(score, 1.0),
      textLength,
      linkDensity,
      paragraphCount,
      wordCount,
    };
  }

  private findBlockElements(root: HTMLElement): HTMLElement[] {
    const elements: HTMLElement[] = [];
    const selector = this.blockTags.join(", ");
    const candidates = root.querySelectorAll(selector);

    candidates.forEach((element) => {
      if (element instanceof HTMLElement) {
        // Skip elements that are clearly not content
        if (this.isLikelyNonContent(element)) return;

        elements.push(element);
      }
    });

    return elements;
  }

  private isLikelyNonContent(element: HTMLElement): boolean {
    const classAndId = (element.className + " " + element.id).toLowerCase();
    const nonContentPatterns = [
      "nav",
      "menu",
      "sidebar",
      "footer",
      "header",
      "banner",
      "advertisement",
      "popup",
      "modal",
      "overlay",
      "tooltip",
      "dropdown",
    ];

    for (const pattern of nonContentPatterns) {
      if (classAndId.includes(pattern)) return true;
    }

    // Check for hidden elements
    const style = window.getComputedStyle(element);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return true;
    }

    return false;
  }

  private calculateLinkDensity(element: HTMLElement): number {
    const text = this.getTextContent(element);
    const textLength = text.length;

    if (textLength === 0) return 0;

    const links = element.querySelectorAll("a");
    let linkTextLength = 0;

    links.forEach((link) => {
      linkTextLength += link.textContent?.length || 0;
    });

    return linkTextLength / textLength;
  }

  private getTextContent(element: HTMLElement): string {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true) as HTMLElement;

    // Remove script and style tags
    const unwanted = clone.querySelectorAll("script, style, noscript");
    unwanted.forEach((el) => el.remove());

    // Get text content and clean it
    const text = clone.textContent || "";
    return text.replace(/\s+/g, " ").trim();
  }

  private countWords(text: string): number {
    const words = text.trim().split(/\s+/);
    return words.filter((word) => word.length > 0).length;
  }

  private filterNestedBlocks(blocks: ContentBlock[]): ContentBlock[] {
    const filtered: ContentBlock[] = [];

    for (const block of blocks) {
      let isNested = false;

      for (const other of filtered) {
        if (other.element.contains(block.element)) {
          isNested = true;
          break;
        }
      }

      if (!isNested) {
        // Remove any blocks that this block contains
        for (let i = filtered.length - 1; i >= 0; i--) {
          if (block.element.contains(filtered[i].element)) {
            filtered.splice(i, 1);
          }
        }
        filtered.push(block);
      }
    }

    return filtered;
  }
}
