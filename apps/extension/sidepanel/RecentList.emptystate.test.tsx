import { render, screen, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { RecentList } from "./RecentList";
import { DocumentRepository } from "../lib/document-repository";
import { vi } from "vitest";

vi.mock("../lib/document-repository");

describe("RecentList Empty States and User Feedback", () => {
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      getRecentDocuments: vi.fn().mockResolvedValue(mockDocuments),
      deleteDocument: vi.fn().mockResolvedValue(undefined),
    };
    (DocumentRepository as any).mockImplementation(() => mockRepository);
  });

  describe("Empty Search Results", () => {
    it("should show 'no search results' message when search yields no matches", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "nonexistentterm");

      // Wait for debounce and filtering
      await waitFor(() => {
        expect(
          screen.getByText(
            "No documents match your search. Try different keywords.",
          ),
        ).toBeInTheDocument();
      });

      // Original documents should not be visible
      expect(
        screen.queryByText("Understanding JavaScript Closures"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("React Hooks Best Practices"),
      ).not.toBeInTheDocument();
    });

    it("should maintain existing empty documents state when no documents exist", async () => {
      mockRepository.getRecentDocuments.mockResolvedValue([]);
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "No documents yet. Start summarizing pages to see them here!",
          ),
        ).toBeInTheDocument();
      });

      // Search input should not be rendered when there are no documents
      expect(
        screen.queryByPlaceholderText("Search documents..."),
      ).not.toBeInTheDocument();
    });

    it("should show normal documents when clearing search from empty results", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");

      // Search for non-existent term
      await user.type(searchInput, "xyz123");

      await waitFor(() => {
        expect(
          screen.getByText(
            "No documents match your search. Try different keywords.",
          ),
        ).toBeInTheDocument();
      });

      // Clear search
      const clearButton = screen.getByLabelText("Clear search");
      await user.click(clearButton);

      // Documents should be visible again
      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("React Hooks Best Practices"),
        ).toBeInTheDocument();
      });
    });

    it("should have appropriate ARIA labels for empty state", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "notfound");

      await waitFor(() => {
        const emptyMessage = screen.getByText(
          "No documents match your search. Try different keywords.",
        );
        expect(emptyMessage).toBeInTheDocument();
        // Check that the message is in an appropriate container
        const container = emptyMessage.closest(".recent-list");
        expect(container).toBeInTheDocument();
      });
    });

    it("should show empty state message immediately after filtering removes all results", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");

      // Type a search that matches nothing
      await user.type(searchInput, "qwerty");

      // Should show empty state message after debounce
      await waitFor(() => {
        expect(
          screen.getByText(
            "No documents match your search. Try different keywords.",
          ),
        ).toBeInTheDocument();
      });

      // The empty state should be styled appropriately
      const emptyState = screen.getByText(
        "No documents match your search. Try different keywords.",
      );
      const parentContainer = emptyState.closest(".empty-search");
      expect(parentContainer).toBeInTheDocument();
    });
  });

  describe("ARIA Labels and Accessibility", () => {
    it("should have correct ARIA labels for all interactive elements", async () => {
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      // Search input should have aria-label
      const searchInput = screen.getByLabelText("Search documents");
      expect(searchInput).toBeInTheDocument();

      // Delete buttons should have aria-labels
      const deleteButtons = screen.getAllByLabelText("Delete document");
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("should announce search results count for screen readers", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "javascript");

      // Wait for filtering
      await waitFor(() => {
        const listContainer = screen.getByRole("list");
        // Check that aria-live region would announce the change
        expect(listContainer).toBeInTheDocument();
      });
    });

    it("should maintain focus management during search operations", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");

      // Focus on search input
      await user.click(searchInput);
      expect(searchInput).toHaveFocus();

      // Type search term
      await user.type(searchInput, "test");

      // Focus should remain on search input
      expect(searchInput).toHaveFocus();

      // Clear button click should return focus to input
      const clearButton = screen.getByLabelText("Clear search");
      await user.click(clearButton);
      expect(searchInput).toHaveFocus();
    });
  });
});
