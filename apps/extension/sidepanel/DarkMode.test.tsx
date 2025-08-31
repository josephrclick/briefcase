import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { SidePanel } from "./SidePanel";
import { SettingsService } from "../lib/settings-service";
import { vi } from "vitest";

vi.mock("../lib/settings-service");
vi.mock("../lib/document-repository", () => ({
  DocumentRepository: vi.fn().mockImplementation(() => ({
    getAllDocuments: vi.fn().mockResolvedValue([]),
    getDocument: vi.fn().mockResolvedValue(null),
    saveDocument: vi.fn().mockResolvedValue(undefined),
    deleteDocument: vi.fn().mockResolvedValue(undefined),
  })),
  extractDomain: vi.fn((url) => new URL(url || "http://example.com").hostname),
}));

// Mock Chrome APIs
global.chrome = {
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    onActivated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    sendMessage: vi.fn(),
  },
  runtime: {
    lastError: null,
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
} as any;

describe("Dark Mode Support", () => {
  const mockSettings = {
    openaiApiKey: "",
    summarization: { length: "brief", style: "bullets" },
    privacyBannerDismissed: false,
    theme: "system" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (SettingsService.loadSettings as any).mockResolvedValue(mockSettings);
    (SettingsService.saveSettings as any).mockResolvedValue(undefined);

    // Mock matchMedia for system theme detection
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  describe("Theme Detection", () => {
    it("should detect system theme preference on load", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        expect(window.matchMedia).toHaveBeenCalledWith(
          "(prefers-color-scheme: dark)",
        );
      });
    });

    it("should apply dark theme when system prefers dark", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.getAttribute("data-theme")).toBe("dark");
      });
    });

    it("should apply light theme when system prefers light", async () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<SidePanel />);

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.getAttribute("data-theme")).toBe("light");
      });
    });
  });

  describe("Theme Toggle", () => {
    it("should render theme toggle button in header", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        const toggleButton = screen.getByRole("button", {
          name: /Toggle theme/i,
        });
        expect(toggleButton).toBeInTheDocument();
      });
    });

    it("should show sun icon in dark mode", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        const toggleButton = screen.getByRole("button", {
          name: /Toggle theme/i,
        });
        expect(toggleButton.textContent).toContain("☀️");
      });
    });

    it("should show moon icon in light mode", async () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: "",
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<SidePanel />);

      await waitFor(() => {
        const toggleButton = screen.getByRole("button", {
          name: /Toggle theme/i,
        });
        expect(toggleButton.textContent).toContain("🌙");
      });
    });

    it("should toggle theme when button is clicked", async () => {
      const user = userEvent.setup();
      render(<SidePanel />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Toggle theme/i }),
        ).toBeInTheDocument();
      });

      const toggleButton = screen.getByRole("button", {
        name: /Toggle theme/i,
      });

      // Initially dark (system preference)
      await waitFor(() => {
        expect(document.documentElement.getAttribute("data-theme")).toBe(
          "dark",
        );
      });

      // Click to toggle from system -> light
      await user.click(toggleButton);
      await waitFor(() => {
        expect(document.documentElement.getAttribute("data-theme")).toBe(
          "light",
        );
      });

      // Click to toggle from light -> dark
      await user.click(toggleButton);
      await waitFor(() => {
        expect(document.documentElement.getAttribute("data-theme")).toBe(
          "dark",
        );
      });

      // Click to toggle from dark -> system (which is dark in our mock)
      await user.click(toggleButton);
      await waitFor(() => {
        expect(document.documentElement.getAttribute("data-theme")).toBe(
          "dark",
        );
      });
    });

    it("should persist theme preference", async () => {
      const user = userEvent.setup();
      render(<SidePanel />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Toggle theme/i }),
        ).toBeInTheDocument();
      });

      const toggleButton = screen.getByRole("button", {
        name: /Toggle theme/i,
      });
      await user.click(toggleButton);

      expect(SettingsService.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: "light",
        }),
      );
    });
  });

  describe("Theme Preference Loading", () => {
    it("should load saved theme preference over system preference", async () => {
      const settingsWithTheme = {
        ...mockSettings,
        theme: "light" as const,
      };
      (SettingsService.loadSettings as any).mockResolvedValue(
        settingsWithTheme,
      );

      render(<SidePanel />);

      await waitFor(
        () => {
          expect(document.documentElement.getAttribute("data-theme")).toBe(
            "light",
          );
        },
        { timeout: 2000 },
      );
    });

    it("should respect 'system' theme setting", async () => {
      const settingsWithSystemTheme = {
        ...mockSettings,
        theme: "system" as const,
      };
      (SettingsService.loadSettings as any).mockResolvedValue(
        settingsWithSystemTheme,
      );

      render(<SidePanel />);

      await waitFor(() => {
        // Should use system preference (dark in our mock)
        expect(document.documentElement.getAttribute("data-theme")).toBe(
          "dark",
        );
      });
    });

    it("should handle theme change events from system", async () => {
      const mockAddEventListener = vi.fn();
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: "",
          onchange: null,
          addEventListener: mockAddEventListener,
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<SidePanel />);

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith(
          "change",
          expect.any(Function),
        );
      });
    });
  });

  describe("CSS Variables Application", () => {
    it("should apply CSS variables for dark theme", async () => {
      render(<SidePanel />);

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.getAttribute("data-theme")).toBe("dark");
        // CSS variables will be applied via CSS rules with [data-theme="dark"]
      });
    });

    it("should apply CSS variables for light theme", async () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: "",
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<SidePanel />);

      await waitFor(() => {
        const root = document.documentElement;
        expect(root.getAttribute("data-theme")).toBe("light");
        // CSS variables will be applied via CSS rules with [data-theme="light"]
      });
    });
  });

  describe("Three-way Toggle", () => {
    it("should cycle through light -> dark -> system on repeated clicks", async () => {
      const user = userEvent.setup();
      const settingsWithLight = {
        ...mockSettings,
        theme: "light" as const,
      };
      (SettingsService.loadSettings as any).mockResolvedValue(
        settingsWithLight,
      );

      render(<SidePanel />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Toggle theme/i }),
        ).toBeInTheDocument();
      });

      const toggleButton = screen.getByRole("button", {
        name: /Toggle theme/i,
      });

      // Wait for theme to be applied from settings
      await waitFor(() => {
        expect(document.documentElement.getAttribute("data-theme")).toBe(
          "light",
        );
      });

      // Click to dark
      await user.click(toggleButton);
      expect(SettingsService.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ theme: "dark" }),
      );

      // Click to system
      await user.click(toggleButton);
      expect(SettingsService.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ theme: "system" }),
      );

      // Click back to light
      await user.click(toggleButton);
      expect(SettingsService.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ theme: "light" }),
      );
    });
  });
});
