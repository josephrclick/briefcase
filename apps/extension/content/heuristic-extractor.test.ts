import { describe, it, expect, beforeEach } from "vitest";
import { HeuristicExtractor } from "./heuristic-extractor";

describe("HeuristicExtractor", () => {
  let extractor: HeuristicExtractor;
  let mockDocument: Document;

  beforeEach(() => {
    mockDocument = document.implementation.createHTMLDocument("Test");
    extractor = new HeuristicExtractor();
  });

  describe("Content container detection", () => {
    it("should detect article element as content container", () => {
      mockDocument.body.innerHTML = `
        <nav>Navigation</nav>
        <article>
          <p>${"x".repeat(900)}</p>
        </article>
        <footer>Footer</footer>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.method).toBe("heuristic");
      expect(result.content?.text).toContain("x".repeat(900));
      expect(result.content?.text).not.toContain("Navigation");
      expect(result.content?.text).not.toContain("Footer");
    });

    it("should detect main element as content container", () => {
      mockDocument.body.innerHTML = `
        <header>Header</header>
        <main>
          <p>${"Main content ".repeat(100)}</p>
        </main>
        <aside>Sidebar</aside>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).toContain("Main content");
      expect(result.content?.text).not.toContain("Header");
      expect(result.content?.text).not.toContain("Sidebar");
    });

    it('should detect role="main" as content container', () => {
      mockDocument.body.innerHTML = `
        <div class="header">Header</div>
        <div role="main">
          <p>${"Content with role ".repeat(60)}</p>
        </div>
        <div class="footer">Footer</div>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).toContain("Content with role");
      expect(result.content?.text).not.toContain("Header");
      expect(result.content?.text).not.toContain("Footer");
    });

    it("should detect content-specific class names", () => {
      mockDocument.body.innerHTML = `
        <div class="nav">Nav</div>
        <div class="post-content">
          <p>${"Blog post content ".repeat(60)}</p>
        </div>
        <div class="comments">Comments</div>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).toContain("Blog post content");
    });
  });

  describe("Text density calculation", () => {
    it("should calculate text density correctly", () => {
      const element = mockDocument.createElement("div");
      element.innerHTML = `
        <p>Text content</p>
        <a href="#">Link</a>
        <span>More text</span>
      `;

      const density = extractor.calculateTextDensity(element);

      expect(density).toBeGreaterThan(0);
      expect(density).toBeLessThanOrEqual(1);
    });

    it("should identify high text density blocks", () => {
      mockDocument.body.innerHTML = `
        <div class="low-density">
          <a href="#">Link 1</a>
          <a href="#">Link 2</a>
          <a href="#">Link 3</a>
        </div>
        <div class="high-density">
          <p>${"This is a paragraph with lots of text content. ".repeat(20)}</p>
        </div>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).toContain("This is a paragraph");
      expect(result.content?.text).not.toContain("Link 1");
    });

    it("should prefer blocks with higher text-to-link ratio", () => {
      mockDocument.body.innerHTML = `
        <div class="navigation">
          ${'<a href="#">Nav Link</a>'.repeat(20)}
        </div>
        <div class="content">
          <p>${"Article text ".repeat(70)}</p>
          <a href="#">One link</a>
        </div>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).toContain("Article text");
      expect(result.content?.text.match(/Nav Link/g) || []).toHaveLength(0);
    });
  });

  describe("Largest text block extraction", () => {
    it("should extract the largest contiguous text block", () => {
      mockDocument.body.innerHTML = `
        <div>
          <p>Small paragraph</p>
        </div>
        <div>
          <p>${"Large paragraph with lots of content. ".repeat(30)}</p>
        </div>
        <div>
          <p>Another small paragraph</p>
        </div>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).toContain(
        "Large paragraph with lots of content",
      );
    });

    it("should combine adjacent paragraphs in the same container", () => {
      mockDocument.body.innerHTML = `
        <article>
          <p>First paragraph. ${"x".repeat(300)}</p>
          <p>Second paragraph. ${"y".repeat(300)}</p>
          <p>Third paragraph. ${"z".repeat(300)}</p>
        </article>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).toContain("First paragraph");
      expect(result.content?.text).toContain("Second paragraph");
      expect(result.content?.text).toContain("Third paragraph");
    });

    it("should enforce minimum content length of 800 characters", () => {
      mockDocument.body.innerHTML = `
        <article>
          <p>${"This is content that is found but still too short. ".repeat(10)}</p>
        </article>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(false);
      expect(result.error).toContain("minimum 800 characters");
    });
  });

  describe("Navigation and footer stripping", () => {
    it("should strip navigation elements", () => {
      mockDocument.body.innerHTML = `
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
        </nav>
        <div class="content">
          <p>${"Main content ".repeat(70)}</p>
        </div>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).not.toContain("Home");
      expect(result.content?.text).not.toContain("About");
    });

    it("should strip footer elements", () => {
      mockDocument.body.innerHTML = `
        <main>
          <p>${"Article content ".repeat(60)}</p>
        </main>
        <footer>
          <p>Copyright 2024</p>
          <p>Contact us</p>
        </footer>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).not.toContain("Copyright");
      expect(result.content?.text).not.toContain("Contact us");
    });

    it("should strip sidebar elements", () => {
      mockDocument.body.innerHTML = `
        <div class="main-content">
          <p>${"Article text ".repeat(70)}</p>
        </div>
        <aside>
          <h3>Related Articles</h3>
          <ul>
            <li>Article 1</li>
            <li>Article 2</li>
          </ul>
        </aside>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).not.toContain("Related Articles");
      expect(result.content?.text).not.toContain("Article 1");
    });

    it("should strip elements with navigation-related classes", () => {
      mockDocument.body.innerHTML = `
        <div class="navbar">Navigation items</div>
        <div class="breadcrumb">Home > Page</div>
        <div class="content">
          <p>${"Real content ".repeat(70)}</p>
        </div>
        <div class="pagination">Page 1 2 3</div>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).not.toContain("Navigation items");
      expect(result.content?.text).not.toContain("Home > Page");
      expect(result.content?.text).not.toContain("Page 1 2 3");
    });
  });

  describe("Edge cases", () => {
    it("should handle pages with no suitable content", () => {
      mockDocument.body.innerHTML = `
        <nav>Nav</nav>
        <footer>Footer</footer>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(false);
      expect(result.method).toBe("heuristic");
      expect(result.error).toBeDefined();
    });

    it("should handle deeply nested content", () => {
      mockDocument.body.innerHTML = `
        <div>
          <div>
            <div>
              <article>
                <div>
                  <p>${"Deeply nested content ".repeat(40)}</p>
                </div>
              </article>
            </div>
          </div>
        </div>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).toContain("Deeply nested content");
    });

    it("should extract content from divs when no semantic elements exist", () => {
      mockDocument.body.innerHTML = `
        <div class="wrapper">
          <div class="container">
            <div>
              <p>${"Content in divs ".repeat(60)}</p>
            </div>
          </div>
        </div>
      `;

      const result = extractor.extract(mockDocument);

      expect(result.success).toBe(true);
      expect(result.content?.text).toContain("Content in divs");
    });
  });
});
