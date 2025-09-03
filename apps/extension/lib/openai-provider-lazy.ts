/**
 * Lazy loading wrapper for OpenAI Provider
 *
 * This module provides a lazy-loading interface to the OpenAI SDK,
 * deferring the actual import until the provider is first used.
 * This reduces initial bundle size by ~60KB.
 */

import type { OpenAIModel } from "./settings-service";
import type {
  SummarizationParams,
  SummarizationResult,
} from "./openai-provider";

// TODO: Future abstraction point - Create abstract SummaryProvider interface
// interface SummaryProvider {
//   summarize(text: string, params: SummarizationParams, signal?: AbortSignal): ReadableStream<string>;
//   summarizeComplete(text: string, params: SummarizationParams): Promise<SummarizationResult>;
//   validateApiKey(): Promise<boolean>;
// }

/**
 * Lazy-loaded OpenAI Provider wrapper
 * Delays loading the OpenAI SDK until first use
 */
export class LazyOpenAIProvider {
  private provider: any = null;
  private loadingPromise: Promise<any> | null = null;
  private apiKey: string;
  private model?: OpenAIModel;

  constructor(apiKey: string, model?: OpenAIModel) {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Dynamically imports and initializes the OpenAI provider
   * Uses singleton pattern to ensure single load
   */
  private async loadProvider() {
    if (this.provider) {
      return this.provider;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        // Dynamic import - webpack will create a separate chunk
        const { OpenAIProvider } = await import(
          /* webpackChunkName: "openai-provider" */
          "./openai-provider"
        );

        // Create provider without API key first to prevent exposure during import
        this.provider = new OpenAIProvider();
        // Initialize with API key after successful import
        this.provider.initialize(this.apiKey, this.model);
        return this.provider;
      } catch (error) {
        this.loadingPromise = null;
        // Sanitize error message to prevent API key exposure
        const safeError =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(
          `Failed to load OpenAI provider: ${safeError.replace(/sk-[A-Za-z0-9_\-\.]+/g, "sk-***")}`,
        );
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Static method for model parameters - doesn't require loading the provider
   */
  static getModelParameters(model?: OpenAIModel): Record<string, any> {
    const selectedModel = model || "gpt-4o-mini";

    // GPT-5 family: omit temperature, add verbosity and reasoning_effort
    if (selectedModel.startsWith("gpt-5")) {
      return {
        model: selectedModel,
        verbosity: "low",
        reasoning_effort: "minimal",
      };
    }

    // GPT-4 family: include temperature, omit verbosity and reasoning_effort
    return {
      model: selectedModel,
      temperature: 0.3,
    };
  }

  /**
   * Streaming summarization with lazy loading
   * TODO: When adding second provider, extract to abstract interface
   */
  summarize(
    text: string,
    params: SummarizationParams,
    abortSignal?: AbortSignal,
  ): ReadableStream<string> {
    return new ReadableStream<string>({
      start: async (controller) => {
        try {
          const provider = await this.loadProvider();
          const stream = provider.summarize(text, params, abortSignal);

          const reader = stream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } finally {
            reader.releaseLock();
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  /**
   * Complete summarization with lazy loading
   * TODO: When adding second provider, extract to abstract interface
   */
  async summarizeComplete(
    text: string,
    params: SummarizationParams,
  ): Promise<SummarizationResult> {
    const provider = await this.loadProvider();
    return provider.summarizeComplete(text, params);
  }

  /**
   * API key validation with lazy loading
   * TODO: When adding second provider, make this provider-agnostic
   */
  async validateApiKey(): Promise<boolean> {
    const provider = await this.loadProvider();
    return provider.validateApiKey();
  }

  /**
   * Check if provider is already loaded (for debugging/metrics)
   */
  isLoaded(): boolean {
    return this.provider !== null;
  }

  /**
   * Preload the provider (optional optimization for known usage)
   */
  async preload(): Promise<void> {
    await this.loadProvider();
  }
}

// TODO: Future provider registry for multiple providers
// class ProviderRegistry {
//   private providers: Map<string, () => Promise<SummaryProvider>> = new Map();
//
//   register(name: string, loader: () => Promise<SummaryProvider>) {
//     this.providers.set(name, loader);
//   }
//
//   async getProvider(name: string): Promise<SummaryProvider> {
//     const loader = this.providers.get(name);
//     if (!loader) throw new Error(`Provider ${name} not found`);
//     return loader();
//   }
// }

// Export types for consistency
export type {
  SummarizationParams,
  SummarizationResult,
} from "./openai-provider";
