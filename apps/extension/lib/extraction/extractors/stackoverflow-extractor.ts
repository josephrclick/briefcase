import type { IContentExtractor, ExtractedContent } from "../types";

const MINIMUM_CONTENT_LENGTH = 100;

export class StackOverflowExtractor implements IContentExtractor {
  canHandle(url: string, _doc: Document): boolean {
    return /stackoverflow\.com\/(questions?|q)\//.test(url);
  }

  extract(doc: Document): ExtractedContent | null {
    const content: string[] = [];

    const questionTitle = doc.querySelector(
      ".question-hyperlink, h1[itemprop='name']",
    );
    const title =
      questionTitle?.textContent?.trim() || "Stack Overflow Question";

    if (title && title !== "Stack Overflow Question") {
      content.push("# " + title);
    }

    const questionBody = doc.querySelector(
      "#question .s-prose, .question .js-post-body",
    );
    if (questionBody) {
      content.push("## Question\n");
      content.push(this.extractPostContent(questionBody as HTMLElement));
    }

    const answers = doc.querySelectorAll(
      ".answercell .s-prose, .answercell .js-post-body",
    );
    if (answers.length > 0) {
      content.push("## Answers\n");
      answers.forEach((answer, index) => {
        if (index > 0) content.push("---");
        content.push(this.extractPostContent(answer as HTMLElement));
      });
    }

    const acceptedAnswer = doc.querySelector(
      ".accepted-answer .s-prose, .accepted-answer .js-post-body",
    );
    if (
      acceptedAnswer &&
      !content.includes(this.extractPostContent(acceptedAnswer as HTMLElement))
    ) {
      content.unshift("## Accepted Answer\n");
      content.unshift(this.extractPostContent(acceptedAnswer as HTMLElement));
    }

    const text = content.join("\n\n").trim();

    if (text.length < MINIMUM_CONTENT_LENGTH) {
      return null;
    }

    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      text,
      title,
      wordCount,
      metadata: {
        source: "Stack Overflow",
        url: doc.location?.href || "",
      },
    };
  }

  getPriority(): number {
    return 10;
  }

  private extractPostContent(element: HTMLElement): string {
    const content: string[] = [];

    const children = element.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;

      if (child.tagName === "PRE") {
        const codeElement = child.querySelector("code");
        const code = (codeElement || child).textContent?.trim() || "";
        if (code) {
          content.push("```\n" + code + "\n```");
        }
      } else if (child.tagName === "BLOCKQUOTE") {
        const quote = child.textContent?.trim() || "";
        if (quote) {
          content.push("> " + quote.split("\n").join("\n> "));
        }
      } else if (child.tagName === "UL" || child.tagName === "OL") {
        const items = child.querySelectorAll("li");
        items.forEach((item) => {
          content.push("• " + (item.textContent?.trim() || ""));
        });
      } else if (
        child.tagName === "H1" ||
        child.tagName === "H2" ||
        child.tagName === "H3"
      ) {
        const heading = child.textContent?.trim() || "";
        if (heading) {
          const level = "#".repeat(parseInt(child.tagName[1]));
          content.push(level + " " + heading);
        }
      } else if (child.tagName === "P") {
        const text = child.textContent?.trim() || "";
        if (text) {
          content.push(text);
        }
      } else if (
        child.tagName === "CODE" &&
        child.parentElement?.tagName !== "PRE"
      ) {
        const inlineCode = child.textContent?.trim() || "";
        if (inlineCode) {
          const parentText = child.parentElement?.textContent || "";
          if (!content.includes(parentText) && parentText) {
            content.push(parentText);
          }
        }
      }
    }

    if (content.length === 0) {
      const fallbackText = element.textContent?.trim() || "";
      if (fallbackText) {
        content.push(fallbackText);
      }
    }

    return content.filter((text) => text.length > 0).join("\n\n");
  }
}
