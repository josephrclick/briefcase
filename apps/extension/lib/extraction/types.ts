export interface ExtractedContent {
  text: string;
  title?: string;
  author?: string;
  publishedDate?: string;
  wordCount?: number;
  metadata?: {
    [key: string]: string | number | boolean | null;
  };
}

export interface IContentExtractor {
  canHandle(url: string, doc: Document): boolean;
  extract(doc: Document): ExtractedContent | null;
  getPriority(): number;
}

export interface ExtractorRegistry {
  register(extractor: IContentExtractor): void;
  getExtractorForUrl(url: string, doc: Document): IContentExtractor | null;
  getAllExtractors(): IContentExtractor[];
}
