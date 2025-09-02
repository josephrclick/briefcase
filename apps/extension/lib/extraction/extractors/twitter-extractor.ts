import type { IContentExtractor, ExtractedContent } from "../types";

const MINIMUM_CONTENT_LENGTH = 100;

export class TwitterExtractor implements IContentExtractor {
  canHandle(url: string, doc: Document): boolean {
    return /(twitter\.com|x\.com)/.test(url);
  }

  extract(doc: Document): ExtractedContent | null {
    const content: string[] = [];

    const tweets = doc.querySelectorAll(
      "article[data-testid='tweet'], [data-testid='tweet'], .tweet, .js-stream-tweet",
    );

    if (tweets.length === 0) {
      return null;
    }

    const title = tweets.length > 1 ? "Twitter Thread" : "Tweet";

    tweets.forEach((tweet, index) => {
      const tweetContent = this.extractTweetContent(tweet as HTMLElement);
      if (tweetContent) {
        if (index > 0) content.push("---");
        content.push(tweetContent);
      }
    });

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
        source: "Twitter/X",
        url: doc.location?.href || "",
      },
    };
  }

  getPriority(): number {
    return 10;
  }

  private extractTweetContent(element: HTMLElement): string {
    const content: string[] = [];

    const tweetText = element.querySelector(
      "[data-testid='tweetText'], .tweet-text, .js-tweet-text",
    );

    if (tweetText) {
      const spans = tweetText.querySelectorAll("span");
      if (spans.length > 0) {
        spans.forEach((span) => {
          const text = span.textContent?.trim() || "";
          if (text && !content.includes(text)) {
            content.push(text);
          }
        });
      } else {
        const text = tweetText.textContent?.trim() || "";
        if (text) {
          content.push(text);
        }
      }
    }

    const quotedTweet = element.querySelector(
      "[data-testid='quotedTweet'], .QuoteTweet",
    );
    if (quotedTweet) {
      const quotedText = quotedTweet.textContent?.trim() || "";
      if (quotedText) {
        content.push("> " + quotedText);
      }
    }

    const media = element.querySelector(
      "[data-testid='tweetPhoto'], [data-testid='videoPlayer']",
    );
    if (media) {
      content.push("[Media attachment]");
    }

    if (content.length === 0) {
      const fallbackText = element.textContent?.trim() || "";
      if (fallbackText) {
        content.push(fallbackText);
      }
    }

    return content.join(" ");
  }
}
