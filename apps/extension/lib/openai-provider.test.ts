import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { OpenAIProvider } from "./openai-provider";
import { OpenAIModel } from "./settings-service";
import OpenAI from "openai";
import { MOCK_API_KEY } from "../src/test-utils/constants";

vi.mock("openai");

describe("OpenAIProvider", () => {
  let provider: OpenAIProvider;
  let mockOpenAIClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
      models: {
        list: vi.fn(),
      },
    };
    (OpenAI as unknown as Mock).mockImplementation(() => mockOpenAIClient);

    provider = new OpenAIProvider(MOCK_API_KEY);
  });

  describe("Constructor", () => {
    it("should create an instance with the provided API key", () => {
      expect(provider).toBeDefined();
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: MOCK_API_KEY,
        dangerouslyAllowBrowser: true,
      });
    });

    it("should create an instance with API key and model", () => {
      const modelProvider = new OpenAIProvider(MOCK_API_KEY, "gpt-5-nano");
      expect(modelProvider).toBeDefined();
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: MOCK_API_KEY,
        dangerouslyAllowBrowser: true,
      });
    });

    it("should throw error if API key is empty", () => {
      expect(() => new OpenAIProvider("")).toThrow("API key is required");
    });

    it("should throw error if API key is invalid format", () => {
      expect(() => new OpenAIProvider("invalid-key")).toThrow(
        "Invalid API key format",
      );
    });
  });

  describe("validateApiKey", () => {
    it("should return true for valid API key", async () => {
      mockOpenAIClient.models.list.mockResolvedValue({
        data: [{ id: "gpt-4o-mini" }],
      });

      const result = await provider.validateApiKey();

      expect(result).toBe(true);
      expect(mockOpenAIClient.models.list).toHaveBeenCalled();
    });

    it("should return false for invalid API key (401 error)", async () => {
      const error = new Error("Invalid API key");
      (error as any).status = 401;
      mockOpenAIClient.models.list.mockRejectedValue(error);

      const result = await provider.validateApiKey();

      expect(result).toBe(false);
    });

    it("should throw error for network issues", async () => {
      mockOpenAIClient.models.list.mockRejectedValue(
        new Error("Network error"),
      );

      await expect(provider.validateApiKey()).rejects.toThrow("Network error");
    });

    it("should handle rate limiting gracefully", async () => {
      const error = new Error("Rate limit exceeded");
      (error as any).status = 429;
      mockOpenAIClient.models.list.mockRejectedValue(error);

      await expect(provider.validateApiKey()).rejects.toThrow(
        "Rate limit exceeded",
      );
    });
  });

  describe("summarize (streaming)", () => {
    it("should return a ReadableStream for text summarization", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "This is " } }] };
          yield { choices: [{ delta: { content: "a summary." } }] };
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockStream);

      const longText = "a".repeat(150); // Long enough to pass validation
      const stream = provider.summarize(longText, {
        length: "brief",
        style: "bullets",
      });

      expect(stream).toBeInstanceOf(ReadableStream);

      const reader = stream.getReader();
      const chunks: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks).toEqual(["This is ", "a summary."]);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4o-mini",
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining(longText),
          }),
        ]),
        stream: true,
        temperature: 0.3,
        max_tokens: expect.any(Number),
      });
    });

    it("should handle different summarization parameters", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "Summary content" } }] };
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockStream);

      const longText = "a".repeat(150);
      const stream = provider.summarize(longText, {
        length: "medium",
        style: "plain",
      });

      const reader = stream.getReader();
      await reader.read();

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 400, // medium length should be ~300 words
        }),
      );
    });

    it("should use GPT-5 parameters when provider is initialized with gpt-5-nano", async () => {
      const gpt5Provider = new OpenAIProvider(MOCK_API_KEY, "gpt-5-nano");
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "Summary" } }] };
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockStream);

      const longText = "a".repeat(150);
      const stream = gpt5Provider.summarize(longText, {
        length: "brief",
        style: "bullets",
      });

      const reader = stream.getReader();
      await reader.read();

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5-nano",
          verbosity: "low",
          reasoning_effort: "minimal",
          stream: true,
          max_tokens: 200,
        }),
      );
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          temperature: expect.any(Number),
        }),
      );
    });

    it("should use GPT-4 parameters when provider is initialized with gpt-4.1-nano", async () => {
      const gpt4Provider = new OpenAIProvider(MOCK_API_KEY, "gpt-4.1-nano");
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "Summary" } }] };
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockStream);

      const longText = "a".repeat(150);
      const stream = gpt4Provider.summarize(longText, {
        length: "brief",
        style: "bullets",
      });

      const reader = stream.getReader();
      await reader.read();

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4.1-nano",
          temperature: 0.3,
          stream: true,
          max_tokens: 200,
        }),
      );
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          verbosity: expect.any(String),
          reasoning_effort: expect.any(String),
        }),
      );
    });

    it("should handle streaming errors gracefully", async () => {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "Start of " } }] };
          throw new Error("Stream interrupted");
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockStream);

      const longText = "a".repeat(150);
      const stream = provider.summarize(longText, {
        length: "brief",
        style: "bullets",
      });

      const reader = stream.getReader();
      const chunks: string[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Stream interrupted");
      }

      expect(chunks).toEqual(["Start of "]);
    });

    it("should enforce character limit on input text", () => {
      const longText = "a".repeat(13000); // Over 12k limit

      expect(() =>
        provider.summarize(longText, { length: "brief", style: "bullets" }),
      ).toThrow("Input text exceeds maximum length");
    });

    it("should handle empty text input", () => {
      expect(() =>
        provider.summarize("", { length: "brief", style: "bullets" }),
      ).toThrow("Input text is required");
    });

    it("should handle text below minimum length", () => {
      const shortText = "Too short";

      expect(() =>
        provider.summarize(shortText, { length: "brief", style: "bullets" }),
      ).toThrow("Input text is too short for meaningful summarization");
    });
  });

  describe("summarizeComplete", () => {
    it("should return complete summarization result", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: `**Key Points:**
• Point 1
• Point 2

**TL;DR:** This is a brief summary.`,
            },
          },
        ],
        usage: {
          total_tokens: 150,
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      const longText = "a".repeat(150);
      const result = await provider.summarizeComplete(longText, {
        length: "brief",
        style: "bullets",
      });

      expect(result).toEqual({
        keyPoints: ["Point 1", "Point 2"],
        tldr: "This is a brief summary.",
        tokensUsed: 150,
      });
    });

    it("should parse response without token usage data", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: `**Key Points:**
• Important fact

**TL;DR:** Summary here.`,
            },
          },
        ],
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      const longText = "a".repeat(150);
      const result = await provider.summarizeComplete(longText, {
        length: "brief",
        style: "bullets",
      });

      expect(result).toEqual({
        keyPoints: ["Important fact"],
        tldr: "Summary here.",
        tokensUsed: undefined,
      });
    });

    it("should handle API errors with proper error messages", async () => {
      const error = new Error("API Error");
      (error as any).status = 500;
      mockOpenAIClient.chat.completions.create.mockRejectedValue(error);

      await expect(
        provider.summarizeComplete("a".repeat(150), {
          length: "brief",
          style: "bullets",
        }),
      ).rejects.toThrow("API Error");
    });

    it("should handle malformed API response", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "Invalid response format",
            },
          },
        ],
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      const longText = "a".repeat(150);
      const result = await provider.summarizeComplete(longText, {
        length: "brief",
        style: "bullets",
      });

      expect(result.keyPoints).toEqual([]);
      expect(result.tldr).toBeTruthy();
    });
  });

  describe("Error handling and retry logic", () => {
    it("should retry on transient errors", async () => {
      const error = new Error("Temporary failure");
      (error as any).status = 503;

      mockOpenAIClient.chat.completions.create
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: `**Key Points:**
• Success

**TL;DR:** Retry worked.`,
              },
            },
          ],
        });

      const longText = "a".repeat(150);
      const result = await provider.summarizeComplete(longText, {
        length: "brief",
        style: "bullets",
      });

      expect(result.tldr).toBe("Retry worked.");
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it("should not retry on client errors", async () => {
      const error = new Error("Bad request");
      (error as any).status = 400;

      mockOpenAIClient.chat.completions.create.mockRejectedValue(error);

      await expect(
        provider.summarizeComplete("a".repeat(150), {
          length: "brief",
          style: "bullets",
        }),
      ).rejects.toThrow("Bad request");

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it("should implement exponential backoff for rate limiting", async () => {
      const error = new Error("Rate limit");
      (error as any).status = 429;

      mockOpenAIClient.chat.completions.create
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: `**Key Points:**
• Done

**TL;DR:** Success after retries.`,
              },
            },
          ],
        });

      const startTime = Date.now();
      const longText = "a".repeat(150);
      const result = await provider.summarizeComplete(longText, {
        length: "brief",
        style: "bullets",
      });
      const duration = Date.now() - startTime;

      expect(result.tldr).toBe("Success after retries.");
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(3);
      expect(duration).toBeGreaterThan(100); // Should have delays
    });

    it("should give up after max retries", async () => {
      const error = new Error("Persistent failure");
      (error as any).status = 503;

      mockOpenAIClient.chat.completions.create.mockRejectedValue(error);

      await expect(
        provider.summarizeComplete("a".repeat(150), {
          length: "brief",
          style: "bullets",
        }),
      ).rejects.toThrow("Persistent failure");

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe("Prompt engineering", () => {
    it("should use appropriate system prompt for brief bullet summaries", async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: "Summary" } }],
      });

      const longText = "a".repeat(150);
      await provider.summarizeComplete(longText, {
        length: "brief",
        style: "bullets",
      });

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: expect.stringContaining("concise"),
            }),
          ]),
        }),
      );
    });

    it("should use appropriate system prompt for medium plain summaries", async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: "Summary" } }],
      });

      const longText = "a".repeat(150);
      await provider.summarizeComplete(longText, {
        length: "medium",
        style: "plain",
      });

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: expect.stringContaining("comprehensive"),
            }),
          ]),
        }),
      );
    });

    it("should format output correctly for bullet style", async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: `**Key Points:**
• First point
• Second point

**TL;DR:** Brief summary.`,
            },
          },
        ],
      });

      const longText = "a".repeat(150);
      const result = await provider.summarizeComplete(longText, {
        length: "brief",
        style: "bullets",
      });

      expect(result.keyPoints).toHaveLength(2);
      expect(result.keyPoints[0]).toBe("First point");
      expect(result.tldr).toBe("Brief summary.");
    });

    it("should format output correctly for plain style", async () => {
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: `**Key Points:**
The article discusses important topics.

**TL;DR:** A plain text summary.`,
            },
          },
        ],
      });

      const longText = "a".repeat(150);
      const result = await provider.summarizeComplete(longText, {
        length: "brief",
        style: "plain",
      });

      expect(result.keyPoints).toContain(
        "The article discusses important topics.",
      );
      expect(result.tldr).toBe("A plain text summary.");
    });
  });

  describe("Cancel support", () => {
    it("should support cancellation of streaming requests", async () => {
      const abortController = new AbortController();
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "Start" } }] };
          abortController.abort();
          yield { choices: [{ delta: { content: "Should not appear" } }] };
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockStream);

      const longText = "a".repeat(150);
      const stream = provider.summarize(
        longText,
        {
          length: "brief",
          style: "bullets",
        },
        abortController.signal,
      );

      const reader = stream.getReader();
      const chunks: string[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      expect(chunks.length).toBeLessThanOrEqual(1);
    });
  });

  describe("getModelParameters", () => {
    it("should return GPT-5 parameters for gpt-5-nano model", () => {
      const model: OpenAIModel = "gpt-5-nano";
      const params = OpenAIProvider.getModelParameters(model);

      expect(params).toEqual({
        model: "gpt-5-nano",
        verbosity: "low",
        reasoning_effort: "minimal",
      });
      expect(params).not.toHaveProperty("temperature");
    });

    it("should return GPT-4 parameters for gpt-4o-mini model", () => {
      const model: OpenAIModel = "gpt-4o-mini";
      const params = OpenAIProvider.getModelParameters(model);

      expect(params).toEqual({
        model: "gpt-4o-mini",
        temperature: 0.3,
      });
      expect(params).not.toHaveProperty("verbosity");
      expect(params).not.toHaveProperty("reasoning_effort");
    });

    it("should return GPT-4 parameters for gpt-4.1-nano model", () => {
      const model: OpenAIModel = "gpt-4.1-nano";
      const params = OpenAIProvider.getModelParameters(model);

      expect(params).toEqual({
        model: "gpt-4.1-nano",
        temperature: 0.3,
      });
      expect(params).not.toHaveProperty("verbosity");
      expect(params).not.toHaveProperty("reasoning_effort");
    });

    it("should return default parameters when model is undefined", () => {
      const params = OpenAIProvider.getModelParameters(undefined);

      expect(params).toEqual({
        model: "gpt-4o-mini",
        temperature: 0.3,
      });
    });
  });
});
