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
    it("should show mock extraction status", async () => {
      render(<Summarizer />);

      await waitFor(() => {
        expect(
          screen.getByText(/2847 characters extracted/i),
        ).toBeInTheDocument();
      });
    });

    it("should always show extracted status in mock mode", async () => {
      render(<Summarizer />);

      await waitFor(() => {
        expect(
          screen.getByText(/2847 characters extracted/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Summarization Process", () => {
    it("should show loading state during summarization", async () => {
      const user = userEvent.setup();
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

    it("should display mock summary results", async () => {
      const user = userEvent.setup();
      render(<Summarizer />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Summarize Page/i }),
        ).toBeInTheDocument();
      });

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/This is a mock summary for UI demonstration/i)).toBeInTheDocument();
        expect(screen.getByText(/This side panel UI is currently in preview mode/i)).toBeInTheDocument();
      }, { timeout: 2000 });
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
    it("should show mock summary after clicking summarize", async () => {
      const user = userEvent.setup();
      render(<Summarizer />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Summarize Page/i }),
        ).toBeInTheDocument();
      });

      const button = screen.getByRole("button", { name: /Summarize Page/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/mock summary/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});
