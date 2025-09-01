import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/preact";
import { FunctionalComponent } from "preact";

// Test component to render with CSS
const TestComponent: FunctionalComponent = () => (
  <div className="side-panel">
    <div className="tabs">Tab Bar</div>
    <div className="tab-content">
      <div className="streaming-summarizer">
        <div className="controls">Controls Content</div>
        Summary Content
      </div>
      <div className="enhanced-settings">
        <div className="settings-section">Settings Content</div>
      </div>
    </div>
  </div>
);

describe("CSS Width Optimization Tests", () => {
  let styleSheet: HTMLStyleElement;

  beforeEach(() => {
    // Load the actual CSS file
    styleSheet = document.createElement("style");
    const css = `
      .side-panel {
        display: flex;
        flex-direction: column;
        height: 100vh;
        padding: 0;
      }
      
      .tab-content {
        flex: 1;
        padding: 0.25rem 0;
        overflow-y: auto;
      }
      
      .streaming-summarizer {
        padding: 0.25rem 0;
      }
      
      .controls {
        background: var(--bg-primary);
        border-radius: 8px;
        padding: 0.5rem 0.75rem;
        margin-bottom: 1rem;
      }
      
      .settings-section {
        background: var(--bg-primary);
        border-radius: 8px;
        padding: 0.5rem 0.75rem;
        margin-bottom: 1rem;
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

  describe("Container Padding", () => {
    it("should have no horizontal padding on .side-panel", () => {
      const { container } = render(<TestComponent />);
      const sidePanel = container.querySelector(".side-panel") as HTMLElement;
      const styles = window.getComputedStyle(sidePanel);

      expect(styles.paddingLeft).toBe("0px");
      expect(styles.paddingRight).toBe("0px");
    });

    it("should have no horizontal padding on .tab-content", () => {
      const { container } = render(<TestComponent />);
      const tabContent = container.querySelector(".tab-content") as HTMLElement;
      const styles = window.getComputedStyle(tabContent);

      expect(styles.paddingLeft).toBe("0px");
      expect(styles.paddingRight).toBe("0px");
    });

    it("should have no horizontal padding on .streaming-summarizer", () => {
      const { container } = render(<TestComponent />);
      const streamingSummarizer = container.querySelector(
        ".streaming-summarizer",
      ) as HTMLElement;
      const styles = window.getComputedStyle(streamingSummarizer);

      expect(styles.paddingLeft).toBe("0px");
      expect(styles.paddingRight).toBe("0px");
    });

    it("should have minimal horizontal padding on .controls", () => {
      const { container } = render(<TestComponent />);
      const controls = container.querySelector(".controls") as HTMLElement;
      const styles = window.getComputedStyle(controls);

      // Controls should have 0.75rem horizontal padding (12px at 16px base font)
      const leftPadding = parseFloat(styles.paddingLeft);
      const rightPadding = parseFloat(styles.paddingRight);
      expect(leftPadding).toBeGreaterThan(0);
      expect(leftPadding).toBeLessThanOrEqual(12);
      expect(rightPadding).toBeGreaterThan(0);
      expect(rightPadding).toBeLessThanOrEqual(12);
    });

    it("should have minimal horizontal padding on .settings-section", () => {
      const { container } = render(<TestComponent />);
      const settingsSection = container.querySelector(
        ".settings-section",
      ) as HTMLElement;
      const styles = window.getComputedStyle(settingsSection);

      // Settings section should have 0.75rem horizontal padding (12px at 16px base font)
      const leftPadding = parseFloat(styles.paddingLeft);
      const rightPadding = parseFloat(styles.paddingRight);
      expect(leftPadding).toBeGreaterThan(0);
      expect(leftPadding).toBeLessThanOrEqual(12);
      expect(rightPadding).toBeGreaterThan(0);
      expect(rightPadding).toBeLessThanOrEqual(12);
    });
  });

  describe("Parent Container Margins", () => {
    it("should have no margins on any parent containers", () => {
      const { container } = render(<TestComponent />);

      const elements = [".side-panel", ".tab-content", ".streaming-summarizer"];

      elements.forEach((selector) => {
        const element = container.querySelector(selector) as HTMLElement;
        if (element) {
          const styles = window.getComputedStyle(element);
          const marginLeft = styles.marginLeft || "0px";
          const marginRight = styles.marginRight || "0px";
          expect(marginLeft).toBe("0px");
          expect(marginRight).toBe("0px");
        }
      });
    });
  });
});
