import type { IContentExtractor, ExtractedContent } from "../types";

const MINIMUM_CONTENT_LENGTH = 100;

export class GitHubExtractor implements IContentExtractor {
  canHandle(url: string, doc: Document): boolean {
    return /github\.com/.test(url);
  }

  extract(doc: Document): ExtractedContent | null {
    let text = "";
    let title = "";

    const readmeArticle = doc.querySelector("article.markdown-body");
    if (readmeArticle) {
      text = this.extractReadmeContent(readmeArticle as HTMLElement);
      title = doc.querySelector("h1")?.textContent?.trim() || "GitHub README";
    }

    const issueTitle = doc.querySelector(".js-issue-title");
    if (issueTitle) {
      title = issueTitle.textContent?.trim() || "";
      const issueBody = doc.querySelector(".comment-body");
      if (issueBody) {
        text = this.extractIssueContent(issueBody as HTMLElement, title);
      }
    }

    const prTitle = doc.querySelector(".gh-header-title");
    if (prTitle) {
      title = prTitle.textContent?.trim() || "";
      const prBody = doc.querySelector(".comment-body");
      if (prBody) {
        text = this.extractPRContent(prBody as HTMLElement, title);
      }
    }

    const discussionContent = doc.querySelector(
      ".discussion-timeline-item .comment-body",
    );
    if (discussionContent) {
      const discussionTitle =
        doc.querySelector(".gh-header-title")?.textContent?.trim() || "";
      text = this.extractDiscussionContent(
        discussionContent as HTMLElement,
        discussionTitle,
      );
      title = discussionTitle;
    }

    const codeContent = doc.querySelector(".blob-wrapper");
    if (codeContent && !text) {
      text = this.extractCodeContent(codeContent as HTMLElement);
      title =
        doc.querySelector(".final-path")?.textContent?.trim() || "Code File";
    }

    if (text.length < MINIMUM_CONTENT_LENGTH) {
      return null;
    }

    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    return {
      text: text.trim(),
      title: title || "GitHub Content",
      wordCount,
      metadata: {
        source: "GitHub",
        url: doc.location?.href || "",
      },
    };
  }

  getPriority(): number {
    return 10;
  }

  private extractReadmeContent(element: HTMLElement): string {
    const content: string[] = [];

    const headings = element.querySelectorAll("h1, h2, h3, h4, h5, h6");
    headings.forEach((heading) => {
      content.push(heading.textContent?.trim() || "");
    });

    const paragraphs = element.querySelectorAll("p");
    paragraphs.forEach((p) => {
      content.push(p.textContent?.trim() || "");
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
        content.push("• " + (item.textContent?.trim() || ""));
      });
    });

    return content.filter((text) => text.length > 0).join("\n\n");
  }

  private extractIssueContent(element: HTMLElement, title: string): string {
    const content: string[] = [title];

    const sections = element.querySelectorAll(
      "p, h1, h2, h3, h4, h5, h6, ul, ol, pre",
    );
    sections.forEach((section) => {
      if (section.tagName === "PRE") {
        const code = (section as HTMLElement).textContent?.trim() || "";
        if (code) {
          content.push("```\n" + code + "\n```");
        }
      } else {
        const text = section.textContent?.trim() || "";
        if (text) {
          content.push(text);
        }
      }
    });

    return content.filter((text) => text.length > 0).join("\n\n");
  }

  private extractPRContent(element: HTMLElement, title: string): string {
    return this.extractIssueContent(element, title);
  }

  private extractDiscussionContent(
    element: HTMLElement,
    title: string,
  ): string {
    return this.extractIssueContent(element, title);
  }

  private extractCodeContent(element: HTMLElement): string {
    const lines = element.querySelectorAll(".blob-code-inner");
    const codeLines: string[] = [];

    lines.forEach((line) => {
      codeLines.push(line.textContent || "");
    });

    if (codeLines.length > 0) {
      return "```\n" + codeLines.join("\n") + "\n```";
    }

    return element.textContent?.trim() || "";
  }
}
