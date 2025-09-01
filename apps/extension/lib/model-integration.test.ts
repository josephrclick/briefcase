import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { OpenAIProvider } from "./openai-provider";
import { SettingsService, OpenAIModel } from "./settings-service";
import OpenAI from "openai";
import { MOCK_API_KEY } from "../src/test-utils/constants";

vi.mock("openai");

describe("Model Integration Tests", () => {
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
  });

  describe("GPT-5-nano Integration", () => {
    it("should use correct parameters for GPT-5-nano model", async () => {
      const provider = new OpenAIProvider(MOCK_API_KEY, "gpt-5-nano");

      const mockResponse = {
        choices: [
          {
            message: {
              content: "Test summary",
            },
          },
        ],
        usage: { total_tokens: 100 },
      };
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await provider.summarizeComplete(
        "This is a long test content that needs summarization. It contains multiple sentences and paragraphs to ensure it meets the minimum length requirement for the summarization API.",
        {
          length: "brief",
          style: "bullets",
        },
      );

      // Verify the API was called with GPT-5 specific parameters
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5-nano",
          verbosity: "low",
          reasoning_effort: "minimal",
          stream: false,
          max_completion_tokens: 200,
        }),
      );

      // Verify temperature is NOT included for GPT-5
      expect(mockOpenAIClient.chat.completions.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: expect.any(Number),
        }),
      );
    });

    it("should handle streaming with GPT-5-nano", async () => {
      const provider = new OpenAIProvider(MOCK_API_KEY, "gpt-5-nano");

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "Streaming " } }] };
          yield { choices: [{ delta: { content: "content" } }] };
        },
      };
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockStream);

      const stream = provider.summarize(
        "This is test content that is long enough to meet the minimum requirements for summarization. It needs to be at least 100 characters long to pass validation.",
        {
          length: "medium",
          style: "plain",
        },
      );

      const reader = stream.getReader();
      const chunks: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks.join("")).toBe("Streaming content");
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5-nano",
          verbosity: "low",
          reasoning_effort: "minimal",
        }),
      );
    });
  });

  describe("GPT-4o-mini Integration", () => {
    it("should use correct parameters for GPT-4o-mini model", async () => {
      const provider = new OpenAIProvider(MOCK_API_KEY, "gpt-4o-mini");

      const mockResponse = {
        choices: [
          {
            message: {
              content: "Test summary",
            },
          },
        ],
        usage: { total_tokens: 100 },
      };
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      await provider.summarizeComplete(
        "This is test content that is long enough to meet the minimum requirements for summarization. It needs to be at least 100 characters long to pass validation.",
        {
          length: "brief",
          style: "bullets",
        },
      );

      // Verify the API was called with GPT-4 specific parameters
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          temperature: 0.3,
          stream: false,
          max_tokens: 200,
        }),
      );

      // Verify verbosity and reasoning_effort are NOT included for GPT-4
      expect(mockOpenAIClient.chat.completions.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          verbosity: expect.any(String),
          reasoning_effort: expect.any(String),
        }),
      );
    });
  });

  describe("GPT-4.1-nano Integration", () => {
    it("should use correct parameters for GPT-4.1-nano model", async () => {
      const provider = new OpenAIProvider(MOCK_API_KEY, "gpt-4.1-nano");

      const mockResponse = {
        choices: [
          {
            message: {
              content: "Test summary with large context",
            },
          },
        ],
        usage: { total_tokens: 150 },
      };
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      await provider.summarizeComplete(
        "This is very long test content that requires large context window processing. It contains multiple sentences and detailed information that needs to be summarized effectively using the large context capabilities of the model.",
        {
          length: "medium",
          style: "plain",
        },
      );

      // Verify the API was called with GPT-4.1 specific parameters
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4.1-nano",
          temperature: 0.3,
          stream: false,
          max_tokens: 400, // medium length
        }),
      );
    });
  });

  describe("Model Switching", () => {
    it("should adapt parameters when switching between models", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "Test summary",
            },
          },
        ],
      };
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      // Test GPT-5-nano
      const gpt5Provider = new OpenAIProvider(MOCK_API_KEY, "gpt-5-nano");
      await gpt5Provider.summarizeComplete(
        "This is test content that is long enough to meet the minimum requirements for summarization. It needs to be at least 100 characters long.",
        {
          length: "brief",
          style: "bullets",
        },
      );

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          model: "gpt-5-nano",
          verbosity: "low",
        }),
      );

      // Switch to GPT-4o-mini
      vi.clearAllMocks();
      const gpt4Provider = new OpenAIProvider(MOCK_API_KEY, "gpt-4o-mini");
      await gpt4Provider.summarizeComplete(
        "This is test content that is long enough to meet the minimum requirements for summarization. It needs to be at least 100 characters long.",
        {
          length: "brief",
          style: "bullets",
        },
      );

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          temperature: 0.3,
        }),
      );

      // Switch to GPT-4.1-nano
      vi.clearAllMocks();
      const gpt41Provider = new OpenAIProvider(MOCK_API_KEY, "gpt-4.1-nano");
      await gpt41Provider.summarizeComplete(
        "This is test content that is long enough to meet the minimum requirements for summarization. It needs to be at least 100 characters long.",
        {
          length: "brief",
          style: "bullets",
        },
      );

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          model: "gpt-4.1-nano",
          temperature: 0.3,
        }),
      );
    });
  });

  describe("Settings Persistence", () => {
    it("should persist model selection across extension restarts", async () => {
      // Mock chrome storage
      const storage: Record<string, any> = {};
      (chrome.storage.local.set as any).mockImplementation((data: any) => {
        Object.assign(storage, data);
        return Promise.resolve();
      });
      (chrome.storage.local.get as any).mockImplementation((key: string) => {
        return Promise.resolve({ [key]: storage[key] });
      });

      // Save settings with API key and model selection
      await SettingsService.saveSettings({
        openaiApiKey: MOCK_API_KEY,
        selectedModel: "gpt-5-nano",
      });

      // Simulate extension restart by clearing mocks
      vi.clearAllMocks();

      // Re-mock storage with persisted data
      (chrome.storage.local.get as any).mockImplementation((key: string) => {
        return Promise.resolve({ [key]: storage[key] });
      });

      // Load settings and verify model persisted
      const settings = await SettingsService.loadSettings();
      expect(settings.selectedModel).toBe("gpt-5-nano");
      expect(settings.openaiApiKey).toBe(MOCK_API_KEY);

      // Get provider with persisted model
      mockOpenAIClient.models.list.mockResolvedValue({
        data: [{ id: "gpt-5-nano" }],
      });
      const provider = await SettingsService.getProvider();

      expect(provider).toBeDefined();
      expect(OpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: MOCK_API_KEY,
          dangerouslyAllowBrowser: true,
        }),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid model gracefully", async () => {
      // Test that default model is used when undefined
      const provider = new OpenAIProvider(MOCK_API_KEY, undefined);

      const mockResponse = {
        choices: [
          {
            message: {
              content: "Test",
            },
          },
        ],
      };
      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse);

      await provider.summarizeComplete(
        "This is test content that is long enough to meet the minimum requirements for summarization. It needs to be at least 100 characters long.",
        {
          length: "brief",
          style: "bullets",
        },
      );

      // Should use default gpt-4o-mini parameters
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          temperature: 0.3,
        }),
      );
    });
  });
});
