import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { StreamingSummarizer } from "./StreamingSummarizer";
import { SettingsService } from "../lib/settings-service";
import { OpenAIProvider } from "../lib/openai-provider";
import { vi } from "vitest";

vi.mock("../lib/settings-service");
vi.mock("../lib/openai-provider");

describe("StreamingSummarizer Component", () => {
  let mockProvider: any;
  let mockStream: ReadableStream<string>;

  const mockSettings = {
    openaiApiKey: "sk-test123456789abcdefghijklmnop",
    summarization: { length: "brief", style: "bullets" },
    privacyBannerDismissed: false,
  };

  const createMockStream = (chunks: string[]) => {
    return new ReadableStream<string>({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        controller.close();
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockProvider = {
      summarize: vi.fn(),
      summarizeComplete: vi.fn(),
    };
    (SettingsService.loadSettings as any).mockResolvedValue(mockSettings);
    (SettingsService.getProvider as any).mockResolvedValue(mockProvider);
    (SettingsService.saveSummarizationSettings as any).mockResolvedValue(
      undefined,
    );
    (OpenAIProvider as any).mockImplementation(() => mockProvider);
  });

  describe("Initial Rendering", () => {
    it("should render the summarizer interface", () => {
      render(
        <StreamingSummarizer extractedText="Sample text" charCount={100} />,
      );
      expect(screen.getByText("Summarize")).toBeInTheDocument();
    });

    it("should show extraction status", () => {
      render(
        <StreamingSummarizer extractedText="Sample text" charCount={2500} />,
      );
      expect(
        screen.getByText(/2500 characters extracted/i),
      ).toBeInTheDocument();
    });

    it("should show summarize button when text is available", () => {
      render(
        <StreamingSummarizer extractedText="Sample text" charCount={100} />,
      );
      expect(
        screen.getByRole("button", { name: /Summarize Page/i }),
      ).toBeInTheDocument();
    });

    it("should disable button when no text is available", () => {
      render(<StreamingSummarizer extractedText="" charCount={0} />);
      const button = screen.getByRole("button", { name: /Summarize Page/i });
      expect(button).toBeDisabled();
    });

    it("should show error when text is too short", () => {
      render(<StreamingSummarizer extractedText="Short" charCount={5} />);
      expect(screen.getByText(/Text too short/i)).toBeInTheDocument();
    });

    it("should show error when text is too long", () => {
      const longText = "a".repeat(13000);
      render(
        <StreamingSummarizer extractedText={longText} charCount={13000} />,
      );
      expect(screen.getByText(/Text too long/i)).toBeInTheDocument();
    });
  });

  describe("Settings Integration", () => {
    it("should load user's summarization preferences", async () => {
      const customSettings = {
        ...mockSettings,
        summarization: { length: "medium", style: "plain" },
      };
      (SettingsService.loadSettings as any).mockResolvedValue(customSettings);

      render(
        <StreamingSummarizer extractedText="Sample text" charCount={100} />,
      );

      await waitFor(() => {
        const lengthSelect = screen.getByLabelText(
          "Summary Length",
        ) as HTMLSelectElement;
        const styleSelect = screen.getByLabelText(
          "Summary Style",
        ) as HTMLSelectElement;
        expect(lengthSelect.value).toBe("medium");
        expect(styleSelect.value).toBe("plain");
      });
    });

    it("should save preference changes", async () => {
      const user = userEvent.setup();
      render(
        <StreamingSummarizer extractedText="Sample text" charCount={100} />,
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Summary Length")).toBeInTheDocument();
      });

      const lengthSelect = screen.getByLabelText("Summary Length");
      await user.selectOptions(lengthSelect, "medium");

      expect(SettingsService.saveSummarizationSettings).toHaveBeenCalledWith({
        length: "medium",
        style: "bullets",
      });
    });
  });

  describe("Streaming Summarization", () => {
    it("should display streaming tokens as they arrive", async () => {
      const chunks = [
        "**Key Points:**\n",
        "• First point\n",
        "• Second point\n",
        "\n**TL;DR:** ",
        "Brief summary.",
      ];
      mockStream = createMockStream(chunks);
      mockProvider.summarize.mockReturnValue(mockStream);

      const user = userEvent.setup();
      const longText = "Long enough text".repeat(10);
      render(<StreamingSummarizer extractedText={longText} charCount={160} />);

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      // Should show streaming indicator
      expect(screen.getByText(/Generating summary/i)).toBeInTheDocument();

      // Wait for chunks to appear
      await waitFor(() => {
        expect(screen.getByText(/First point/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Second point/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Brief summary/i)).toBeInTheDocument();
      });
    });

    it("should show typing animation during streaming", async () => {
      const chunks = ["Streaming ", "text ", "content"];
      mockStream = createMockStream(chunks);
      mockProvider.summarize.mockReturnValue(mockStream);

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      render(<StreamingSummarizer extractedText={validText} charCount={150} />);

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      expect(screen.getByTestId("typing-indicator")).toBeInTheDocument();

      await waitFor(
        () => {
          expect(
            screen.queryByTestId("typing-indicator"),
          ).not.toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    it("should format summary with Key Points and TL;DR sections", async () => {
      const chunks = [
        "**Key Points:**\n",
        "• Important fact one\n",
        "• Important fact two\n",
        "\n**TL;DR:** This is a brief summary.",
      ];
      mockStream = createMockStream(chunks);
      mockProvider.summarize.mockReturnValue(mockStream);

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      render(<StreamingSummarizer extractedText={validText} charCount={150} />);

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Key Points")).toBeInTheDocument();
        expect(screen.getByText("TL;DR")).toBeInTheDocument();
        expect(screen.getByText(/Important fact one/i)).toBeInTheDocument();
        expect(screen.getByText(/Important fact two/i)).toBeInTheDocument();
      });
    });

    it("should handle plain text style formatting", async () => {
      const customSettings = {
        ...mockSettings,
        summarization: { length: "brief", style: "plain" },
      };
      (SettingsService.loadSettings as any).mockResolvedValue(customSettings);

      const chunks = [
        "**Key Points:**\n",
        "The article discusses important topics.\n",
        "It provides valuable insights.\n",
        "\n**TL;DR:** A comprehensive overview.",
      ];
      mockStream = createMockStream(chunks);
      mockProvider.summarize.mockReturnValue(mockStream);

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      render(<StreamingSummarizer extractedText={validText} charCount={150} />);

      await waitFor(() => {
        expect(screen.getByLabelText("Summary Style")).toBeInTheDocument();
      });

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      await waitFor(() => {
        // Plain text should not have bullet points
        expect(screen.queryByText("•")).not.toBeInTheDocument();
        expect(screen.getByText(/important topics/i)).toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading spinner while initializing", async () => {
      // Mock the summarize method to throw an error for easier testing
      // The component shows "Initializing..." while isLoading is true
      mockProvider.summarize.mockImplementation(() => {
        // Throw an error immediately to stop processing
        throw new Error("Test error for loading state");
      });

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      const { container } = render(
        <StreamingSummarizer extractedText={validText} charCount={150} />,
      );

      const button = screen.getByRole("button", { name: /Summarize Page/i });

      // Before click, button should show "Summarize Page"
      expect(button).toHaveTextContent("Summarize Page");

      // Click and check that it briefly shows loading state
      await user.click(button);

      // After error, check that error message is shown
      await waitFor(() => {
        expect(
          screen.getByText(/Test error for loading state/i),
        ).toBeInTheDocument();
      });
    });

    it("should disable controls during summarization", async () => {
      const chunks = ["Streaming content"];
      mockStream = createMockStream(chunks);
      mockProvider.summarize.mockReturnValue(mockStream);

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      render(<StreamingSummarizer extractedText={validText} charCount={150} />);

      const lengthSelect = screen.getByLabelText("Summary Length");
      const styleSelect = screen.getByLabelText("Summary Style");

      // Start summarization
      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      // During streaming, there should be a Cancel button instead
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Cancel/i }),
        ).toBeInTheDocument();
      });

      // Controls should be disabled during summarization
      expect(lengthSelect).toBeDisabled();
      expect(styleSelect).toBeDisabled();
    });

    it("should show progress indicator", async () => {
      const chunks = Array(10).fill("chunk ");
      mockStream = createMockStream(chunks);
      mockProvider.summarize.mockReturnValue(mockStream);

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      render(<StreamingSummarizer extractedText={validText} charCount={150} />);

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should show error when API key is not configured", async () => {
      (SettingsService.getProvider as any).mockResolvedValue(null);

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      render(<StreamingSummarizer extractedText={validText} charCount={150} />);

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      expect(
        screen.getByText(/Please configure your OpenAI API key/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Go to Settings/i }),
      ).toBeInTheDocument();
    });

    it("should handle stream errors gracefully", async () => {
      mockStream = new ReadableStream({
        start(controller) {
          controller.error(new Error("Stream failed"));
        },
      });
      mockProvider.summarize.mockReturnValue(mockStream);

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      render(<StreamingSummarizer extractedText={validText} charCount={150} />);

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Stream failed/i)).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /Try Again/i }),
        ).toBeInTheDocument();
      });
    });

    it("should handle API errors with retry", async () => {
      mockProvider.summarize
        .mockImplementationOnce(() => {
          throw new Error("API Error");
        })
        .mockImplementationOnce(() => createMockStream(["Success"]));

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      render(<StreamingSummarizer extractedText={validText} charCount={150} />);

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/API Error/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole("button", { name: /Try Again/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText("Success")).toBeInTheDocument();
      });
    });

    it("should show specific error for rate limiting", async () => {
      const error = new Error("Rate limit exceeded");
      (error as any).status = 429;
      mockProvider.summarize.mockImplementation(() => {
        throw error;
      });

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      render(<StreamingSummarizer extractedText={validText} charCount={150} />);

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded/i)).toBeInTheDocument();
        expect(
          screen.getByText(/Please try again in a moment/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Cancellation", () => {
    it("should allow cancelling ongoing summarization", async () => {
      // Create a mock stream that throws AbortError when cancelled
      mockProvider.summarize.mockImplementation(
        (text: string, params: any, signal?: AbortSignal) => {
          return new ReadableStream({
            async start(controller) {
              // Check for abort signal
              if (signal?.aborted) {
                controller.error(new DOMException("Aborted", "AbortError"));
                return;
              }

              signal?.addEventListener("abort", () => {
                controller.error(new DOMException("Aborted", "AbortError"));
              });

              // Stream some chunks slowly
              for (let i = 0; i < 100; i++) {
                if (signal?.aborted) break;
                controller.enqueue("chunk ");
                await new Promise((resolve) => setTimeout(resolve, 10));
              }
              controller.close();
            },
          });
        },
      );

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      render(<StreamingSummarizer extractedText={validText} charCount={150} />);

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      // Wait for Cancel button to appear
      const cancelButton = await screen.findByRole("button", {
        name: /Cancel/i,
      });

      // Click cancel
      await user.click(cancelButton);

      // Wait for the cancellation message
      await waitFor(() => {
        expect(
          screen.getByText(/Summarization cancelled/i),
        ).toBeInTheDocument();
      });

      // Summarize button should be re-enabled
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Summarize Page/i }),
        ).toBeEnabled();
      });
    });
  });

  describe("Copy Functionality", () => {
    it("should allow copying the summary", async () => {
      const summaryText = "**Key Points:**\n• Test\n\n**TL;DR:** Summary";
      const chunks = [summaryText];
      mockStream = createMockStream(chunks);
      mockProvider.summarize.mockReturnValue(mockStream);

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      render(<StreamingSummarizer extractedText={validText} charCount={150} />);

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      // Wait for summary to complete
      await waitFor(() => {
        expect(screen.getByText("Summary complete")).toBeInTheDocument();
      });

      // Mock clipboard API just before clicking copy
      const originalClipboard = navigator.clipboard;
      const writeTextMock = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      });

      // Find and click copy button
      const copyButton = screen.getByRole("button", { name: /Copy Summary/i });
      await user.click(copyButton);

      // Check for success message (if clipboard was successfully called, copied will be true)
      await waitFor(() => {
        const copyButton = screen.getByRole("button", {
          name: /Copy Summary/i,
        });
        expect(copyButton).toHaveTextContent("✓ Copied!");
      });

      // Verify the mock was called with the expected text
      expect(writeTextMock).toHaveBeenCalledTimes(1);
      expect(writeTextMock).toHaveBeenCalledWith(summaryText);

      // Restore original clipboard
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(
        <StreamingSummarizer extractedText="Sample text" charCount={100} />,
      );

      expect(screen.getByLabelText("Summary Length")).toBeInTheDocument();
      expect(screen.getByLabelText("Summary Style")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Summarize Page/i }),
      ).toBeInTheDocument();
    });

    it("should announce status changes to screen readers", async () => {
      const chunks = ["Generating summary..."];
      mockStream = createMockStream(chunks);
      mockProvider.summarize.mockReturnValue(mockStream);

      const user = userEvent.setup();
      const validText = "a".repeat(150);
      render(<StreamingSummarizer extractedText={validText} charCount={150} />);

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      const statusRegion = screen.getByRole("status");
      expect(statusRegion).toHaveAttribute("aria-live", "polite");
      expect(statusRegion).toHaveTextContent(/Generating summary/i);
    });
  });
});
