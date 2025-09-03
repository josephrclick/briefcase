import OpenAI from "openai";
import { OpenAIModel } from "./settings-service";

// TODO: When adding second provider, move these interfaces to a shared types file
// These will become the common interface for all summary providers
export interface SummarizationParams {
  length: "brief" | "medium";
  style: "bullets" | "plain";
}

export interface SummarizationResult {
  keyPoints: string[];
  tldr: string;
  tokensUsed?: number;
}

const MAX_INPUT_LENGTH = 12000;
const MIN_INPUT_LENGTH = 100;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY = 1000;

// TODO: When adding second provider, create abstract base class:
// abstract class SummaryProvider {
//   abstract summarize(text: string, params: SummarizationParams, signal?: AbortSignal): ReadableStream<string>;
//   abstract summarizeComplete(text: string, params: SummarizationParams): Promise<SummarizationResult>;
//   abstract validateApiKey(): Promise<boolean>;
// }
export class OpenAIProvider {
  private client: OpenAI | null = null;
  private model: OpenAIModel = "gpt-4o-mini";

  constructor(apiKey?: string, model?: OpenAIModel) {
    // Allow construction without API key for safer lazy loading
    if (apiKey) {
      this.initialize(apiKey, model);
    } else {
      this.model = model || "gpt-4o-mini";
    }
  }

  /**
   * Initialize the provider with API key
   * Separated from constructor to prevent API key exposure during dynamic imports
   */
  initialize(apiKey: string, model?: OpenAIModel) {
    if (!apiKey) {
      throw new Error("API key is required");
    }

    // Validate API key format - must start with sk- and be at least 40 chars
    // Supports formats like sk-xxx, sk-proj-xxx with underscores, hyphens, dots
    if (!apiKey.startsWith("sk-") || apiKey.length < 40) {
      throw new Error("Invalid API key format");
    }

    // Additional validation for allowed characters
    if (!/^sk-[A-Za-z0-9_\-\.]+$/.test(apiKey)) {
      throw new Error("Invalid API key format");
    }

    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    if (model) {
      this.model = model;
    }
  }

  private ensureInitialized() {
    if (!this.client) {
      throw new Error(
        "OpenAI provider not initialized. Call initialize() first.",
      );
    }
  }

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

  private validateInputText(text: string): void {
    if (!text) {
      throw new Error("Input text is required");
    }

    if (text.length < MIN_INPUT_LENGTH) {
      throw new Error("Input text is too short for meaningful summarization");
    }

    if (text.length > MAX_INPUT_LENGTH) {
      throw new Error("Input text exceeds maximum length");
    }
  }

  private getSystemPrompt(params: SummarizationParams): string {
    const lengthInstruction =
      params.length === "brief"
        ? "Create a concise summary (100-150 words)"
        : "Create a comprehensive summary (200-300 words)";

    const styleInstruction =
      params.style === "bullets"
        ? "Use bullet points for key points"
        : "Use plain text paragraphs for key points";

    return `You are an expert at summarizing web articles. ${lengthInstruction}. ${styleInstruction}.

Format your response exactly as follows:

**Key Points:**
${params.style === "bullets" ? "• " : ""}[key point 1]
${params.style === "bullets" ? "• " : ""}[key point 2]
${params.style === "bullets" ? "• " : ""}[additional key points as needed]

**TL;DR:** [2-3 sentence summary capturing the essence]

Be accurate, clear, and focus on the most important information.`;
  }

  private getMaxTokens(length: "brief" | "medium"): number {
    return length === "brief" ? 200 : 400;
  }

  private parseResponse(content: string): SummarizationResult {
    const keyPointsMatch = content.match(
      /\*\*Key Points:\*\*\s*\n([\s\S]*?)(?=\n*\*\*TL;DR:|$)/i,
    );
    const tldrMatch = content.match(/\*\*TL;DR:\*\*\s*([\s\S]*?)$/i);

    let keyPoints: string[] = [];
    if (keyPointsMatch) {
      const pointsText = keyPointsMatch[1].trim();
      if (pointsText.includes("•")) {
        keyPoints = pointsText
          .split("\n")
          .map((line) => line.replace(/^•\s*/, "").trim())
          .filter((p) => p.length > 0);
      } else {
        keyPoints = pointsText
          .split("\n")
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
      }
    }

    const tldr = tldrMatch ? tldrMatch[1].trim() : content.trim();

    return {
      keyPoints,
      tldr,
      tokensUsed: undefined,
    };
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempt: number = 0,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable = error?.status === 429 || error?.status >= 500;
      const shouldRetry = isRetryable && attempt < MAX_RETRIES;

      if (!shouldRetry) {
        throw error;
      }

      const delay = BASE_RETRY_DELAY * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.retryWithBackoff(fn, attempt + 1);
    }
  }

  summarize(
    text: string,
    params: SummarizationParams,
    abortSignal?: AbortSignal,
  ): ReadableStream<string> {
    this.validateInputText(text);

    const systemPrompt = this.getSystemPrompt(params);
    const maxTokens = this.getMaxTokens(params.length);
    const modelParams = OpenAIProvider.getModelParameters(this.model);

    return new ReadableStream<string>({
      start: async (controller) => {
        try {
          const isGPT5 = this.model?.startsWith("gpt-5");
          const tokenParam = isGPT5
            ? { max_completion_tokens: maxTokens }
            : { max_tokens: maxTokens };

          this.ensureInitialized();
          const stream = await this.client!.chat.completions.create({
            model: modelParams.model,
            ...modelParams,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Please summarize the following article:\n\n${text}`,
              },
            ],
            stream: true,
            ...tokenParam,
          });

          for await (const chunk of stream) {
            if (abortSignal?.aborted) {
              controller.close();
              break;
            }

            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(content);
            }
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  async summarizeComplete(
    text: string,
    params: SummarizationParams,
  ): Promise<SummarizationResult> {
    this.validateInputText(text);

    const systemPrompt = this.getSystemPrompt(params);
    const maxTokens = this.getMaxTokens(params.length);
    const modelParams = OpenAIProvider.getModelParameters(this.model);

    const response = await this.retryWithBackoff(async () => {
      const isGPT5 = this.model?.startsWith("gpt-5");
      const tokenParam = isGPT5
        ? { max_completion_tokens: maxTokens }
        : { max_tokens: maxTokens };

      this.ensureInitialized();
      return await this.client!.chat.completions.create({
        model: modelParams.model,
        ...modelParams,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Please summarize the following article:\n\n${text}`,
          },
        ],
        stream: false,
        ...tokenParam,
      });
    });

    const content = response.choices[0]?.message?.content || "";
    const result = this.parseResponse(content);

    if (response.usage?.total_tokens) {
      result.tokensUsed = response.usage.total_tokens;
    }

    return result;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Test the API key by listing models
      this.ensureInitialized();
      const response = await this.client!.models.list();
      return !!response.data;
    } catch (error: any) {
      console.error("API key validation failed:", error);

      // Re-throw network and rate limit errors
      if (
        error.message?.includes("Network error") ||
        error.message?.includes("fetch")
      ) {
        throw new Error("Network error");
      }
      if (error.status === 429 || error.message?.includes("Rate limit")) {
        throw new Error("Rate limit exceeded");
      }

      return false;
    }
  }
}
