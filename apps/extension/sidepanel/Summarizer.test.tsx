import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { Summarizer } from "./Summarizer";

describe("Summarizer Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (chrome.storage.local.get as any).mockResolvedValue({});
    (chrome.tabs.query as any).mockResolvedValue([
      { id: 1, url: "https://example.com" },
    ]);
  });

  describe("Initial Rendering", () => {
    it("should render summarization interface", async () => {
      render(<Summarizer />);
      await waitFor(() => {
        expect(screen.getByText("Summarize")).toBeInTheDocument();
      });
    });

    it("should show length selector", async () => {
      render(<Summarizer />);
      await waitFor(() => {
        expect(screen.getByLabelText(/Summary Length/i)).toBeInTheDocument();
      });
    });

    it("should show style selector", async () => {
      render(<Summarizer />);
      await waitFor(() => {
        expect(screen.getByLabelText(/Summary Style/i)).toBeInTheDocument();
      });
    });

    it("should show summarize button", async () => {
      render(<Summarizer />);
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Summarize Page/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Extraction Status", () => {
    it("should detect extraction status from page", async () => {
      (chrome.tabs.sendMessage as any).mockResolvedValue({
        extracted: true,
        charCount: 1500,
      });

      render(<Summarizer />);

      await waitFor(() => {
        expect(
          screen.getByText(/1500 characters extracted/i),
        ).toBeInTheDocument();
      });
    });

    it("should show error for unsupported pages", async () => {
      (chrome.tabs.sendMessage as any).mockRejectedValue(
        new Error("Cannot access"),
      );

      render(<Summarizer />);

      await waitFor(() => {
        expect(
          screen.getByText(/This page cannot be summarized/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Summarization Process", () => {
    it("should show loading state during summarization", async () => {
      const user = userEvent.setup();
      (chrome.tabs.sendMessage as any).mockResolvedValue({
        extracted: true,
        charCount: 1500,
        text: "Sample article text",
      });
      (chrome.runtime.sendMessage as any).mockImplementation(
        () => new Promise(() => {}),
      );

      render(<Summarizer />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Summarize Page/i }),
        ).toBeInTheDocument();
      });

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      expect(screen.getByText(/Summarizing/i)).toBeInTheDocument();
    });

    it("should display streaming results", async () => {
      const user = userEvent.setup();
      (chrome.tabs.sendMessage as any).mockResolvedValue({
        extracted: true,
        charCount: 1500,
        text: "Sample text",
      });
      (chrome.runtime.sendMessage as any).mockResolvedValue({
        success: true,
        summary: {
          keyPoints: ["Point 1", "Point 2"],
          tldr: "This is a summary",
        },
      });

      render(<Summarizer />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Summarize Page/i }),
        ).toBeInTheDocument();
      });

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText("Point 1")).toBeInTheDocument();
        expect(screen.getByText("Point 2")).toBeInTheDocument();
        expect(screen.getByText("This is a summary")).toBeInTheDocument();
      });
    });
  });

  describe("Controls", () => {
    it("should update summary length", async () => {
      const user = userEvent.setup();
      render(<Summarizer />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Summary Length/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/Summary Length/i);
      await user.selectOptions(select, "detailed");

      expect((select as HTMLSelectElement).value).toBe("detailed");
    });

    it("should update summary style", async () => {
      const user = userEvent.setup();
      render(<Summarizer />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Summary Style/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/Summary Style/i);
      await user.selectOptions(select, "technical");

      expect((select as HTMLSelectElement).value).toBe("technical");
    });
  });

  describe("Error Handling", () => {
    it("should handle summarization errors", async () => {
      const user = userEvent.setup();
      (chrome.tabs.sendMessage as any).mockResolvedValue({
        extracted: true,
        charCount: 1500,
        text: "Sample text",
      });
      (chrome.runtime.sendMessage as any).mockResolvedValue({
        success: false,
        error: "API key invalid",
      });

      render(<Summarizer />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Summarize Page/i }),
        ).toBeInTheDocument();
      });

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/API key invalid/i)).toBeInTheDocument();
      });
    });
  });
});
