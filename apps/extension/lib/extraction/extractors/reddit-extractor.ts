import type { IContentExtractor, ExtractedContent } from "../types";

const MINIMUM_CONTENT_LENGTH = 100;

export class RedditExtractor implements IContentExtractor {
  canHandle(url: string, _doc: Document): boolean {
    return /reddit\.com/.test(url);
  }

  extract(doc: Document): ExtractedContent | null {
    const content: string[] = [];

    const postTitle = doc.querySelector("h1, [data-test-id='post-title']");
    const title = postTitle?.textContent?.trim() || "Reddit Post";

    if (title && title !== "Reddit Post") {
      content.push("# " + title);
    }

    const postContent = doc.querySelector(
      "[data-test-id='post-content'], .Post__content, ._1qeIAgB0cPwnLhDF9XSiJM",
    );
    if (postContent) {
      const text = this.extractPostBody(postContent as HTMLElement);
      if (text) {
        content.push("## Post\n");
        content.push(text);
      }
    }

    const comments = doc.querySelectorAll(
      ".Comment, [data-testid='comment'], ._3cjCphgls6DH-irkVaA0GM",
    );
    if (comments.length > 0) {
      content.push("## Comments\n");
      comments.forEach((comment, index) => {
        const commentText = this.extractComment(comment as HTMLElement);
        if (commentText) {
          if (index > 0) content.push("---");
          content.push(commentText);
        }
      });
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
        source: "Reddit",
        url: doc.location?.href || "",
      },
    };
  }

  getPriority(): number {
    return 10;
  }

  private extractPostBody(element: HTMLElement): string {
    const content: string[] = [];

    const paragraphs = element.querySelectorAll("p");
    paragraphs.forEach((p) => {
      const text = p.textContent?.trim() || "";
      if (text) content.push(text);
    });

    const codeBlocks = element.querySelectorAll("pre code, pre");
    codeBlocks.forEach((block) => {
      const code = (block as HTMLElement).textContent?.trim() || "";
      if (code) {
        content.push("```\n" + code + "\n```");
      }
    });

    if (content.length === 0) {
      const fallbackText = element.textContent?.trim() || "";
      if (fallbackText) {
        content.push(fallbackText);
      }
    }

    return content.filter((text) => text.length > 0).join("\n\n");
  }

  private extractComment(element: HTMLElement): string {
    const commentBody = element.querySelector(
      "[data-testid='comment-body'], .RichTextJSON-root, ._3cjCphgls6DH-irkVaA0GM p",
    );

    if (commentBody) {
      return commentBody.textContent?.trim() || "";
    }

    const paragraphs = element.querySelectorAll("p");
    const texts: string[] = [];
    paragraphs.forEach((p) => {
      const text = p.textContent?.trim() || "";
      if (text) texts.push(text);
    });

    return texts.join("\n\n");
  }
}
