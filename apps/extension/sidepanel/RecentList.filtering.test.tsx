import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { RecentList } from "./RecentList";
import { DocumentRepository } from "../lib/document-repository";
import { vi } from "vitest";

vi.mock("../lib/document-repository");

describe("RecentList Search Filtering", () => {
  let mockRepository: any;
  const mockOnViewDocument = vi.fn();

  const mockDocuments = [
    {
      id: "doc1",
      title: "Understanding JavaScript Closures",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures",
      domain: "developer.mozilla.org",
      rawText: "JavaScript closures are a fundamental concept...",
      summaryText:
        "This article explains how closures work in JavaScript, including lexical scoping and practical use cases.",
      summary: {
        content: "This article explains how closures work in JavaScript",
        model: "gpt-4o-mini",
        timestamp: "2024-01-15T10:00:00Z",
      },
      createdAt: "2024-01-15T10:00:00Z",
      summarizedAt: "2024-01-15T10:01:00Z",
    },
    {
      id: "doc2",
      title: "React Hooks Best Practices",
      url: "https://react.dev/learn",
      domain: "react.dev",
      rawText: "React Hooks provide a powerful way...",
      summaryText:
        "A guide to using React Hooks effectively, covering useState, useEffect, and custom hooks.",
      summary: {
        content: "A guide to using React Hooks effectively",
        model: "gpt-4o-mini",
        timestamp: "2024-01-14T09:00:00Z",
      },
      createdAt: "2024-01-14T09:00:00Z",
      summarizedAt: "2024-01-14T09:01:00Z",
    },
    {
      id: "doc3",
      title: "TypeScript Advanced Types",
      url: "https://www.typescriptlang.org/docs/handbook/advanced-types.html",
      domain: "typescriptlang.org",
      rawText: "TypeScript's type system is very powerful...",
      summaryText:
        "Deep dive into TypeScript's advanced type features including union types, generics, and type guards.",
      summary: {
        content: "Deep dive into TypeScript's advanced type features",
        model: "gpt-4o-mini",
        timestamp: "2024-01-13T08:00:00Z",
      },
      createdAt: "2024-01-13T08:00:00Z",
      summarizedAt: "2024-01-13T08:01:00Z",
    },
    {
      id: "doc4",
      title: "CSS Grid Layout Guide",
      url: "https://css-tricks.com/snippets/css/complete-guide-grid/",
      domain: "css-tricks.com",
      rawText: "CSS Grid Layout is the most powerful layout system...",
      summaryText:
        "Comprehensive guide to CSS Grid, covering grid containers, items, and responsive design patterns.",
      summary: {
        content: "Comprehensive guide to CSS Grid",
        model: "gpt-4o-mini",
        timestamp: "2024-01-12T07:00:00Z",
      },
      createdAt: "2024-01-12T07:00:00Z",
      summarizedAt: "2024-01-12T07:01:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      getRecentDocuments: vi.fn().mockResolvedValue(mockDocuments),
      deleteDocument: vi.fn().mockResolvedValue(undefined),
    };
    (DocumentRepository as any).mockImplementation(() => mockRepository);
  });

  describe("Document Filtering", () => {
    it("should filter documents by title (case-insensitive)", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "javascript");

      // Wait for debounce
      await waitFor(() => {
        // Should show only JavaScript-related document
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
        expect(
          screen.queryByText("React Hooks Best Practices"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText("TypeScript Advanced Types"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText("CSS Grid Layout Guide"),
        ).not.toBeInTheDocument();
      });
    });

    it("should filter documents by domain", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("React Hooks Best Practices"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "react.dev");

      // Wait for debounce
      await waitFor(() => {
        // Should show only document from react.dev
        expect(
          screen.getByText("React Hooks Best Practices"),
        ).toBeInTheDocument();
        expect(
          screen.queryByText("Understanding JavaScript Closures"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText("TypeScript Advanced Types"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText("CSS Grid Layout Guide"),
        ).not.toBeInTheDocument();
      });
    });

    it("should filter documents by summary text", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("TypeScript Advanced Types"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "union types");

      // Wait for debounce
      await waitFor(() => {
        // Should show only TypeScript document that mentions "union types" in summary
        expect(
          screen.getByText("TypeScript Advanced Types"),
        ).toBeInTheDocument();
        expect(
          screen.queryByText("Understanding JavaScript Closures"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText("React Hooks Best Practices"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText("CSS Grid Layout Guide"),
        ).not.toBeInTheDocument();
      });
    });

    it("should show multiple matching documents", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("React Hooks Best Practices"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "guide");

      // Wait for debounce
      await waitFor(() => {
        // Should show both documents with "guide" in their content
        expect(
          screen.getByText("React Hooks Best Practices"),
        ).toBeInTheDocument(); // Has "guide" in summary
        expect(screen.getByText("CSS Grid Layout Guide")).toBeInTheDocument(); // Has "Guide" in title
        expect(
          screen.queryByText("Understanding JavaScript Closures"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText("TypeScript Advanced Types"),
        ).not.toBeInTheDocument();
      });
    });

    it("should maintain original sort order in filtered results", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("React Hooks Best Practices"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "types");

      // Wait for debounce
      await waitFor(() => {
        // Both TypeScript and React docs match
        const documentTitles = screen
          .getAllByRole("heading", { level: 3 })
          .map((el) => el.textContent);

        // TypeScript should come after React (maintaining original order)
        const reactIndex = documentTitles.indexOf("React Hooks Best Practices");
        const tsIndex = documentTitles.indexOf("TypeScript Advanced Types");
        expect(reactIndex).toBeLessThan(tsIndex);
      });
    });

    it("should show all documents when search is cleared", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");

      // Filter to one document
      await user.type(searchInput, "javascript");

      await waitFor(() => {
        expect(
          screen.queryByText("React Hooks Best Practices"),
        ).not.toBeInTheDocument();
      });

      // Clear search
      const clearButton = screen.getByLabelText("Clear search");
      await user.click(clearButton);

      // All documents should be visible again
      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("React Hooks Best Practices"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("TypeScript Advanced Types"),
        ).toBeInTheDocument();
        expect(screen.getByText("CSS Grid Layout Guide")).toBeInTheDocument();
      });
    });

    it.skip("should debounce search input", async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ delay: null }); // Remove delay for controlled timing

      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");

      // Type quickly
      await user.type(searchInput, "java");

      // Documents should still all be visible (not filtered yet)
      expect(
        screen.getByText("Understanding JavaScript Closures"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("React Hooks Best Practices"),
      ).toBeInTheDocument();

      // Advance time by 150ms to trigger debounce
      vi.advanceTimersByTime(150);

      await waitFor(() => {
        // Now only JavaScript document should be visible
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
        expect(
          screen.queryByText("React Hooks Best Practices"),
        ).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it.skip("should be case-insensitive when searching", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      // Test uppercase search
      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "JAVASCRIPT");

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
        expect(
          screen.queryByText("React Hooks Best Practices"),
        ).not.toBeInTheDocument();
      });

      // Clear and test mixed case
      await user.clear(searchInput);
      await user.type(searchInput, "JaVaScRiPt");

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
        expect(
          screen.queryByText("React Hooks Best Practices"),
        ).not.toBeInTheDocument();
      });
    });

    it.skip("should use useMemo for performance optimization", async () => {
      // This test verifies the implementation uses useMemo
      // We'll check that filtering doesn't cause unnecessary re-renders
      const user = userEvent.setup();

      let renderCount = 0;
      const CountingRecentList = () => {
        renderCount++;
        return <RecentList onViewDocument={mockOnViewDocument} />;
      };

      render(<CountingRecentList />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      const initialRenderCount = renderCount;

      // Type in search - should cause re-render for state change
      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "j");

      // Wait for filtering to apply
      await waitFor(() => {
        // Should have re-rendered for the search state change and filtering
        expect(renderCount).toBeGreaterThanOrEqual(initialRenderCount + 1);
      });
    });
  });
});
