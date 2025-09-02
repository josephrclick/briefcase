/**
 * Lazy-loading Site Extractor Factory
 *
 * Dynamically loads site-specific extractors only when needed,
 * reducing initial bundle size by ~30-50KB per extractor.
 */

import type { IContentExtractor, ExtractedContent } from "../types";

interface ExtractorLoader {
  domain: string;
  priority: number;
  canHandle: (url: string) => boolean;
  load: () => Promise<IContentExtractor>;
}

/**
 * Lazy Site Extractor Factory
 * Note: This does not implement ExtractorRegistry as it uses async methods
 * for lazy loading. It provides a similar but async interface.
 */
export class LazySiteExtractorFactory {
  private extractors: IContentExtractor[] = [];
  private loaders: ExtractorLoader[] = [];
  private loadedExtractors: Map<string, IContentExtractor> = new Map();
  private loadingPromises: Map<string, Promise<IContentExtractor>> = new Map();
  private sorted = false;

  constructor() {
    this.registerLoaders();
  }

  private registerLoaders(): void {
    // GitHub Extractor
    this.loaders.push({
      domain: "github.com",
      priority: 100,
      canHandle: (url) => url.includes("github.com"),
      load: async () => {
        console.log("[ExtractorFactory] Loading GitHub extractor...");
        const { GitHubExtractor } = await import(
          /* webpackChunkName: "extractor-github" */
          "../extractors/github-extractor"
        );
        return new GitHubExtractor();
      },
    });

    // Stack Overflow Extractor
    this.loaders.push({
      domain: "stackoverflow.com",
      priority: 95,
      canHandle: (url) => url.includes("stackoverflow.com"),
      load: async () => {
        console.log("[ExtractorFactory] Loading Stack Overflow extractor...");
        const { StackOverflowExtractor } = await import(
          /* webpackChunkName: "extractor-stackoverflow" */
          "../extractors/stackoverflow-extractor"
        );
        return new StackOverflowExtractor();
      },
    });

    // Reddit Extractor
    this.loaders.push({
      domain: "reddit.com",
      priority: 90,
      canHandle: (url) => url.includes("reddit.com") || url.includes("redd.it"),
      load: async () => {
        console.log("[ExtractorFactory] Loading Reddit extractor...");
        const { RedditExtractor } = await import(
          /* webpackChunkName: "extractor-reddit" */
          "../extractors/reddit-extractor"
        );
        return new RedditExtractor();
      },
    });

    // Twitter/X Extractor
    this.loaders.push({
      domain: "twitter.com",
      priority: 85,
      canHandle: (url) => url.includes("twitter.com") || url.includes("x.com"),
      load: async () => {
        console.log("[ExtractorFactory] Loading Twitter/X extractor...");
        const { TwitterExtractor } = await import(
          /* webpackChunkName: "extractor-twitter" */
          "../extractors/twitter-extractor"
        );
        return new TwitterExtractor();
      },
    });

    // Documentation Sites Extractor
    this.loaders.push({
      domain: "documentation",
      priority: 80,
      canHandle: (url) => {
        const docDomains = [
          "docs.",
          "developer.",
          "developers.",
          "api.",
          "wiki.",
          "help.",
          "support.",
          "learn.",
          "devdocs.io",
          "readthedocs.",
          "gitbook.",
        ];
        return docDomains.some((domain) => url.includes(domain));
      },
      load: async () => {
        console.log("[ExtractorFactory] Loading Documentation extractor...");
        const { DocumentationExtractor } = await import(
          /* webpackChunkName: "extractor-documentation" */
          "../extractors/documentation-extractor"
        );
        return new DocumentationExtractor();
      },
    });

    // Sort loaders by priority
    this.loaders.sort((a, b) => b.priority - a.priority);
  }

  register(extractor: IContentExtractor): void {
    this.extractors.push(extractor);
    this.sorted = false;
  }

  async getExtractorForUrl(
    url: string,
    doc: Document,
  ): Promise<IContentExtractor | null> {
    // First check if we need to load any extractors
    for (const loader of this.loaders) {
      if (loader.canHandle(url)) {
        const extractor = await this.loadExtractor(loader.domain, loader.load);
        if (extractor && extractor.canHandle(url, doc)) {
          return extractor;
        }
      }
    }

    // Then check already loaded extractors
    this.ensureSorted();
    for (const extractor of this.extractors) {
      if (extractor.canHandle(url, doc)) {
        return extractor;
      }
    }

    return null;
  }

  private async loadExtractor(
    domain: string,
    loader: () => Promise<IContentExtractor>,
  ): Promise<IContentExtractor> {
    // Check if already loaded
    const loaded = this.loadedExtractors.get(domain);
    if (loaded) {
      return loaded;
    }

    // Check if currently loading
    const loading = this.loadingPromises.get(domain);
    if (loading) {
      return loading;
    }

    // Start loading
    const loadPromise = (async () => {
      try {
        const extractor = await loader();
        this.loadedExtractors.set(domain, extractor);
        this.extractors.push(extractor);
        this.sorted = false;
        console.log(`[ExtractorFactory] Loaded ${domain} extractor`);
        return extractor;
      } catch (error) {
        console.error(
          `[ExtractorFactory] Failed to load ${domain} extractor:`,
          error,
        );
        this.loadingPromises.delete(domain);
        throw error;
      }
    })();

    this.loadingPromises.set(domain, loadPromise);
    return loadPromise;
  }

  getAllExtractors(): IContentExtractor[] {
    return this.extractors;
  }

  async extractContent(
    url: string,
    doc: Document,
  ): Promise<ExtractedContent | null> {
    const extractor = await this.getExtractorForUrl(url, doc);
    if (extractor) {
      const result = extractor.extract(doc);
      if (result) {
        return result;
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

  static create(): LazySiteExtractorFactory {
    return new LazySiteExtractorFactory();
  }

  /**
   * Create factory with all extractors pre-loaded (for testing)
   */
  static async withAllExtractors(): Promise<LazySiteExtractorFactory> {
    const factory = new LazySiteExtractorFactory();

    // Pre-load all extractors
    await Promise.all(
      factory.loaders.map((loader) =>
        factory.loadExtractor(loader.domain, loader.load),
      ),
    );

    return factory;
  }
}
