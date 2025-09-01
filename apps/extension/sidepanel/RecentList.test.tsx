import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { RecentList } from "./RecentList";
import { DocumentRepository } from "../lib/document-repository";
import { vi } from "vitest";

vi.mock("../lib/document-repository");

describe("RecentList Component", () => {
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      getRecentDocuments: vi.fn().mockResolvedValue(mockDocuments),
      deleteDocument: vi.fn().mockResolvedValue(undefined),
    };
    (DocumentRepository as any).mockImplementation(() => mockRepository);
  });

  describe("Search Input Component", () => {
    it("should render search input below the heading", async () => {
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute("type", "text");
    });

    it("should have proper ARIA labels for accessibility", async () => {
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText("Search documents");
      expect(searchInput).toBeInTheDocument();
    });

    it("should update search state when typing", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "JavaScript");

      expect(searchInput).toHaveValue("JavaScript");
    });

    it("should show clear button when search query is present", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");

      // Initially, clear button should not be visible
      let clearButton = screen.queryByLabelText("Clear search");
      expect(clearButton).not.toBeInTheDocument();

      // Type in search input
      await user.type(searchInput, "test");

      // Clear button should now be visible
      clearButton = screen.getByLabelText("Clear search");
      expect(clearButton).toBeInTheDocument();
    });

    it("should clear search when clear button is clicked", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "JavaScript");

      const clearButton = screen.getByLabelText("Clear search");
      await user.click(clearButton);

      expect(searchInput).toHaveValue("");
      expect(clearButton).not.toBeInTheDocument();
    });

    it("should clear search when Escape key is pressed", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "JavaScript");
      expect(searchInput).toHaveValue("JavaScript");

      await user.keyboard("{Escape}");
      expect(searchInput).toHaveValue("");
    });

    it("should maintain focus after clearing search", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      await user.type(searchInput, "test");

      const clearButton = screen.getByLabelText("Clear search");
      await user.click(clearButton);

      expect(searchInput).toHaveFocus();
    });

    it("should style search input to match existing design system", async () => {
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(screen.getByText("Recent Documents")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search documents...");
      expect(searchInput).toHaveClass("search-input");

      const searchContainer = searchInput.closest(".search-container");
      expect(searchContainer).toBeInTheDocument();
    });
  });

  describe("Basic Functionality", () => {
    it("should load and display recent documents", async () => {
      render(<RecentList onViewDocument={mockOnViewDocument} />);

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
      });
    });

    it("should call onViewDocument when a document is clicked", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      const documentItem = screen
        .getByText("Understanding JavaScript Closures")
        .closest(".document-info");
      await user.click(documentItem!);

      expect(mockOnViewDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "doc1",
          title: "Understanding JavaScript Closures",
        }),
      );
    });

    it("should delete a document when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText("Understanding JavaScript Closures"),
        ).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText("Delete document");
      await user.click(deleteButtons[0]);

      expect(mockRepository.deleteDocument).toHaveBeenCalledWith("doc1");

      await waitFor(() => {
        expect(
          screen.queryByText("Understanding JavaScript Closures"),
        ).not.toBeInTheDocument();
      });
    });

    it("should display empty state when no documents exist", async () => {
      mockRepository.getRecentDocuments.mockResolvedValue([]);
      render(<RecentList onViewDocument={mockOnViewDocument} />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "No documents yet. Start summarizing pages to see them here!",
          ),
        ).toBeInTheDocument();
      });
    });

    it("should display loading state initially", () => {
      render(<RecentList onViewDocument={mockOnViewDocument} />);
      expect(
        screen.getByText("Loading recent documents..."),
      ).toBeInTheDocument();
    });
  });
});
