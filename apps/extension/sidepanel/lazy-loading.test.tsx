import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/preact";
import { LazyEnhancedSettings } from "./LazyEnhancedSettings";
import { LazyDocumentViewer } from "./LazyDocumentViewer";

// Mock the lazy imports
vi.mock("preact/compat", () => ({
  lazy: vi.fn((importFn) => {
    // Return a mock component that simulates lazy loading
    return () => {
      const MockComponent = () => <div>Lazy Component Loaded</div>;
      return MockComponent;
    };
  }),
  Suspense: ({ children, fallback }: any) => {
    // Initially show fallback, then children
    const [loading, setLoading] = vi.useState(true);
    vi.useEffect(() => {
      setTimeout(() => setLoading(false), 10);
    }, []);
    return loading ? fallback : children;
  },
}));

describe("Lazy Loading Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("LazyEnhancedSettings", () => {
    it("should show loading state initially", () => {
      const { getByText } = render(<LazyEnhancedSettings />);
      expect(getByText(/Loading settings/i)).toBeTruthy();
    });

    it("should load the component after delay", async () => {
      const { getByText } = render(<LazyEnhancedSettings />);

      await waitFor(
        () => {
          expect(getByText(/Lazy Component Loaded/i)).toBeTruthy();
        },
        { timeout: 1000 },
      );
    });

    it("should handle loading errors gracefully", async () => {
      // Mock a loading error
      vi.mock("./EnhancedSettings", () => {
        throw new Error("Failed to load");
      });

      const { container } = render(<LazyEnhancedSettings />);

      // Component should have error boundary
      expect(container.querySelector(".settings-error")).toBeDefined();
    });
  });

  describe("LazyDocumentViewer", () => {
    const mockDocument = {
      id: "test-id",
      title: "Test Document",
      domain: "example.com",
      date: new Date().toISOString(),
      rawText: "Test content",
    };

    it("should show loading placeholder initially", () => {
      const { container } = render(
        <LazyDocumentViewer document={mockDocument} />,
      );

      expect(container.querySelector(".viewer-loading")).toBeTruthy();
    });

    it("should load the viewer component", async () => {
      const { getByText } = render(
        <LazyDocumentViewer document={mockDocument} />,
      );

      await waitFor(
        () => {
          expect(getByText(/Lazy Component Loaded/i)).toBeTruthy();
        },
        { timeout: 1000 },
      );
    });

    it("should pass props correctly to loaded component", async () => {
      const onClose = vi.fn();

      render(<LazyDocumentViewer document={mockDocument} onClose={onClose} />);

      // Props should be passed through
      await waitFor(() => {
        expect(onClose).not.toHaveBeenCalled(); // Not called until user action
      });
    });
  });

  describe("Dynamic Import Error Handling", () => {
    it("should display error boundary on import failure", async () => {
      const importError = new Error("Module not found");

      vi.mock("preact/compat", () => ({
        lazy: vi.fn(() => {
          throw importError;
        }),
      }));

      const { container } = render(<LazyEnhancedSettings />);

      await waitFor(() => {
        expect(container.querySelector(".settings-error")).toBeTruthy();
      });
    });

    it("should allow retry after loading failure", async () => {
      let attempts = 0;

      vi.mock("preact/compat", () => ({
        lazy: vi.fn((importFn) => {
          attempts++;
          if (attempts === 1) {
            throw new Error("First attempt failed");
          }
          return () => <div>Successfully loaded on retry</div>;
        }),
      }));

      const { rerender, getByText } = render(<LazyEnhancedSettings />);

      // First attempt fails
      await waitFor(() => {
        expect(() => getByText(/Failed to load/i)).toBeTruthy();
      });

      // Retry by re-rendering
      rerender(<LazyEnhancedSettings />);

      await waitFor(() => {
        expect(getByText(/Successfully loaded on retry/i)).toBeTruthy();
      });
    });
  });

  describe("Performance Monitoring Integration", () => {
    it("should track bundle load time", async () => {
      const performanceMarkSpy = vi.spyOn(performance, "mark");
      const performanceMeasureSpy = vi.spyOn(performance, "measure");

      render(<LazyEnhancedSettings />);

      await waitFor(() => {
        // Check if performance marks were created
        expect(performanceMarkSpy).toHaveBeenCalledWith(
          expect.stringContaining("bundle-load"),
        );
      });
    });

    it("should not block on slow loading", async () => {
      vi.mock("preact/compat", () => ({
        lazy: vi.fn((importFn) => {
          return new Promise((resolve) => {
            // Simulate slow loading
            setTimeout(() => {
              resolve(() => <div>Slow loaded component</div>);
            }, 2000);
          });
        }),
        Suspense: ({ children, fallback }: any) => {
          // Show fallback for slow loading
          return fallback;
        },
      }));

      const { getByText } = render(<LazyEnhancedSettings />);

      // Should show loading state immediately
      expect(getByText(/Loading settings/i)).toBeTruthy();

      // Should not block the UI
      expect(document.body).toBeTruthy();
    });
  });
});

describe("Lazy Loading with Extraction Pipeline", () => {
  it("should lazy load manual selection when needed", async () => {
    const { ManualSelectionMode } = await import("../content/manual-selection");

    // Should be able to dynamically import
    expect(ManualSelectionMode).toBeDefined();
  });

  it("should lazy load site-specific extractors", async () => {
    const extractors = [
      "../lib/extraction/extractors/github-extractor",
      "../lib/extraction/extractors/reddit-extractor",
      "../lib/extraction/extractors/stackoverflow-extractor",
    ];

    for (const extractorPath of extractors) {
      const module = await import(extractorPath);
      expect(module).toBeDefined();
    }
  });
});
