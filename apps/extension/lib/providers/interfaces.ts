/**
 * Abstract interfaces for summary providers
 *
 * These interfaces define the contract for all summary providers,
 * enabling clean separation from extraction and supporting multiple providers.
 */

/**
 * Summarization parameters
 */
export interface SummarizationParams {
  length?: "brief" | "medium" | "detailed";
  style?: "bullets" | "plain" | "technical";
  language?: string;
  customPrompt?: string;
}

/**
 * Summarization result
 */
export interface SummarizationResult {
  keyPoints: string[];
  tldr: string;
  tokensUsed?: number;
  model?: string;
  provider?: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  model?: string;
  endpoint?: string;
  maxTokens?: number;
  temperature?: number;
  [key: string]: any; // Allow provider-specific config
}

/**
 * Abstract interface for summary providers
 * All providers must implement this interface
 */
export interface ISummaryProvider {
  /**
   * Provider name for identification
   */
  readonly name: string;

  /**
   * Check if provider is ready to use
   */
  isReady(): boolean;

  /**
   * Validate provider configuration
   */
  validateConfig(): Promise<boolean>;

  /**
   * Stream summarization for real-time display
   */
  summarize(
    text: string,
    params: SummarizationParams,
    signal?: AbortSignal,
  ): ReadableStream<string>;

  /**
   * Complete summarization (non-streaming)
   */
  summarizeComplete(
    text: string,
    params: SummarizationParams,
  ): Promise<SummarizationResult>;

  /**
   * Get provider capabilities
   */
  getCapabilities?(): ProviderCapabilities;
}

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  streaming: boolean;
  maxInputLength: number;
  minInputLength: number;
  supportedLanguages?: string[];
  supportedStyles: string[];
  supportedLengths: string[];
  customPrompts: boolean;
}

/**
 * Provider factory interface
 */
export interface IProviderFactory {
  /**
   * Create a provider instance
   */
  createProvider(type: string, config: ProviderConfig): ISummaryProvider;

  /**
   * Register a new provider type
   */
  registerProvider(
    type: string,
    factory: (config: ProviderConfig) => ISummaryProvider,
  ): void;

  /**
   * Get available provider types
   */
  getAvailableProviders(): string[];
}

/**
 * Provider registry for managing multiple providers
 */
export interface IProviderRegistry {
  /**
   * Register a provider instance
   */
  register(name: string, provider: ISummaryProvider): void;

  /**
   * Get a provider by name
   */
  getProvider(name: string): ISummaryProvider | null;

  /**
   * Get the default provider
   */
  getDefaultProvider(): ISummaryProvider | null;

  /**
   * Set the default provider
   */
  setDefaultProvider(name: string): void;

  /**
   * List all registered providers
   */
  listProviders(): string[];
}

/**
 * Provider loader for lazy loading
 */
export interface IProviderLoader {
  /**
   * Load a provider dynamically
   */
  loadProvider(type: string): Promise<ISummaryProvider>;

  /**
   * Check if a provider is loaded
   */
  isLoaded(type: string): boolean;

  /**
   * Preload providers for performance
   */
  preload(types: string[]): Promise<void>;
}

// Re-export types from OpenAI provider for compatibility
export type {
  SummarizationParams as OpenAISummarizationParams,
  SummarizationResult as OpenAISummarizationResult,
} from "../openai-provider";
