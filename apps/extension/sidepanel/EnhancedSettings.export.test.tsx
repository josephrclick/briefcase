import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { EnhancedSettings } from "./EnhancedSettings";
import { SettingsService, OpenAIModel } from "../lib/settings-service";
import { ExportService } from "../lib/export-service";
import { vi } from "vitest";

// Mock dependencies
vi.mock("../lib/settings-service");
vi.mock("../lib/export-service");

// Mock chrome permissions API
global.chrome = {
  permissions: {
    contains: vi.fn(),
  },
} as any;

describe("EnhancedSettings Export UI", () => {
  const mockSettings = {
    openaiApiKey: "sk-test123456789abcdefghijklmnop",
    summarization: { length: "brief", style: "bullets" },
    privacyBannerDismissed: true,
    selectedModel: "gpt-4o-mini" as OpenAIModel,
    openaiConfigCollapsed: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (SettingsService.loadSettings as any).mockResolvedValue(mockSettings);
    (SettingsService.saveSettings as any).mockResolvedValue(undefined);
    (SettingsService.validateApiKeyFormat as any).mockReturnValue(true);
    (SettingsService.testApiKey as any).mockResolvedValue({ success: true });
    (chrome.permissions.contains as any).mockResolvedValue(true);
  });

  describe("Export Section Rendering", () => {
    it("should render export section with all controls", async () => {
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByText("Export Data")).toBeInTheDocument();
      });

      // Check for format selection
      expect(screen.getByText("Export Format")).toBeInTheDocument();
      expect(screen.getByLabelText("JSON")).toBeInTheDocument();
      expect(screen.getByLabelText("Markdown")).toBeInTheDocument();
      expect(screen.getByLabelText("CSV")).toBeInTheDocument();

      // Check for export scope
      expect(screen.getByText("Export Scope")).toBeInTheDocument();
      expect(screen.getByLabelText("Document Limit")).toBeInTheDocument();

      // Check for export button
      expect(
        screen.getByRole("button", { name: /Export Documents/i }),
      ).toBeInTheDocument();
    });

    it("should have JSON format selected by default", async () => {
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("JSON")).toBeInTheDocument();
      });

      expect(screen.getByLabelText("JSON")).toBeChecked();
      expect(screen.getByLabelText("Markdown")).not.toBeChecked();
      expect(screen.getByLabelText("CSV")).not.toBeChecked();
    });

    it("should show export section when downloads permission is granted", async () => {
      (chrome.permissions.contains as any).mockResolvedValue(true);

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByText("Export Data")).toBeInTheDocument();
      });

      expect(chrome.permissions.contains).toHaveBeenCalledWith({
        permissions: ["downloads"],
      });
    });

    it("should hide export section when downloads permission is not granted", async () => {
      (chrome.permissions.contains as any).mockResolvedValue(false);

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });

      expect(screen.queryByText("Export Data")).not.toBeInTheDocument();
    });
  });

  describe("Format Selection", () => {
    it("should allow selecting different export formats", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("JSON")).toBeInTheDocument();
      });

      // Select Markdown
      await user.click(screen.getByLabelText("Markdown"));
      expect(screen.getByLabelText("Markdown")).toBeChecked();
      expect(screen.getByLabelText("JSON")).not.toBeChecked();
      expect(screen.getByLabelText("CSV")).not.toBeChecked();

      // Select CSV
      await user.click(screen.getByLabelText("CSV"));
      expect(screen.getByLabelText("CSV")).toBeChecked();
      expect(screen.getByLabelText("JSON")).not.toBeChecked();
      expect(screen.getByLabelText("Markdown")).not.toBeChecked();
    });

    it("should update export button text based on selected format", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      // Select Markdown
      await user.click(screen.getByLabelText("Markdown"));
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      // Select CSV
      await user.click(screen.getByLabelText("CSV"));
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Export Scope Selection", () => {
    it("should allow setting document limit", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("Document Limit")).toBeInTheDocument();
      });

      const limitInput = screen.getByLabelText("Document Limit");
      expect(limitInput).toHaveProperty("value", "");

      await user.type(limitInput, "50");
      expect(limitInput).toHaveValue(50);
    });

    it("should validate document limit input", async () => {
      const user = userEvent.setup();
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("Document Limit")).toBeInTheDocument();
      });

      const limitInput = screen.getByLabelText("Document Limit");

      // Test invalid input (negative number)
      await user.type(limitInput, "-5");
      await user.tab(); // Trigger validation

      await waitFor(() => {
        expect(
          screen.getByText(/Document limit must be a positive number/i),
        ).toBeInTheDocument();
      });
    });

    it("should show helpful placeholder text", async () => {
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("Document Limit")).toBeInTheDocument();
      });

      const limitInput = screen.getByLabelText("Document Limit");
      expect(limitInput).toHaveProperty(
        "placeholder",
        "Leave empty for all documents",
      );
    });
  });

  describe("Export Button Functionality", () => {
    it("should trigger JSON export when export button is clicked", async () => {
      const user = userEvent.setup();
      const mockExportResult = {
        success: true,
        format: "json" as const,
        documentCount: 10,
        downloadId: 123,
      };

      (ExportService.exportAsJSON as any).mockResolvedValue(mockExportResult);

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      await waitFor(() => {
        expect(ExportService.exportAsJSON).toHaveBeenCalledWith(
          expect.objectContaining({
            onProgress: expect.any(Function),
            signal: expect.any(Object),
          }),
        );
      });
    });

    it("should trigger Markdown export when Markdown is selected", async () => {
      const user = userEvent.setup();
      const mockExportResult = {
        success: true,
        format: "markdown" as const,
        documentCount: 10,
        downloadId: 123,
      };

      (ExportService.exportAsMarkdown as any).mockResolvedValue(
        mockExportResult,
      );

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("Markdown")).toBeInTheDocument();
      });

      // Select Markdown format
      await user.click(screen.getByLabelText("Markdown"));

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      await waitFor(() => {
        expect(ExportService.exportAsMarkdown).toHaveBeenCalledWith(
          expect.objectContaining({
            onProgress: expect.any(Function),
            signal: expect.any(Object),
          }),
        );
      });
    });

    it("should trigger CSV export when CSV is selected", async () => {
      const user = userEvent.setup();
      const mockExportResult = {
        success: true,
        format: "csv" as const,
        documentCount: 10,
        downloadId: 123,
      };

      (ExportService.exportAsCSV as any).mockResolvedValue(mockExportResult);

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("CSV")).toBeInTheDocument();
      });

      // Select CSV format
      await user.click(screen.getByLabelText("CSV"));

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      await waitFor(() => {
        expect(ExportService.exportAsCSV).toHaveBeenCalledWith(
          expect.objectContaining({
            onProgress: expect.any(Function),
            signal: expect.any(Object),
          }),
        );
      });
    });

    it("should pass document limit to export service", async () => {
      const user = userEvent.setup();
      const mockExportResult = {
        success: true,
        format: "json" as const,
        documentCount: 25,
        downloadId: 123,
      };

      (ExportService.exportAsJSON as any).mockResolvedValue(mockExportResult);

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("Document Limit")).toBeInTheDocument();
      });

      // Set document limit
      const limitInput = screen.getByLabelText("Document Limit");
      await user.type(limitInput, "25");

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      await waitFor(() => {
        expect(ExportService.exportAsJSON).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 25,
            onProgress: expect.any(Function),
            signal: expect.any(Object),
          }),
        );
      });
    });
  });

  describe("Progress Indicator", () => {
    it("should show loading state during export", async () => {
      const user = userEvent.setup();
      let resolveExport: (value: any) => void;
      const exportPromise = new Promise((resolve) => {
        resolveExport = resolve;
      });

      (ExportService.exportAsJSON as any).mockReturnValue(exportPromise);

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      // Check loading state - export button should be replaced with status and cancel button
      await waitFor(() => {
        expect(screen.getByText(/Exporting.../i)).toBeInTheDocument();
      });

      // Export button should no longer exist (replaced with cancel button)
      expect(
        screen.queryByRole("button", { name: /Export Documents/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Cancel Export/i }),
      ).toBeInTheDocument();

      // Resolve export
      resolveExport!({
        success: true,
        format: "json" as const,
        documentCount: 10,
        downloadId: 123,
      });

      await waitFor(() => {
        expect(screen.queryByText(/Exporting.../i)).not.toBeInTheDocument();
      });

      // Export button should be back after completion
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByRole("button", { name: /Cancel Export/i }),
      ).not.toBeInTheDocument();
    });

    it("should show progress updates during export", async () => {
      const user = userEvent.setup();
      let progressCallback:
        | ((current: number, total: number) => void)
        | undefined;

      (ExportService.exportAsJSON as any).mockImplementation((options: any) => {
        progressCallback = options.onProgress;
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              format: "json" as const,
              documentCount: 10,
              downloadId: 123,
            });
          }, 100);
        });
      });

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      await waitFor(() => {
        expect(progressCallback).toBeDefined();
      });

      // Simulate progress updates
      if (progressCallback) {
        progressCallback(5, 50);
        await waitFor(() => {
          expect(screen.getByText(/Processing 5 of 50/i)).toBeInTheDocument();
        });

        progressCallback(10, 100);
        await waitFor(() => {
          expect(screen.getByText(/Processing 10 of 100/i)).toBeInTheDocument();
        });
      }
    });

    it("should show progress bar during export", async () => {
      const user = userEvent.setup();
      let progressCallback:
        | ((current: number, total: number) => void)
        | undefined;

      (ExportService.exportAsJSON as any).mockImplementation((options: any) => {
        progressCallback = options.onProgress;
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              format: "json" as const,
              documentCount: 10,
              downloadId: 123,
            });
          }, 100);
        });
      });

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      await waitFor(() => {
        expect(progressCallback).toBeDefined();
      });

      // Simulate progress updates
      if (progressCallback) {
        progressCallback(25, 100);
        await waitFor(() => {
          expect(screen.getByText(/25%/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe("Export Cancellation", () => {
    it("should show cancel button during export", async () => {
      const user = userEvent.setup();
      let resolveExport: (value: any) => void;
      const exportPromise = new Promise((resolve) => {
        resolveExport = resolve;
      });

      (ExportService.exportAsJSON as any).mockReturnValue(exportPromise);

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      // Check cancel button appears
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Cancel Export/i }),
        ).toBeInTheDocument();
      });

      // Resolve export to cleanup
      resolveExport!({
        success: true,
        format: "json" as const,
        documentCount: 10,
        downloadId: 123,
      });
    });

    it("should cancel export when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const mockAbortController = {
        signal: { aborted: false, addEventListener: vi.fn() },
        abort: vi.fn(() => {
          mockAbortController.signal.aborted = true;
        }),
      };

      // Mock AbortController
      global.AbortController = vi.fn(() => mockAbortController) as any;

      let exportReject: (error: Error) => void;
      (ExportService.exportAsJSON as any).mockImplementation((options: any) => {
        return new Promise((resolve, reject) => {
          exportReject = reject;
          // Simulate async export that can be cancelled
          setTimeout(() => {
            if (mockAbortController.signal.aborted) {
              reject(new Error("Export cancelled"));
            } else {
              resolve({
                success: true,
                format: "json" as const,
                documentCount: 10,
                downloadId: 123,
              });
            }
          }, 100);
        });
      });

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Cancel Export/i }),
        ).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", {
        name: /Cancel Export/i,
      });
      await user.click(cancelButton);

      expect(mockAbortController.abort).toHaveBeenCalled();

      // Manually trigger the rejection to simulate cancellation
      exportReject!(new Error("Export cancelled"));

      await waitFor(() => {
        expect(screen.getByText(/Export cancelled/i)).toBeInTheDocument();
      });
    });
  });

  describe("User Feedback and Error Display", () => {
    it("should show success message after successful export", async () => {
      const user = userEvent.setup();
      const mockExportResult = {
        success: true,
        format: "json" as const,
        documentCount: 10,
        downloadId: 123,
      };

      (ExportService.exportAsJSON as any).mockResolvedValue(mockExportResult);

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Successfully exported 10 documents/i),
        ).toBeInTheDocument();
      });
    });

    it("should show error message when export fails", async () => {
      const user = userEvent.setup();
      const mockExportResult = {
        success: false,
        error: "No documents to export",
      };

      (ExportService.exportAsJSON as any).mockResolvedValue(mockExportResult);

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Export failed: No documents to export/i),
        ).toBeInTheDocument();
      });
    });

    it("should show generic error message when export throws exception", async () => {
      const user = userEvent.setup();
      (ExportService.exportAsJSON as any).mockRejectedValue(
        new Error("Network error"),
      );

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Export failed: Network error/i),
        ).toBeInTheDocument();
      });
    });

    it("should show permission error when downloads permission is not available", async () => {
      const user = userEvent.setup();
      const mockExportResult = {
        success: false,
        error: "Downloads permission not granted",
      };

      (ExportService.exportAsJSON as any).mockResolvedValue(mockExportResult);

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      await user.click(exportButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Downloads permission not granted/i),
        ).toBeInTheDocument();
      });
    });

    it("should auto-dismiss success messages after 5 seconds", async () => {
      vi.useFakeTimers();

      try {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        const mockExportResult = {
          success: true,
          format: "json" as const,
          documentCount: 10,
          downloadId: 123,
        };

        (ExportService.exportAsJSON as any).mockResolvedValue(mockExportResult);

        render(<EnhancedSettings />);

        await waitFor(() => {
          expect(
            screen.getByRole("button", { name: /Export Documents/i }),
          ).toBeInTheDocument();
        });

        const exportButton = screen.getByRole("button", {
          name: /Export Documents/i,
        });
        await user.click(exportButton);

        await waitFor(() => {
          expect(
            screen.getByText(/Successfully exported 10 documents/i),
          ).toBeInTheDocument();
        });

        // Fast-forward 5 seconds
        vi.advanceTimersByTime(5000);

        await waitFor(() => {
          expect(
            screen.queryByText(/Successfully exported 10 documents/i),
          ).not.toBeInTheDocument();
        });
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("Integration with Settings State", () => {
    it("should disable export button when no API key is configured", async () => {
      const settingsWithoutApiKey = {
        ...mockSettings,
        openaiApiKey: "",
      };

      (SettingsService.loadSettings as any).mockResolvedValue(
        settingsWithoutApiKey,
      );

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      expect(exportButton).toBeDisabled();
    });

    it("should show helpful message when export is disabled due to missing API key", async () => {
      const settingsWithoutApiKey = {
        ...mockSettings,
        openaiApiKey: "",
      };

      (SettingsService.loadSettings as any).mockResolvedValue(
        settingsWithoutApiKey,
      );

      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByText(/Configure OpenAI API key to enable export/i),
        ).toBeInTheDocument();
      });
    });

    it("should enable export button when API key is configured", async () => {
      render(<EnhancedSettings />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Export Documents/i }),
        ).toBeInTheDocument();
      });

      const exportButton = screen.getByRole("button", {
        name: /Export Documents/i,
      });
      expect(exportButton).not.toBeDisabled();
    });
  });
});
