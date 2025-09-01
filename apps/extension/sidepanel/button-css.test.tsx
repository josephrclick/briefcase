import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/preact";
import { FunctionalComponent } from "preact";

// Test component to render with CSS
const TestDangerZone: FunctionalComponent = () => (
  <div className="danger-zone">
    <h3>⚠️ Danger Zone</h3>
    <button className="delete-button">Delete All Data</button>
  </div>
);

const TestDocumentList: FunctionalComponent = () => (
  <div className="document-item">
    <div className="document-info">Document content</div>
    <button className="document-delete-button">×</button>
  </div>
);

describe("Button CSS Positioning Tests", () => {
  let styleSheet: HTMLStyleElement;

  beforeEach(() => {
    // Load the CSS rules
    styleSheet = document.createElement("style");
    const css = `
      .danger-zone {
        margin-top: 32px;
        padding-top: 24px;
        border-top: 1px solid #dadce0;
      }
      
      .danger-zone h3 {
        font-size: 14px;
        color: #d93025;
        margin-bottom: 16px;
      }
      
      .delete-button {
        background: #d93025;
        color: white;
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      }
      
      .document-delete-button {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 32px;
        height: 32px;
        background: var(--error-bg, #f8d7da);
        color: var(--error-text, #721c24);
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .document-item {
        position: relative;
        background: #f8f9fa;
        border-radius: 8px;
        padding: 16px;
      }
    `;
    styleSheet.textContent = css;
    document.head.appendChild(styleSheet);
  });

  afterEach(() => {
    if (styleSheet && styleSheet.parentNode) {
      styleSheet.parentNode.removeChild(styleSheet);
    }
  });

  describe("Delete All Data Button", () => {
    it("should not have absolute positioning", () => {
      const { container } = render(<TestDangerZone />);
      const deleteButton = container.querySelector(
        ".delete-button",
      ) as HTMLElement;
      const styles = window.getComputedStyle(deleteButton);

      expect(styles.position).not.toBe("absolute");
      expect(styles.position).not.toBe("fixed");
    });

    it("should be contained within danger-zone", () => {
      const { container } = render(<TestDangerZone />);
      const dangerZone = container.querySelector(".danger-zone") as HTMLElement;
      const deleteButton = container.querySelector(
        ".delete-button",
      ) as HTMLElement;

      expect(dangerZone).toBeTruthy();
      expect(deleteButton).toBeTruthy();
      expect(dangerZone.contains(deleteButton)).toBe(true);
    });
  });

  describe("Document Delete Button", () => {
    it("should have absolute positioning", () => {
      const { container } = render(<TestDocumentList />);
      const deleteButton = container.querySelector(
        ".document-delete-button",
      ) as HTMLElement;
      const styles = window.getComputedStyle(deleteButton);

      expect(styles.position).toBe("absolute");
      expect(styles.top).toBe("0.5rem");
      expect(styles.right).toBe("0.5rem");
    });

    it("should be positioned relative to document-item", () => {
      const { container } = render(<TestDocumentList />);
      const documentItem = container.querySelector(
        ".document-item",
      ) as HTMLElement;
      const deleteButton = container.querySelector(
        ".document-delete-button",
      ) as HTMLElement;
      const itemStyles = window.getComputedStyle(documentItem);

      expect(itemStyles.position).toBe("relative");
      expect(documentItem.contains(deleteButton)).toBe(true);
    });
  });
});
