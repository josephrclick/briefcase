import OpenAI from "openai";

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

export class OpenAIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("API key is required");
    }

    if (!apiKey.startsWith("sk-") || apiKey.length < 40) {
      throw new Error("Invalid API key format");
    }

    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
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

    return new ReadableStream<string>({
      start: async (controller) => {
        try {
          const stream = await this.client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Please summarize the following article:\n\n${text}`,
              },
            ],
            stream: true,
            temperature: 0.3,
            max_tokens: maxTokens,
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

    const response = await this.retryWithBackoff(async () => {
      return await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Please summarize the following article:\n\n${text}`,
          },
        ],
        stream: false,
        temperature: 0.3,
        max_tokens: maxTokens,
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
      const response = await this.client.models.list();
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
