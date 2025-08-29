import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { Settings } from "./Settings";

describe("Settings Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (chrome.storage.local.get as any).mockResolvedValue({});
  });

  describe("Initial Rendering", () => {
    it("should render the settings interface", async () => {
      render(<Settings />);
      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    it("should display privacy banner on first use", async () => {
      render(<Settings />);
      await waitFor(() => {
        expect(
          screen.getByText(/Your API key is stored locally/i),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText(/never sent to our servers/i),
      ).toBeInTheDocument();
    });

    it("should show API key input field", async () => {
      render(<Settings />);
      await waitFor(() => {
        const input = screen.getByLabelText(/OpenAI API Key/i);
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute("type", "password");
      });
    });

    it("should show save and test connection buttons", async () => {
      render(<Settings />);
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Save/i }),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByRole("button", { name: /Test Connection/i }),
      ).toBeInTheDocument();
    });

    it("should show delete all data button", async () => {
      render(<Settings />);
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Delete All Data/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("API Key Management", () => {
    it("should load existing API key from storage on mount", async () => {
      const mockKey = "sk-test123";
      (chrome.storage.local.get as any).mockResolvedValue({
        settings: { apiKey: mockKey },
      });

      render(<Settings />);

      await waitFor(() => {
        const input = screen.getByLabelText(
          /OpenAI API Key/i,
        ) as HTMLInputElement;
        expect(input.value).toBe(mockKey);
      });
    });

    it("should mask API key input by default", async () => {
      render(<Settings />);
      await waitFor(() => {
        const input = screen.getByLabelText(/OpenAI API Key/i);
        expect(input).toHaveAttribute("type", "password");
      });
    });

    it("should toggle API key visibility", async () => {
      const user = userEvent.setup();
      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByLabelText(/OpenAI API Key/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/OpenAI API Key/i);
      const toggleButton = screen.getByRole("button", {
        name: /Show API Key/i,
      });

      await user.click(toggleButton);
      expect(input).toHaveAttribute("type", "text");

      await user.click(toggleButton);
      expect(input).toHaveAttribute("type", "password");
    });

    it("should validate API key format", async () => {
      const user = userEvent.setup();
      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByLabelText(/OpenAI API Key/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/OpenAI API Key/i);
      const saveButton = screen.getByRole("button", { name: /Save/i });

      // Invalid key format
      await user.type(input, "invalid-key");
      await user.click(saveButton);

      expect(screen.getByText(/Invalid API key format/i)).toBeInTheDocument();
    });

    it("should save valid API key to storage", async () => {
      const user = userEvent.setup();
      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByLabelText(/OpenAI API Key/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/OpenAI API Key/i);
      const saveButton = screen.getByRole("button", { name: /Save/i });

      await user.clear(input);
      await user.type(input, "sk-proj-valid123key456");
      await user.click(saveButton);

      await waitFor(() => {
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          settings: expect.objectContaining({
            apiKey: "sk-proj-valid123key456",
            privacyBannerDismissed: false,
          }),
        });
      });

      expect(
        screen.getByText(/API key saved successfully/i),
      ).toBeInTheDocument();
    });
  });

  describe("Connection Testing", () => {
    it("should test API connection with valid key", async () => {
      const user = userEvent.setup();
      (chrome.runtime.sendMessage as any).mockResolvedValue({ success: true });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByLabelText(/OpenAI API Key/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/OpenAI API Key/i);
      const testButton = screen.getByRole("button", {
        name: /Test Connection/i,
      });

      await user.clear(input);
      await user.type(input, "sk-proj-valid123key456");
      await user.click(testButton);

      expect(screen.getByText(/Testing connection/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Connection successful/i)).toBeInTheDocument();
      });
    });

    it("should show error for failed connection test", async () => {
      const user = userEvent.setup();
      (chrome.runtime.sendMessage as any).mockResolvedValue({
        success: false,
        error: "Invalid API key",
      });

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByLabelText(/OpenAI API Key/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/OpenAI API Key/i);
      const testButton = screen.getByRole("button", {
        name: /Test Connection/i,
      });

      await user.clear(input);
      await user.type(input, "sk-proj-invalid123");
      await user.click(testButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Connection failed: Invalid API key/i),
        ).toBeInTheDocument();
      });
    });

    it("should disable test button without API key", async () => {
      render(<Settings />);
      await waitFor(() => {
        const testButton = screen.getByRole("button", {
          name: /Test Connection/i,
        });
        expect(testButton).toBeDisabled();
      });
    });
  });

  describe("Delete All Data", () => {
    it("should show confirmation dialog before deleting", async () => {
      const user = userEvent.setup();
      render(<Settings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Delete All Data/i }),
        ).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole("button", {
        name: /Delete All Data/i,
      });
      await user.click(deleteButton);

      expect(
        screen.getByText(/Are you sure you want to delete all data/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Cancel/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Confirm Delete/i }),
      ).toBeInTheDocument();
    });

    it("should cancel deletion when cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<Settings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Delete All Data/i }),
        ).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole("button", {
        name: /Delete All Data/i,
      });
      await user.click(deleteButton);

      const cancelButton = screen.getByRole("button", { name: /Cancel/i });
      await user.click(cancelButton);

      expect(
        screen.queryByText(/Are you sure you want to delete all data/i),
      ).not.toBeInTheDocument();
      expect(chrome.storage.local.clear).not.toHaveBeenCalled();
    });

    it("should delete all data when confirmed", async () => {
      const user = userEvent.setup();
      (chrome.storage.local.clear as any).mockResolvedValue(undefined);

      render(<Settings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Delete All Data/i }),
        ).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole("button", {
        name: /Delete All Data/i,
      });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole("button", {
        name: /Confirm Delete/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(chrome.storage.local.clear).toHaveBeenCalled();
        expect(
          screen.getByText(/All data has been deleted/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Privacy Banner", () => {
    it("should allow dismissing privacy banner", async () => {
      const user = userEvent.setup();
      render(<Settings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Got it/i }),
        ).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole("button", { name: /Got it/i });
      await user.click(dismissButton);

      expect(
        screen.queryByText(/Your API key is stored locally/i),
      ).not.toBeInTheDocument();
    });

    it("should remember privacy banner dismissal", async () => {
      (chrome.storage.local.get as any).mockResolvedValue({
        settings: { privacyBannerDismissed: true },
      });

      render(<Settings />);

      await waitFor(() => {
        expect(
          screen.queryByText(/Your API key is stored locally/i),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading state while fetching settings", () => {
      (chrome.storage.local.get as any).mockImplementation(
        () => new Promise(() => {}),
      );

      render(<Settings />);
      expect(screen.getByText(/Loading settings/i)).toBeInTheDocument();
    });

    it("should show loading state while saving", async () => {
      const user = userEvent.setup();
      (chrome.storage.local.set as any).mockImplementation(
        () => new Promise(() => {}),
      );

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByLabelText(/OpenAI API Key/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/OpenAI API Key/i);
      const saveButton = screen.getByRole("button", { name: /Save/i });

      await user.clear(input);
      await user.type(input, "sk-proj-valid123key456");
      await user.click(saveButton);

      expect(screen.getByText(/Saving/i)).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      (chrome.storage.local.get as any).mockRejectedValue(
        new Error("Storage error"),
      );

      render(<Settings />);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to load settings/i),
        ).toBeInTheDocument();
      });
    });

    it("should handle save errors gracefully", async () => {
      const user = userEvent.setup();
      (chrome.storage.local.set as any).mockRejectedValue(
        new Error("Save failed"),
      );

      render(<Settings />);

      await waitFor(() => {
        expect(screen.getByLabelText(/OpenAI API Key/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/OpenAI API Key/i);
      const saveButton = screen.getByRole("button", { name: /Save/i });

      await user.clear(input);
      await user.type(input, "sk-proj-valid123key456");
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to save settings/i),
        ).toBeInTheDocument();
      });
    });
  });
});
