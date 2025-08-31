import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { EnhancedSettings } from "./EnhancedSettings";
import { SettingsService } from "../lib/settings-service";
import { vi } from "vitest";

vi.mock("../lib/settings-service");

describe("EnhancedSettings Component", () => {
  const mockSettings = {
    openaiApiKey: "",
    summarization: { length: "brief", style: "bullets" },
    privacyBannerDismissed: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (SettingsService.loadSettings as any).mockResolvedValue(mockSettings);
    (SettingsService.saveSettings as any).mockResolvedValue(undefined);
    (SettingsService.validateApiKeyFormat as any).mockReturnValue(true);
    (SettingsService.testApiKey as any).mockResolvedValue({ success: true });
    (SettingsService.clearAllData as any).mockResolvedValue(undefined);
  });

  describe("Initial Rendering", () => {
    it("should render the settings interface", async () => {
      render(<EnhancedSettings />);
      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    it("should display privacy banner on first use", async () => {
      render(<EnhancedSettings />);
      await waitFor(() => {
        expect(screen.getByText("🔒 Privacy First")).toBeInTheDocument();
      });
      expect(
        screen.getByText(/stored locally on your device/i),
      ).toBeInTheDocument();
    });

    it("should show OpenAI configuration section", async () => {
      render(<EnhancedSettings />);
      await waitFor(() => {
        expect(screen.getByText("OpenAI Configuration")).toBeInTheDocument();
        expect(screen.getByLabelText("API Key")).toBeInTheDocument();
      });
    });

    it("should show summarization preferences section", async () => {
      render(<EnhancedSettings />);
      await waitFor(() => {
        expect(
          screen.getByText("Summarization Preferences"),
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Summary Length")).toBeInTheDocument();
        expect(screen.getByLabelText("Summary Style")).toBeInTheDocument();
      });
    });
  });

  describe("API Key Management", () => {
    it("should load existing API key from settings", async () => {
      const settingsWithKey = {
        ...mockSettings,
        openaiApiKey: "sk-test123456789abcdefghijklmnop",
      };
      (SettingsService.loadSettings as any).mockResolvedValue(settingsWithKey);

      render(<EnhancedSettings />);

      await waitFor(() => {
        const input = screen.getByLabelText("API Key") as HTMLInputElement;
        expect(input.value).toBe("sk-test123456789abcdefghijklmnop");
      });
    });

    it("should mask API key by default", async () => {
      render(<EnhancedSettings />);
      await waitFor(() => {
        const input = screen.getByLabelText("API Key");
        expect(input).toHaveAttribute("type", "password");
      });
    });

    it("should toggle API key visibility", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("API Key")).toBeInTheDocument();
      });

      const input = screen.getByLabelText("API Key");
      const toggleButton = screen.getByRole("button", {
        name: /Show API Key/i,
      });

      await user.click(toggleButton);
      expect(input).toHaveAttribute("type", "text");

      await user.click(toggleButton);
      expect(input).toHaveAttribute("type", "password");
    });

    it("should validate API key format on save", async () => {
      const user = userEvent.setup();
      (SettingsService.validateApiKeyFormat as any).mockReturnValue(false);

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("API Key")).toBeInTheDocument();
      });

      const input = screen.getByLabelText("API Key");
      const saveButton = screen.getByRole("button", { name: /Save Settings/i });

      await user.type(input, "invalid-key");
      await user.click(saveButton);

      expect(screen.getByText(/Invalid API key format/i)).toBeInTheDocument();
      expect(SettingsService.saveSettings).not.toHaveBeenCalled();
    });

    it("should save valid settings", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("API Key")).toBeInTheDocument();
      });

      const input = screen.getByLabelText("API Key");
      const saveButton = screen.getByRole("button", { name: /Save Settings/i });

      await user.type(input, "sk-test123456789abcdefghijklmnop");
      await user.click(saveButton);

      await waitFor(() => {
        expect(SettingsService.saveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            openaiApiKey: "sk-test123456789abcdefghijklmnop",
          }),
        );
        expect(
          screen.getByText(/Settings saved successfully/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Connection Testing", () => {
    it("should test API connection with valid key", async () => {
      const user = userEvent.setup();
      (SettingsService.testApiKey as any).mockResolvedValue({ success: true });

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("API Key")).toBeInTheDocument();
      });

      const input = screen.getByLabelText("API Key");
      const testButton = screen.getByRole("button", {
        name: /Test Connection/i,
      });

      await user.type(input, "sk-test123456789abcdefghijklmnop");
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection successful/i)).toBeInTheDocument();
      });
    });

    it("should show error for failed connection test", async () => {
      const user = userEvent.setup();
      (SettingsService.testApiKey as any).mockResolvedValue({
        success: false,
        error: "Invalid API key",
      });

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("API Key")).toBeInTheDocument();
      });

      const input = screen.getByLabelText("API Key");
      const testButton = screen.getByRole("button", {
        name: /Test Connection/i,
      });

      await user.type(input, "sk-invalid123");
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid API key/i)).toBeInTheDocument();
      });
    });

    it("should disable test button without API key", async () => {
      render(<EnhancedSettings />);
      await waitFor(() => {
        const testButton = screen.getByRole("button", {
          name: /Test Connection/i,
        });
        expect(testButton).toBeDisabled();
      });
    });

    it("should require API key before testing", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("API Key")).toBeInTheDocument();
      });

      // Enable button by typing, then clear to test error
      const input = screen.getByLabelText("API Key");
      await user.type(input, "test");
      await user.clear(input);

      const testButton = screen.getByRole("button", {
        name: /Test Connection/i,
      });

      expect(testButton).toBeDisabled();
    });
  });

  describe("Summarization Preferences", () => {
    it("should load default summarization settings", async () => {
      render(<EnhancedSettings />);

      await waitFor(() => {
        const lengthSelect = screen.getByLabelText(
          "Summary Length",
        ) as HTMLSelectElement;
        const styleSelect = screen.getByLabelText(
          "Summary Style",
        ) as HTMLSelectElement;

        expect(lengthSelect.value).toBe("brief");
        expect(styleSelect.value).toBe("bullets");
      });
    });

    it("should update summary length preference", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("Summary Length")).toBeInTheDocument();
      });

      const lengthSelect = screen.getByLabelText("Summary Length");
      await user.selectOptions(lengthSelect, "medium");

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      expect(SettingsService.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          summarization: expect.objectContaining({
            length: "medium",
          }),
        }),
      );
    });

    it("should update summary style preference", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("Summary Style")).toBeInTheDocument();
      });

      const styleSelect = screen.getByLabelText("Summary Style");
      await user.selectOptions(styleSelect, "plain");

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      expect(SettingsService.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          summarization: expect.objectContaining({
            style: "plain",
          }),
        }),
      );
    });

    it("should show help text for preferences", async () => {
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByText(/Choose how detailed you want your summaries/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Format for the key points section/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Privacy Banner", () => {
    it("should allow dismissing privacy banner", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Got it/i }),
        ).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole("button", { name: /Got it/i });
      await user.click(dismissButton);

      expect(SettingsService.saveSettings).toHaveBeenCalledWith({
        privacyBannerDismissed: true,
      });
      expect(screen.queryByText("🔒 Privacy First")).not.toBeInTheDocument();
    });

    it("should not show banner if already dismissed", async () => {
      const settingsWithDismissed = {
        ...mockSettings,
        privacyBannerDismissed: true,
      };
      (SettingsService.loadSettings as any).mockResolvedValue(
        settingsWithDismissed,
      );

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });

      expect(screen.queryByText("🔒 Privacy First")).not.toBeInTheDocument();
    });
  });

  describe("Delete All Data", () => {
    it("should show confirmation dialog before deleting", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

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
        screen.getByRole("button", { name: /Yes, Delete Everything/i }),
      ).toBeInTheDocument();
    });

    it("should cancel deletion when cancel is clicked", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

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
      expect(SettingsService.clearAllData).not.toHaveBeenCalled();
    });

    it("should delete all data when confirmed", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

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
        name: /Yes, Delete Everything/i,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(SettingsService.clearAllData).toHaveBeenCalled();
        expect(
          screen.getByText(/All data has been deleted/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading state while fetching settings", () => {
      (SettingsService.loadSettings as any).mockImplementation(
        () => new Promise(() => {}),
      );

      render(<EnhancedSettings />);
      expect(screen.getByText(/Loading settings/i)).toBeInTheDocument();
    });

    it("should show saving state while saving", async () => {
      const user = userEvent.setup();
      (SettingsService.saveSettings as any).mockImplementation(
        () => new Promise(() => {}),
      );

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("API Key")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      expect(screen.getByText(/Saving.../i)).toBeInTheDocument();
    });

    it("should show testing state during connection test", async () => {
      const user = userEvent.setup();
      (SettingsService.testApiKey as any).mockImplementation(
        () => new Promise(() => {}),
      );

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("API Key")).toBeInTheDocument();
      });

      const input = screen.getByLabelText("API Key");
      await user.type(input, "sk-test123456789abcdefghijklmnop");

      const testButton = screen.getByRole("button", {
        name: /Test Connection/i,
      });
      await user.click(testButton);

      expect(screen.getByText(/Testing.../i)).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle load errors gracefully", async () => {
      (SettingsService.loadSettings as any).mockRejectedValue(
        new Error("Load failed"),
      );

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to load settings/i),
        ).toBeInTheDocument();
      });
    });

    it("should handle save errors gracefully", async () => {
      const user = userEvent.setup();
      (SettingsService.saveSettings as any).mockRejectedValue(
        new Error("Save failed"),
      );

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("API Key")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to save settings/i),
        ).toBeInTheDocument();
      });
    });

    it("should handle test connection errors gracefully", async () => {
      const user = userEvent.setup();
      (SettingsService.testApiKey as any).mockRejectedValue(
        new Error("Test failed"),
      );

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("API Key")).toBeInTheDocument();
      });

      const input = screen.getByLabelText("API Key");
      await user.type(input, "sk-test123456789abcdefghijklmnop");

      const testButton = screen.getByRole("button", {
        name: /Test Connection/i,
      });
      await user.click(testButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to test connection/i),
        ).toBeInTheDocument();
      });
    });
  });
});
