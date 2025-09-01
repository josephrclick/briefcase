import type { IContentExtractor, ExtractedContent } from "../types";

const MINIMUM_CONTENT_LENGTH = 100;

export class DocumentationExtractor implements IContentExtractor {
  canHandle(url: string, doc: Document): boolean {
    if (
      /(\/docs|\/documentation|\/api|\/guide|\/reference|\.readthedocs\.io|docs\.)/.test(
        url,
      )
    ) {
      return true;
    }

    const docSelectors = [
      ".docs-content",
      ".documentation",
      ".td-main",
      ".rst-content",
      ".markdown-body",
      "[role='main']",
      ".api-content",
      ".guide-content",
    ];

    for (const selector of docSelectors) {
      if (doc.querySelector(selector)) {
        return true;
      }
    }

    return false;
  }

  extract(doc: Document): ExtractedContent | null {
    const contentSelectors = [
      "main.docs-content",
      "article.markdown-body",
      ".documentation-content",
      ".rst-content",
      ".td-content",
      "[role='main']",
      ".docs-body",
      ".api-docs",
      ".content",
      "main",
      "article",
    ];

    let mainContent: HTMLElement | null = null;
    for (const selector of contentSelectors) {
      mainContent = doc.querySelector(selector) as HTMLElement;
      if (mainContent) break;
    }

    if (!mainContent) {
      return null;
    }

    const text = this.extractDocumentationContent(mainContent);

    if (text.length < MINIMUM_CONTENT_LENGTH) {
      return null;
    }

    const title =
      doc.querySelector("h1")?.textContent?.trim() ||
      doc.title ||
      "Documentation";

    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      text,
      title,
      wordCount,
      metadata: {
        source: "Documentation",
        url: doc.location?.href || "",
      },
    };
  }

  getPriority(): number {
    return 5;
  }

  private extractDocumentationContent(element: HTMLElement): string {
    const content: string[] = [];

    const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const headingTexts = new Set<string>();
    headings.forEach((heading) => {
      const text = heading.textContent?.trim() || "";
      if (text && !headingTexts.has(text)) {
        headingTexts.add(text);
        const level = "#".repeat(parseInt(heading.tagName[1]));
        content.push(level + " " + text);
      }
    });

    const sections = element.querySelectorAll("section, article, .section");
    if (sections.length > 0) {
      sections.forEach((section) => {
        const sectionContent = this.extractSectionContent(
          section as HTMLElement,
        );
        if (sectionContent) {
          content.push(sectionContent);
        }
      });
    } else {
      const sectionContent = this.extractSectionContent(element);
      if (sectionContent) {
        content.push(sectionContent);
      }
    }

    return content.filter((text) => text.length > 0).join("\n\n");
  }

  private extractSectionContent(element: HTMLElement): string {
    const content: string[] = [];

    const paragraphs = element.querySelectorAll("p");
    paragraphs.forEach((p) => {
      const text = p.textContent?.trim() || "";
      if (text && !content.includes(text)) {
        content.push(text);
      }
    });

    const codeBlocks = element.querySelectorAll("pre code, pre");
    codeBlocks.forEach((block) => {
      const code = (block as HTMLElement).textContent?.trim() || "";
      if (code) {
        content.push("```\n" + code + "\n```");
      }
    });

    const lists = element.querySelectorAll("ul, ol");
    lists.forEach((list) => {
      const items = list.querySelectorAll("li");
      items.forEach((item) => {
        const text = item.textContent?.trim() || "";
        if (text) {
          content.push("• " + text);
        }
      });
    });

    const tables = element.querySelectorAll("table");
    tables.forEach((table) => {
      content.push("[Table content]");
    });

    const warnings = element.querySelectorAll(
      ".warning, .admonition-warning, .alert-warning",
    );
    warnings.forEach((warning) => {
      const text = warning.textContent?.trim() || "";
      if (text) {
        content.push("⚠️ Warning: " + text);
      }
    });

    const notes = element.querySelectorAll(
      ".note, .admonition-note, .alert-info",
    );
    notes.forEach((note) => {
      const text = note.textContent?.trim() || "";
      if (text) {
        content.push("📝 Note: " + text);
      }
    });

    return content.filter((text) => text.length > 0).join("\n\n");
  }
}
