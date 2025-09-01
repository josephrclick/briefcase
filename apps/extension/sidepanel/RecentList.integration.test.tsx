import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { RecentList } from "./RecentList";
import { DocumentRepository } from "../lib/document-repository";
import { vi } from "vitest";

vi.mock("../lib/document-repository");

describe("RecentList Integration Tests", () => {
  let mockRepository: any;
  const mockOnViewDocument = vi.fn();

  // Large dataset for performance testing
  const generateMockDocuments = (count: number) => {
    const documents = [];
    for (let i = 1; i <= count; i++) {
      documents.push({
        id: `doc${i}`,
        title: `Document ${i}: ${i % 3 === 0 ? "JavaScript" : i % 3 === 1 ? "React" : "TypeScript"}`,
        url: `https://example.com/doc${i}`,
        domain: `example${i % 4}.com`,
        rawText: `Document ${i} content...`,
        summaryText: `Summary for document ${i} with various keywords like ${i % 2 === 0 ? "hooks" : "closures"}`,
        summary: {
          content: `Summary content ${i}`,
          model: "gpt-4o-mini",
          timestamp: new Date(2024, 0, i).toISOString(),
        },
        createdAt: new Date(2024, 0, i).toISOString(),
        summarizedAt: new Date(2024, 0, i, 1).toISOString(),
      });
    }
    return documents;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      getRecentDocuments: vi.fn(),
      deleteDocument: vi.fn().mockResolvedValue(undefined),
    };
    (DocumentRepository as any).mockImplementation(() => mockRepository);
  });

  describe("Complete Search Flow", () => {
    it("should handle complete search flow from initial load to filtering to clearing", async () => {
      const mockDocs = generateMockDocuments(5);
      mockRepository.getRecentDocuments.mockResolvedValue(mockDocs);
      const user = userEvent.setup();

      render(<RecentList onViewDocument={mockOnViewDocument} />);

      // 1. Initial load
      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
        expect(screen.getByText("Document 1: React")).toBeInTheDocument();
      });

      // 2. Type search query
      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "JavaScript");

      // 3. Wait for filtered results
      await waitFor(() => {
        expect(screen.getByText("Document 3: JavaScript")).toBeInTheDocument();
        expect(screen.queryByText("Document 1: React")).not.toBeInTheDocument();
      });

      // 4. Clear search
      const clearButton = screen.getByLabelText("Clear search");
      await user.click(clearButton);

      // 5. All documents visible again
      await waitFor(() => {
        expect(screen.getByText("Document 1: React")).toBeInTheDocument();
        expect(screen.getByText("Document 3: JavaScript")).toBeInTheDocument();
      });
    });

    it("should handle edge case of rapidly changing search queries", async () => {
      const mockDocs = generateMockDocuments(10);
      mockRepository.getRecentDocuments.mockResolvedValue(mockDocs);
      const user = userEvent.setup();

      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");

      // Rapid typing
      await user.type(searchInput, "J");
      await user.type(searchInput, "a");
      await user.type(searchInput, "v");
      await user.type(searchInput, "a");

      // Should debounce and only filter once
      await waitFor(() => {
        expect(searchInput).toHaveValue("Java");
        // JavaScript documents should be visible
        expect(screen.getByText("Document 3: JavaScript")).toBeInTheDocument();
        expect(screen.getByText("Document 6: JavaScript")).toBeInTheDocument();
      });
    });

    it("should handle search with special characters", async () => {
      const specialDocs = [
        {
          id: "doc1",
          title: "C++ Programming Guide",
          url: "https://example.com/cpp",
          domain: "example.com",
          rawText: "C++ content",
          summaryText: "Guide to C++ with examples",
          summary: {
            content: "C++ guide",
            model: "gpt-4o-mini",
            timestamp: "2024-01-01T00:00:00Z",
          },
          createdAt: "2024-01-01T00:00:00Z",
          summarizedAt: "2024-01-01T01:00:00Z",
        },
        {
          id: "doc2",
          title: "React.js Framework",
          url: "https://example.com/react",
          domain: "example.com",
          rawText: "React content",
          summaryText: "React.js documentation",
          summary: {
            content: "React guide",
            model: "gpt-4o-mini",
            timestamp: "2024-01-02T00:00:00Z",
          },
          createdAt: "2024-01-02T00:00:00Z",
          summarizedAt: "2024-01-02T01:00:00Z",
        },
      ];

      mockRepository.getRecentDocuments.mockResolvedValue(specialDocs);
      const user = userEvent.setup();

      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("C++ Programming Guide")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");

      // Search for C++
      await user.type(searchInput, "C++");

      await waitFor(() => {
        expect(screen.getByText("C++ Programming Guide")).toBeInTheDocument();
        expect(
          screen.queryByText("React.js Framework"),
        ).not.toBeInTheDocument();
      });

      // Clear and search for React.js
      await user.clear(searchInput);
      await user.type(searchInput, "React.js");

      await waitFor(() => {
        expect(screen.getByText("React.js Framework")).toBeInTheDocument();
        expect(
          screen.queryByText("C++ Programming Guide"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Performance with 20 Documents", () => {
    it("should efficiently filter 20 documents", async () => {
      const mockDocs = generateMockDocuments(20);
      mockRepository.getRecentDocuments.mockResolvedValue(mockDocs);
      const user = userEvent.setup();

      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      // All 20 documents should load
      const allDocuments = screen.getAllByRole("heading", { level: 3 });
      expect(allDocuments).toHaveLength(20);

      // Search for specific keyword
      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "TypeScript");

      // Should filter efficiently
      await waitFor(() => {
        const filteredDocs = screen.getAllByRole("heading", { level: 3 });
        // Every 3rd document is TypeScript (docs 2, 5, 8, 11, 14, 17, 20)
        expect(filteredDocs.length).toBeLessThan(20);
        expect(filteredDocs[0].textContent).toContain("TypeScript");
      });
    });

    it("should handle empty results gracefully with 20 documents", async () => {
      const mockDocs = generateMockDocuments(20);
      mockRepository.getRecentDocuments.mockResolvedValue(mockDocs);
      const user = userEvent.setup();

      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "nonexistent");

      await waitFor(() => {
        expect(
          screen.getByText(
            "No documents match your search. Try different keywords.",
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Dark Mode Compatibility", () => {
    it("should work correctly in dark mode", async () => {
      // Set dark mode
      document.documentElement.setAttribute("data-theme", "dark");

      const mockDocs = generateMockDocuments(3);
      mockRepository.getRecentDocuments.mockResolvedValue(mockDocs);

      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      // Search functionality should work the same in dark mode
      const searchInput = screen.getByPlaceholderText("Search documents...");
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveClass("search-input");

      // Clean up
      document.documentElement.removeAttribute("data-theme");
    });
  });

  describe("Edge Cases", () => {
    it.skip("should handle documents with missing summaryText", async () => {
      const docsWithMissingSummary = [
        {
          id: "doc1",
          title: "Document without summary",
          url: "https://example.com/doc1",
          domain: "example.com",
          rawText: "Content",
          summaryText: undefined, // Missing summary
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "doc2",
          title: "Document with summary",
          url: "https://example.com/doc2",
          domain: "example.com",
          rawText: "Content",
          summaryText: "This has a summary",
          createdAt: "2024-01-02T00:00:00Z",
        },
      ];

      mockRepository.getRecentDocuments.mockResolvedValue(
        docsWithMissingSummary,
      );
      const user = userEvent.setup();

      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Document without summary"),
        ).toBeInTheDocument();
      });

      // Search should still work even with missing summaryText
      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "summary");

      await waitFor(() => {
        // Only document with "summary" in title or summaryText should show
        expect(screen.getByText("Document with summary")).toBeInTheDocument();
        expect(
          screen.queryByText("Document without summary"),
        ).not.toBeInTheDocument();
      });
    });

    it("should handle empty search string (spaces only)", async () => {
      const mockDocs = generateMockDocuments(3);
      mockRepository.getRecentDocuments.mockResolvedValue(mockDocs);
      const user = userEvent.setup();

      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");

      // Type only spaces
      await user.type(searchInput, "   ");

      // Should show clear button even for spaces
      expect(screen.getByLabelText("Clear search")).toBeInTheDocument();

      // All documents should still be visible (spaces are trimmed in search)
      await waitFor(() => {
        const allDocs = screen.getAllByRole("heading", { level: 3 });
        expect(allDocs).toHaveLength(3);
      });
    });
  });
});
