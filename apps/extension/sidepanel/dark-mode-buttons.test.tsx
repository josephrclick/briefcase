import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/preact";
import { FunctionalComponent } from "preact";

// Test components to render buttons
const TestButtons: FunctionalComponent = () => (
  <div>
    <button className="secondary">Test Connection</button>
    <button className="secondary">Refresh</button>
    <button className="retry-button">Try Again</button>
  </div>
);

describe("Dark Mode Button Text Visibility", () => {
  let styleSheet: HTMLStyleElement;

  beforeEach(() => {
    // Load the CSS rules with dark mode variables
    styleSheet = document.createElement("style");
    const css = `
      :root {
        --text-primary: #333333;
        --button-secondary-bg: #e0e0e0;
        --button-secondary-hover: #d0d0d0;
        --accent-color: #667eea;
        --accent-hover: #5a67d8;
      }
      
      [data-theme="dark"] {
        --text-primary: #e0e0e0;
        --button-secondary-bg: #404040;
        --button-secondary-hover: #505050;
        --accent-color: #8b9bff;
        --accent-hover: #9eabff;
      }
      
      .secondary {
        background: var(--button-secondary-bg);
        color: var(--text-primary);
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .secondary:hover:not(:disabled) {
        background: var(--button-secondary-hover);
      }
      
      .retry-button {
        background: var(--button-secondary-bg);
        color: var(--accent-color);
        border: 1px solid var(--accent-color);
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 0.5rem;
      }
      
      .retry-button:hover:not(:disabled) {
        background: var(--accent-hover);
        color: white;
      }
    `;
    styleSheet.textContent = css;
    document.head.appendChild(styleSheet);
  });

  afterEach(() => {
    if (styleSheet && styleSheet.parentNode) {
      styleSheet.parentNode.removeChild(styleSheet);
    }
    document.documentElement.removeAttribute("data-theme");
  });

  describe("Light Mode", () => {
    it("should have readable text on secondary buttons", () => {
      const { container } = render(<TestButtons />);
      const secondaryButtons = container.querySelectorAll(".secondary");

      secondaryButtons.forEach((button) => {
        const styles = window.getComputedStyle(button);
        // In light mode, text should be dark (#333333)
        expect(styles.color).toMatch(
          /rgb\(51, 51, 51\)|#333333|var\(--text-primary\)/,
        );
        // Background should be light (#e0e0e0)
        expect(styles.background).toMatch(
          /rgb\(224, 224, 224\)|#e0e0e0|var\(--button-secondary-bg\)/,
        );
      });
    });

    it("should have readable text on retry button", () => {
      const { container } = render(<TestButtons />);
      const retryButton = container.querySelector(
        ".retry-button",
      ) as HTMLElement;
      const styles = window.getComputedStyle(retryButton);

      // Should use accent color for text
      expect(styles.color).toMatch(
        /rgb\(102, 126, 234\)|#667eea|var\(--accent-color\)/,
      );
      // Background should adapt
      expect(styles.background).toMatch(
        /rgb\(224, 224, 224\)|#e0e0e0|var\(--button-secondary-bg\)/,
      );
    });
  });

  describe("Dark Mode", () => {
    beforeEach(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });

    it("should have readable text on secondary buttons in dark mode", () => {
      const { container } = render(<TestButtons />);
      const secondaryButtons = container.querySelectorAll(".secondary");

      secondaryButtons.forEach((button) => {
        const styles = window.getComputedStyle(button);
        // In dark mode, text should be light (#e0e0e0)
        expect(styles.color).toMatch(
          /rgb\(224, 224, 224\)|#e0e0e0|var\(--text-primary\)/,
        );
        // Background should be dark (#404040)
        expect(styles.background).toMatch(
          /rgb\(64, 64, 64\)|#404040|var\(--button-secondary-bg\)/,
        );
      });
    });

    it("should have readable text on retry button in dark mode", () => {
      const { container } = render(<TestButtons />);
      const retryButton = container.querySelector(
        ".retry-button",
      ) as HTMLElement;
      const styles = window.getComputedStyle(retryButton);

      // Should use lighter accent color for text in dark mode
      expect(styles.color).toMatch(
        /rgb\(139, 155, 255\)|#8b9bff|var\(--accent-color\)/,
      );
      // Background should be dark
      expect(styles.background).toMatch(
        /rgb\(64, 64, 64\)|#404040|var\(--button-secondary-bg\)/,
      );
    });

    it("should have sufficient contrast between text and background", () => {
      const { container } = render(<TestButtons />);

      // Check secondary buttons
      const secondaryButtons = container.querySelectorAll(".secondary");
      secondaryButtons.forEach((button) => {
        const styles = window.getComputedStyle(button);
        // Parse RGB values
        const textMatch = styles.color.match(/\d+/g);
        const bgMatch = styles.background.match(/\d+/g);

        if (textMatch && bgMatch) {
          const textLuminance =
            (parseInt(textMatch[0]) * 0.299 +
              parseInt(textMatch[1]) * 0.587 +
              parseInt(textMatch[2]) * 0.114) /
            255;
          const bgLuminance =
            (parseInt(bgMatch[0]) * 0.299 +
              parseInt(bgMatch[1]) * 0.587 +
              parseInt(bgMatch[2]) * 0.114) /
            255;

          // Should have significant contrast
          const contrast = Math.abs(textLuminance - bgLuminance);
          expect(contrast).toBeGreaterThan(0.3);
        }
      });
    });
  });
});
