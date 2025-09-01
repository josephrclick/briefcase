import type {
  IContentExtractor,
  ExtractedContent,
  ExtractorRegistry,
} from "../types";
import { GitHubExtractor } from "../extractors/github-extractor";
import { StackOverflowExtractor } from "../extractors/stackoverflow-extractor";
import { RedditExtractor } from "../extractors/reddit-extractor";
import { TwitterExtractor } from "../extractors/twitter-extractor";
import { DocumentationExtractor } from "../extractors/documentation-extractor";

export class SiteExtractorFactory implements ExtractorRegistry {
  private extractors: IContentExtractor[] = [];
  private sorted = false;

  register(extractor: IContentExtractor): void {
    this.extractors.push(extractor);
    this.sorted = false;
  }

  getExtractorForUrl(url: string, doc: Document): IContentExtractor | null {
    this.ensureSorted();

    for (const extractor of this.extractors) {
      if (extractor.canHandle(url, doc)) {
        return extractor;
      }
    }

    return null;
  }

  getAllExtractors(): IContentExtractor[] {
    return this.extractors;
  }

  extractContent(url: string, doc: Document): ExtractedContent | null {
    this.ensureSorted();

    for (const extractor of this.extractors) {
      if (extractor.canHandle(url, doc)) {
        const result = extractor.extract(doc);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  private ensureSorted(): void {
    if (!this.sorted) {
      this.extractors.sort((a, b) => b.getPriority() - a.getPriority());
      this.sorted = true;
    }
  }

  static withDefaultExtractors(): SiteExtractorFactory {
    const factory = new SiteExtractorFactory();

    factory.register(new GitHubExtractor());
    factory.register(new StackOverflowExtractor());
    factory.register(new RedditExtractor());
    factory.register(new TwitterExtractor());
    factory.register(new DocumentationExtractor());

    return factory;
  }
}
