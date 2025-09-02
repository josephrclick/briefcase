import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ManualSelectionMode } from "./manual-selection";
import { ManualSelectionError } from "./errors";

describe("ManualSelectionMode", () => {
  let manualSelection: ManualSelectionMode;
  let mockDocument: Document;
  let mockSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDocument = document.implementation.createHTMLDocument("Test");
    mockDocument.body.innerHTML = `
      <article>
        <h1>Test Article Title</h1>
        <p id="p1">First paragraph with some content that should be selectable. This is a longer piece of text to ensure we meet the minimum character requirements for testing. We need at least 800 characters for a valid selection, so this paragraph contains additional content about various topics including technology, science, and literature. The purpose is to create realistic test scenarios that match production usage patterns. This first paragraph alone should contain several hundred characters to properly test the selection functionality.</p>
        <p id="p2">Second paragraph with more content for testing. This paragraph also needs to be substantially longer to ensure proper testing of the manual selection mode. We're adding discussions about different subjects like history, mathematics, and philosophy. The content doesn't need to be particularly meaningful, but it should be long enough to properly test character counting, truncation, and other features. This helps ensure our tests accurately reflect real-world usage scenarios where users would select substantial portions of article text.</p>
        <div class="sidebar">
          <p>Sidebar content that might be selected but is typically less important than main content</p>
        </div>
        <section id="main-content">
          <p id="p3">Main content paragraph with important information. This section represents the primary content area of a typical web page. It contains the most relevant information that users would want to extract and summarize. The text here is designed to be substantive and meaningful.</p>
          <p id="p4">Another paragraph with additional details about the main topic. This provides supporting information and context that enriches the primary content. Together with the previous paragraph, this forms a cohesive content block.</p>
        </section>
      </article>
    `;

    // Mock chrome.runtime.sendMessage
    mockSendMessage = vi.fn();
    global.chrome = {
      runtime: {
        sendMessage: mockSendMessage,
      },
    } as any;

    manualSelection = new ManualSelectionMode(mockDocument);
  });

  afterEach(() => {
    // Clean up any overlay elements
    const overlay = mockDocument.querySelector(".briefcase-selection-overlay");
    if (overlay) {
      overlay.remove();
    }
    vi.clearAllMocks();
  });

  describe("Overlay Creation and Management", () => {
    it("should create overlay when activated", () => {
      manualSelection.activate();

      const overlay = mockDocument.querySelector(
        ".briefcase-selection-overlay",
      );
      expect(overlay).toBeTruthy();
      expect(overlay?.classList.contains("briefcase-selection-overlay")).toBe(
        true,
      );
    });

    it("should remove overlay when deactivated", () => {
      manualSelection.activate();
      expect(
        mockDocument.querySelector(".briefcase-selection-overlay"),
      ).toBeTruthy();

      manualSelection.deactivate();
      expect(
        mockDocument.querySelector(".briefcase-selection-overlay"),
      ).toBeFalsy();
    });

    it("should not create multiple overlays", () => {
      manualSelection.activate();
      manualSelection.activate(); // Activate again

      const overlays = mockDocument.querySelectorAll(
        ".briefcase-selection-overlay",
      );
      expect(overlays.length).toBe(1);
    });

    it("should add overlay styles to document head", () => {
      manualSelection.activate();

      const style = mockDocument.querySelector(
        "style#briefcase-selection-styles",
      );
      expect(style).toBeTruthy();
      expect(style?.textContent).toContain(".briefcase-selection-overlay");
      expect(style?.textContent).toContain(".briefcase-highlightable");
      expect(style?.textContent).toContain(".briefcase-selected");
    });
  });

  describe("Region Highlighting", () => {
    it("should highlight hoverable regions on activation", () => {
      manualSelection.activate();

      const highlightableElements = mockDocument.querySelectorAll(
        ".briefcase-highlightable",
      );
      expect(highlightableElements.length).toBeGreaterThan(0);

      // Check that content elements are marked as highlightable
      const article = mockDocument.querySelector("article");
      expect(article?.classList.contains("briefcase-highlightable")).toBe(true);
    });

    it("should add hover effects to highlightable regions", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      expect(p1?.classList.contains("briefcase-highlightable")).toBe(true);

      // Simulate mouse enter
      const mouseEnter = new MouseEvent("mouseenter", { bubbles: true });
      p1?.dispatchEvent(mouseEnter);
      expect(p1?.classList.contains("briefcase-hover")).toBe(true);

      // Simulate mouse leave
      const mouseLeave = new MouseEvent("mouseleave", { bubbles: true });
      p1?.dispatchEvent(mouseLeave);
      expect(p1?.classList.contains("briefcase-hover")).toBe(false);
    });

    it("should identify main content regions with higher priority", () => {
      manualSelection.activate();

      const mainContent = mockDocument.getElementById("main-content");
      const sidebar = mockDocument.querySelector(".sidebar");

      // Main content should be highlightable
      expect(mainContent?.classList.contains("briefcase-highlightable")).toBe(
        true,
      );

      // Both should be highlightable but main content gets priority
      expect(sidebar?.classList.contains("briefcase-highlightable")).toBe(true);
      expect(mainContent?.dataset.selectionPriority).toBe("high");
    });
  });

  describe("Click-to-Select Functionality", () => {
    it("should select element on click", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      const clickEvent = new MouseEvent("click", { bubbles: true });
      p1?.dispatchEvent(clickEvent);

      expect(p1?.classList.contains("briefcase-selected")).toBe(true);
      expect(manualSelection.getSelectedContent()).toContain("First paragraph");
    });

    it("should deselect previously selected element when clicking another", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      const p2 = mockDocument.getElementById("p2");

      // Select first paragraph
      p1?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(p1?.classList.contains("briefcase-selected")).toBe(true);

      // Select second paragraph
      p2?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(p1?.classList.contains("briefcase-selected")).toBe(false);
      expect(p2?.classList.contains("briefcase-selected")).toBe(true);
    });

    it("should allow multiple selection with Ctrl/Cmd key", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      const p2 = mockDocument.getElementById("p2");

      // Select first paragraph
      p1?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // Select second paragraph with Ctrl key
      p2?.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          ctrlKey: true,
        }),
      );

      expect(p1?.classList.contains("briefcase-selected")).toBe(true);
      expect(p2?.classList.contains("briefcase-selected")).toBe(true);

      const content = manualSelection.getSelectedContent();
      expect(content).toContain("First paragraph");
      expect(content).toContain("Second paragraph");
    });
  });

  describe("Drag-to-Select Functionality", () => {
    it("should select text range on drag", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      const p2 = mockDocument.getElementById("p2");

      // Simulate drag from p1 to p2
      const mouseDown = new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 0,
        clientY: 0,
      });
      p1?.dispatchEvent(mouseDown);

      const mouseMove = new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 100,
        clientY: 50,
      });
      mockDocument.dispatchEvent(mouseMove);

      const mouseUp = new MouseEvent("mouseup", {
        bubbles: true,
        clientX: 100,
        clientY: 50,
      });
      p2?.dispatchEvent(mouseUp);

      // Both paragraphs should be selected
      expect(p1?.classList.contains("briefcase-selected")).toBe(true);
      expect(p2?.classList.contains("briefcase-selected")).toBe(true);
    });

    it("should show selection rectangle during drag", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");

      // Start drag
      const mouseDown = new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 10,
        clientY: 10,
      });
      p1?.dispatchEvent(mouseDown);

      // Move mouse
      const mouseMove = new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      });
      mockDocument.dispatchEvent(mouseMove);

      const selectionRect = mockDocument.querySelector(
        ".briefcase-selection-rect",
      );
      expect(selectionRect).toBeTruthy();

      // End drag
      const mouseUp = new MouseEvent("mouseup", {
        bubbles: true,
      });
      mockDocument.dispatchEvent(mouseUp);

      // Selection rectangle should be removed
      expect(
        mockDocument.querySelector(".briefcase-selection-rect"),
      ).toBeFalsy();
    });
  });

  describe("Selection Preview", () => {
    it("should show preview with character count", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      p1?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const preview = mockDocument.querySelector(
        ".briefcase-selection-preview",
      );
      expect(preview).toBeTruthy();

      const charCount = preview?.querySelector(".briefcase-char-count");
      expect(charCount?.textContent).toMatch(/\d+ characters/);
    });

    it("should update preview when selection changes", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      const p2 = mockDocument.getElementById("p2");

      // Select first paragraph
      p1?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      const preview1 = mockDocument.querySelector(
        ".briefcase-selection-preview",
      );
      const initialCount = preview1?.querySelector(
        ".briefcase-char-count",
      )?.textContent;

      // Select second paragraph
      p2?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      const preview2 = mockDocument.querySelector(
        ".briefcase-selection-preview",
      );
      const newCount = preview2?.querySelector(
        ".briefcase-char-count",
      )?.textContent;

      expect(newCount).not.toBe(initialCount);
    });

    it("should show truncated preview for long selections", () => {
      manualSelection.activate();

      // Add a long paragraph
      const longP = mockDocument.createElement("p");
      longP.id = "long";
      longP.textContent = "x".repeat(1000);
      mockDocument.body.appendChild(longP);

      longP.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const preview = mockDocument.querySelector(
        ".briefcase-selection-preview",
      );
      const previewText = preview?.querySelector(".briefcase-preview-text");

      expect(previewText?.textContent?.length).toBeLessThan(500);
      expect(previewText?.textContent).toContain("...");
    });
  });

  describe("Selection Confirmation and Cancellation", () => {
    it("should show floating toolbar with confirm and cancel buttons", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      p1?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const toolbar = mockDocument.querySelector(
        ".briefcase-selection-toolbar",
      );
      expect(toolbar).toBeTruthy();

      const confirmBtn = toolbar?.querySelector(".briefcase-confirm-btn");
      const cancelBtn = toolbar?.querySelector(".briefcase-cancel-btn");

      expect(confirmBtn).toBeTruthy();
      expect(cancelBtn).toBeTruthy();
      expect(confirmBtn?.textContent).toBe("Confirm Selection");
      expect(cancelBtn?.textContent).toBe("Cancel");
    });

    it("should send selected content on confirmation", async () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      p1?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const confirmBtn = mockDocument.querySelector(".briefcase-confirm-btn");
      confirmBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(mockSendMessage).toHaveBeenCalledWith({
        action: "MANUAL_SELECTION_COMPLETE",
        payload: {
          text: expect.stringContaining("First paragraph"),
          metadata: expect.objectContaining({
            method: "manual",
            selectionCount: 1,
          }),
        },
      });
    });

    it("should clear selection on cancellation", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      p1?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(p1?.classList.contains("briefcase-selected")).toBe(true);

      const cancelBtn = mockDocument.querySelector(".briefcase-cancel-btn");
      cancelBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(p1?.classList.contains("briefcase-selected")).toBe(false);
      expect(
        mockDocument.querySelector(".briefcase-selection-toolbar"),
      ).toBeFalsy();
      expect(
        mockDocument.querySelector(".briefcase-selection-preview"),
      ).toBeFalsy();
    });

    it("should validate minimum content length before confirmation", () => {
      manualSelection.activate();

      // Create element with short content
      const shortP = mockDocument.createElement("p");
      shortP.textContent = "Too short";
      mockDocument.body.appendChild(shortP);

      shortP.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const confirmBtn = mockDocument.querySelector(
        ".briefcase-confirm-btn",
      ) as HTMLButtonElement;
      expect(confirmBtn?.disabled).toBe(true);

      const preview = mockDocument.querySelector(
        ".briefcase-selection-preview",
      );
      const warning = preview?.querySelector(".briefcase-warning");
      expect(warning?.textContent).toContain("Minimum 800 characters required");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should cancel selection on Escape key", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      p1?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(p1?.classList.contains("briefcase-selected")).toBe(true);

      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      mockDocument.dispatchEvent(escapeEvent);

      expect(p1?.classList.contains("briefcase-selected")).toBe(false);
      expect(manualSelection.isActive()).toBe(false);
    });

    it("should confirm selection on Enter key", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      p1?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      });
      mockDocument.dispatchEvent(enterEvent);

      expect(mockSendMessage).toHaveBeenCalledWith({
        action: "MANUAL_SELECTION_COMPLETE",
        payload: expect.objectContaining({
          text: expect.stringContaining("First paragraph"),
        }),
      });
    });

    it("should navigate highlightable elements with Tab key", () => {
      manualSelection.activate();

      const highlightables = Array.from(
        mockDocument.querySelectorAll(".briefcase-highlightable"),
      ) as HTMLElement[];

      // Tab through elements
      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
      });

      mockDocument.dispatchEvent(tabEvent);
      expect(highlightables[0]?.classList.contains("briefcase-focused")).toBe(
        true,
      );

      mockDocument.dispatchEvent(tabEvent);
      expect(highlightables[0]?.classList.contains("briefcase-focused")).toBe(
        false,
      );
      expect(highlightables[1]?.classList.contains("briefcase-focused")).toBe(
        true,
      );
    });

    it("should select focused element with Space key", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1") as HTMLElement;
      p1?.classList.add("briefcase-focused");

      const spaceEvent = new KeyboardEvent("keydown", {
        key: " ",
        bubbles: true,
      });
      mockDocument.dispatchEvent(spaceEvent);

      expect(p1?.classList.contains("briefcase-selected")).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle selection on pages without suitable content", () => {
      // Clear body content
      mockDocument.body.innerHTML = "";

      expect(() => manualSelection.activate()).not.toThrow();

      const overlay = mockDocument.querySelector(
        ".briefcase-selection-overlay",
      );
      expect(overlay).toBeTruthy();

      const warning = overlay?.querySelector(".briefcase-no-content-warning");
      expect(warning?.textContent).toContain("No selectable content found");
    });

    it("should handle errors during content extraction", () => {
      manualSelection.activate();

      // Mock an element that throws when accessing textContent
      const problematicElement = mockDocument.createElement("p");
      Object.defineProperty(problematicElement, "textContent", {
        get: () => {
          throw new Error("Access denied");
        },
      });
      mockDocument.body.appendChild(problematicElement);

      // Should handle the error gracefully
      expect(() => {
        problematicElement.dispatchEvent(
          new MouseEvent("click", { bubbles: true }),
        );
      }).not.toThrow();
    });

    it("should throw ManualSelectionError for invalid operations", () => {
      // Try to get content without activation
      expect(() => manualSelection.getSelectedContent()).toThrow(
        ManualSelectionError,
      );

      // Try to confirm without selection
      manualSelection.activate();
      expect(() => manualSelection.confirmSelection()).toThrow(
        ManualSelectionError,
      );
    });
  });

  describe("Integration with Extraction Pipeline", () => {
    it("should format extracted content for pipeline", () => {
      manualSelection.activate();

      const article = mockDocument.querySelector("article");
      article?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const result = manualSelection.getExtractionResult();

      expect(result).toEqual({
        success: true,
        method: "manual",
        content: {
          text: expect.any(String),
          title: "Test Article Title",
          html: expect.any(String),
        },
        metadata: {
          selectionCount: 1,
          totalCharacters: expect.any(Number),
          timestamp: expect.any(String),
        },
      });
    });

    it("should maintain extraction result interface compatibility", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      p1?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const result = manualSelection.getExtractionResult();

      // Should match IExtractionResult interface
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("method");
      expect(result).toHaveProperty("content");
      expect(result.content).toHaveProperty("text");
    });
  });

  describe("Visual Feedback and Accessibility", () => {
    it("should provide visual feedback for keyboard navigation", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1") as HTMLElement;

      // Focus element
      p1.focus();
      expect(p1.classList.contains("briefcase-focused")).toBe(true);

      // Should have appropriate ARIA attributes
      expect(p1.getAttribute("tabindex")).toBe("0");
      expect(p1.getAttribute("role")).toBe("button");
      expect(p1.getAttribute("aria-label")).toContain("Select this content");
    });

    it("should announce selection changes to screen readers", () => {
      manualSelection.activate();

      const p1 = mockDocument.getElementById("p1");
      p1?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const announcement = mockDocument.querySelector(
        '[role="status"][aria-live="polite"]',
      );
      expect(announcement?.textContent).toContain("Content selected");
    });

    it("should maintain focus trap within overlay", () => {
      manualSelection.activate();

      const overlay = mockDocument.querySelector(
        ".briefcase-selection-overlay",
      );
      const focusableElements = overlay?.querySelectorAll(
        'button, [tabindex="0"], [tabindex="1"]',
      );

      expect(focusableElements?.length).toBeGreaterThan(0);

      // Tab at the end should loop back to beginning
      const lastElement = focusableElements?.[
        focusableElements.length - 1
      ] as HTMLElement;
      lastElement?.focus();

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
      });
      lastElement?.dispatchEvent(tabEvent);

      const firstElement = focusableElements?.[0] as HTMLElement;
      expect(mockDocument.activeElement).toBe(firstElement);
    });
  });
});
