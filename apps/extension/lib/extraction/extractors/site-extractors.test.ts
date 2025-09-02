import { describe, it, expect, beforeEach } from "vitest";
import type { IContentExtractor, ExtractedContent } from "../types";
import { GitHubExtractor } from "./github-extractor";
import { StackOverflowExtractor } from "./stackoverflow-extractor";
import { RedditExtractor } from "./reddit-extractor";
import { TwitterExtractor } from "./twitter-extractor";
import { DocumentationExtractor } from "./documentation-extractor";

describe("Site-Specific Extractors", () => {
  describe("GitHubExtractor", () => {
    let extractor: GitHubExtractor;
    let mockDocument: Document;

    beforeEach(() => {
      extractor = new GitHubExtractor();
      mockDocument = document.implementation.createHTMLDocument("Test");
    });

    describe("canHandle", () => {
      it("should handle GitHub URLs", () => {
        expect(
          extractor.canHandle("https://github.com/user/repo", mockDocument),
        ).toBe(true);
        expect(
          extractor.canHandle(
            "https://github.com/user/repo/issues/123",
            mockDocument,
          ),
        ).toBe(true);
        expect(
          extractor.canHandle(
            "https://github.com/user/repo/pull/456",
            mockDocument,
          ),
        ).toBe(true);
        expect(
          extractor.canHandle(
            "https://github.com/user/repo/discussions/789",
            mockDocument,
          ),
        ).toBe(true);
      });

      it("should not handle non-GitHub URLs", () => {
        expect(extractor.canHandle("https://example.com", mockDocument)).toBe(
          false,
        );
        expect(
          extractor.canHandle("https://gitlab.com/user/repo", mockDocument),
        ).toBe(false);
      });
    });

    describe("extract", () => {
      it("should extract README content", () => {
        mockDocument.body.innerHTML = `
          <article class="markdown-body">
            <h1>Project Title</h1>
            <p>This is the project description with enough content to meet the minimum requirements. 
            It contains detailed information about the project's purpose, features, and usage.
            The README provides comprehensive documentation for developers and users alike.</p>
            <h2>Installation</h2>
            <pre><code>npm install project</code></pre>
            <h2>Usage</h2>
            <p>Here's how to use this project in your application. First, import the necessary modules.
            Then configure the settings according to your needs. Finally, run the application.</p>
          </article>
        `;

        const result = extractor.extract(mockDocument);
        expect(result).toBeTruthy();
        expect(result?.text).toContain("Project Title");
        expect(result?.text).toContain("Installation");
        expect(result?.text).toContain("npm install project");
      });

      it("should extract issue content", () => {
        mockDocument.body.innerHTML = `
          <div class="js-issue-title">Bug: Application crashes on startup</div>
          <div class="comment-body">
            <p>When I try to start the application, it immediately crashes with an error.
            This happens consistently every time I run the command. I've tried reinstalling
            dependencies but the issue persists. The error message indicates a missing module.</p>
            <h3>Steps to reproduce:</h3>
            <ol>
              <li>Clone the repository</li>
              <li>Run npm install</li>
              <li>Run npm start</li>
            </ol>
            <h3>Expected behavior:</h3>
            <p>The application should start without errors</p>
            <h3>Actual behavior:</h3>
            <p>Application crashes with module not found error</p>
          </div>
        `;

        const result = extractor.extract(mockDocument);
        expect(result).toBeTruthy();
        expect(result?.text).toContain("Bug: Application crashes on startup");
        expect(result?.text).toContain("Steps to reproduce");
      });

      it("should extract pull request content", () => {
        mockDocument.body.innerHTML = `
          <h1 class="gh-header-title">Add new feature for user authentication</h1>
          <div class="comment-body">
            <p>This PR adds a comprehensive user authentication system to the application.
            The implementation includes login, logout, and session management functionality.
            All changes have been thoroughly tested and documented.</p>
            <h2>Changes</h2>
            <ul>
              <li>Added authentication middleware</li>
              <li>Implemented JWT token generation</li>
              <li>Created login and logout endpoints</li>
              <li>Added user session management</li>
            </ul>
            <h2>Testing</h2>
            <p>All new features have been tested with unit tests and integration tests.
            The test coverage remains above 90% for all modified files.</p>
          </div>
        `;

        const result = extractor.extract(mockDocument);
        expect(result).toBeTruthy();
        expect(result?.text).toContain(
          "Add new feature for user authentication",
        );
        expect(result?.text).toContain("authentication middleware");
      });

      it("should return null for pages without content", () => {
        mockDocument.body.innerHTML = "<div>Short</div>";
        const result = extractor.extract(mockDocument);
        expect(result).toBeNull();
      });
    });

    it("should have correct priority", () => {
      expect(extractor.getPriority()).toBe(10);
    });
  });

  describe("StackOverflowExtractor", () => {
    let extractor: StackOverflowExtractor;
    let mockDocument: Document;

    beforeEach(() => {
      extractor = new StackOverflowExtractor();
      mockDocument = document.implementation.createHTMLDocument("Test");
    });

    describe("canHandle", () => {
      it("should handle Stack Overflow URLs", () => {
        expect(
          extractor.canHandle(
            "https://stackoverflow.com/questions/123456",
            mockDocument,
          ),
        ).toBe(true);
        expect(
          extractor.canHandle(
            "https://stackoverflow.com/q/123456",
            mockDocument,
          ),
        ).toBe(true);
        expect(
          extractor.canHandle(
            "https://stackoverflow.com/questions/123456/title",
            mockDocument,
          ),
        ).toBe(true);
      });

      it("should not handle non-Stack Overflow URLs", () => {
        expect(extractor.canHandle("https://example.com", mockDocument)).toBe(
          false,
        );
        expect(
          extractor.canHandle("https://reddit.com/questions", mockDocument),
        ).toBe(false);
      });
    });

    describe("extract", () => {
      it("should extract question and answers", () => {
        mockDocument.body.innerHTML = `
          <h1 class="question-hyperlink">How to implement async/await in JavaScript?</h1>
          <div class="s-prose js-post-body">
            <p>I'm trying to understand how to properly implement async/await in JavaScript.
            I have a function that makes multiple API calls and I want to wait for all of them
            to complete before proceeding. Currently, my code uses callbacks which makes it
            difficult to read and maintain. How can I refactor this using async/await?</p>
            <pre><code>
            function fetchData(callback) {
              api.get('/data1', (data1) => {
                api.get('/data2', (data2) => {
                  callback(data1, data2);
                });
              });
            }
            </code></pre>
          </div>
          <div class="answercell">
            <div class="s-prose js-post-body">
              <p>You can refactor your code using async/await like this. The async keyword
              makes a function return a Promise, and await pauses execution until the Promise resolves.
              This makes asynchronous code look and behave like synchronous code.</p>
              <pre><code>
              async function fetchData() {
                const data1 = await api.get('/data1');
                const data2 = await api.get('/data2');
                return { data1, data2 };
              }
              </code></pre>
              <p>For parallel requests, use Promise.all to improve performance:</p>
              <pre><code>
              async function fetchData() {
                const [data1, data2] = await Promise.all([
                  api.get('/data1'),
                  api.get('/data2')
                ]);
                return { data1, data2 };
              }
              </code></pre>
            </div>
          </div>
        `;

        const result = extractor.extract(mockDocument);
        expect(result).toBeTruthy();
        expect(result?.text).toContain("How to implement async/await");
        expect(result?.text).toContain("async function fetchData");
        expect(result?.text).toContain("Promise.all");
      });

      it("should extract code blocks properly", () => {
        mockDocument.body.innerHTML = `
          <h1 class="question-hyperlink">Python list comprehension</h1>
          <div class="s-prose js-post-body">
            <p>How can I filter a list in Python using list comprehension?
            I want to get only even numbers from a list of integers.
            Here's my current approach using a for loop:</p>
            <pre><code>
            numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            even_numbers = []
            for num in numbers:
                if num % 2 == 0:
                    even_numbers.append(num)
            </code></pre>
          </div>
          <div class="answercell">
            <div class="s-prose js-post-body">
              <p>You can use list comprehension to make this more concise and Pythonic:</p>
              <pre><code>
              numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
              even_numbers = [num for num in numbers if num % 2 == 0]
              </code></pre>
            </div>
          </div>
        `;

        const result = extractor.extract(mockDocument);
        expect(result).toBeTruthy();
        expect(result?.text).toContain("```");
        expect(result?.text).toContain(
          "even_numbers = [num for num in numbers if num % 2 == 0]",
        );
      });
    });

    it("should have correct priority", () => {
      expect(extractor.getPriority()).toBe(10);
    });
  });

  describe("RedditExtractor", () => {
    let extractor: RedditExtractor;
    let mockDocument: Document;

    beforeEach(() => {
      extractor = new RedditExtractor();
      mockDocument = document.implementation.createHTMLDocument("Test");
    });

    describe("canHandle", () => {
      it("should handle Reddit URLs", () => {
        expect(
          extractor.canHandle(
            "https://www.reddit.com/r/programming",
            mockDocument,
          ),
        ).toBe(true);
        expect(
          extractor.canHandle(
            "https://reddit.com/r/javascript/comments/123",
            mockDocument,
          ),
        ).toBe(true);
        expect(
          extractor.canHandle("https://old.reddit.com/r/webdev", mockDocument),
        ).toBe(true);
      });

      it("should not handle non-Reddit URLs", () => {
        expect(extractor.canHandle("https://example.com", mockDocument)).toBe(
          false,
        );
        expect(extractor.canHandle("https://twitter.com", mockDocument)).toBe(
          false,
        );
      });
    });

    describe("extract", () => {
      it("should extract post and comments", () => {
        mockDocument.body.innerHTML = `
          <h1>TIL: JavaScript has a built-in Intl API for internationalization</h1>
          <div data-test-id="post-content">
            <p>I just discovered that JavaScript has a powerful Intl API that handles
            internationalization tasks like number formatting, date formatting, and collation.
            This API provides locale-sensitive functionality without needing external libraries.
            It's been supported in browsers for years but many developers don't know about it.</p>
            <p>Here are some examples of what you can do with it:</p>
            <pre><code>
            // Format numbers for different locales
            new Intl.NumberFormat('de-DE').format(123456.789)
            // Format dates
            new Intl.DateTimeFormat('en-US').format(new Date())
            // Compare strings with locale-aware collation
            new Intl.Collator('sv').compare('ä', 'z')
            </code></pre>
          </div>
          <div class="Comment">
            <p>This is amazing! I've been using moment.js for years without knowing this existed.
            The Intl API covers most of my use cases and it's much lighter than external libraries.</p>
          </div>
          <div class="Comment">
            <p>Note that some older browsers might not support all Intl features.
            Make sure to check browser compatibility on MDN before using specific methods.
            But for modern browsers, this is definitely the way to go for i18n.</p>
          </div>
        `;

        const result = extractor.extract(mockDocument);
        expect(result).toBeTruthy();
        expect(result?.text).toContain("Intl API");
        expect(result?.text).toContain("NumberFormat");
        expect(result?.text).toContain("moment.js");
      });
    });

    it("should have correct priority", () => {
      expect(extractor.getPriority()).toBe(10);
    });
  });

  describe("TwitterExtractor", () => {
    let extractor: TwitterExtractor;
    let mockDocument: Document;

    beforeEach(() => {
      extractor = new TwitterExtractor();
      mockDocument = document.implementation.createHTMLDocument("Test");
    });

    describe("canHandle", () => {
      it("should handle Twitter/X URLs", () => {
        expect(
          extractor.canHandle(
            "https://twitter.com/user/status/123",
            mockDocument,
          ),
        ).toBe(true);
        expect(
          extractor.canHandle("https://x.com/user/status/123", mockDocument),
        ).toBe(true);
        expect(
          extractor.canHandle("https://mobile.twitter.com/user", mockDocument),
        ).toBe(true);
      });

      it("should not handle non-Twitter URLs", () => {
        expect(extractor.canHandle("https://example.com", mockDocument)).toBe(
          false,
        );
        expect(extractor.canHandle("https://facebook.com", mockDocument)).toBe(
          false,
        );
      });
    });

    describe("extract", () => {
      it("should extract tweet threads", () => {
        mockDocument.body.innerHTML = `
          <article data-testid="tweet">
            <div data-testid="tweetText">
              <span>Thread about web performance optimization 🧵</span>
              <span>1/ The most impactful performance improvements often come from the simplest changes.
              Start by measuring your Core Web Vitals to establish a baseline.</span>
            </div>
          </article>
          <article data-testid="tweet">
            <div data-testid="tweetText">
              <span>2/ Optimize your images: Use modern formats like WebP or AVIF, implement lazy loading,
              and serve responsive images with srcset. This alone can reduce page weight by 30-50%.</span>
            </div>
          </article>
          <article data-testid="tweet">
            <div data-testid="tweetText">
              <span>3/ Minimize JavaScript execution: Code-split your bundles, remove unused dependencies,
              and defer non-critical scripts. Every KB of JavaScript has a cost in parse and execution time.</span>
            </div>
          </article>
        `;

        const result = extractor.extract(mockDocument);
        expect(result).toBeTruthy();
        expect(result?.text).toContain("web performance optimization");
        expect(result?.text).toContain("Core Web Vitals");
        expect(result?.text).toContain("WebP or AVIF");
      });
    });

    it("should have correct priority", () => {
      expect(extractor.getPriority()).toBe(10);
    });
  });

  describe("DocumentationExtractor", () => {
    let extractor: DocumentationExtractor;
    let mockDocument: Document;

    beforeEach(() => {
      extractor = new DocumentationExtractor();
      mockDocument = document.implementation.createHTMLDocument("Test");
    });

    describe("canHandle", () => {
      it("should handle documentation sites", () => {
        const docUrls = [
          "https://docs.example.com",
          "https://example.com/docs",
          "https://developer.example.com",
          "https://api.example.com",
          "https://example.readthedocs.io",
        ];

        docUrls.forEach((url) => {
          mockDocument.body.innerHTML =
            '<main class="docs-content">Content</main>';
          expect(extractor.canHandle(url, mockDocument)).toBe(true);
        });
      });

      it("should detect documentation frameworks", () => {
        const frameworks = [
          '<div class="docs-content">',
          '<div class="documentation">',
          '<main role="main" class="td-main">',
          '<div class="rst-content">',
          '<article class="markdown-body">',
        ];

        frameworks.forEach((html) => {
          mockDocument.body.innerHTML = html + "Content</div>";
          expect(extractor.canHandle("https://example.com", mockDocument)).toBe(
            true,
          );
        });
      });

      it("should not handle non-documentation sites", () => {
        mockDocument.body.innerHTML =
          '<div class="regular-content">Content</div>';
        expect(extractor.canHandle("https://example.com", mockDocument)).toBe(
          false,
        );
      });
    });

    describe("extract", () => {
      it("should extract API documentation", () => {
        mockDocument.body.innerHTML = `
          <main class="docs-content">
            <h1>API Reference</h1>
            <section>
              <h2>Authentication</h2>
              <p>All API requests require authentication using an API key.
              Include your API key in the Authorization header of each request.
              You can generate API keys from your account dashboard.</p>
              <h3>Request Format</h3>
              <pre><code>
              curl -X GET https://api.example.com/v1/users \\
                -H "Authorization: Bearer YOUR_API_KEY" \\
                -H "Content-Type: application/json"
              </code></pre>
              <h3>Response Format</h3>
              <p>All responses are returned in JSON format with the following structure:</p>
              <pre><code>
              {
                "data": {},
                "meta": {
                  "status": "success",
                  "timestamp": "2024-01-01T00:00:00Z"
                }
              }
              </code></pre>
            </section>
          </main>
        `;

        const result = extractor.extract(mockDocument);
        expect(result).toBeTruthy();
        expect(result?.text).toContain("API Reference");
        expect(result?.text).toContain("Authentication");
        expect(result?.text).toContain("curl -X GET");
        expect(result?.text).toContain("```");
      });

      it("should extract framework documentation", () => {
        mockDocument.body.innerHTML = `
          <article class="markdown-body">
            <h1>Getting Started with React</h1>
            <p>React is a JavaScript library for building user interfaces.
            It lets you compose complex UIs from small and isolated pieces of code called components.
            This guide will walk you through the basics of React development.</p>
            <h2>Installation</h2>
            <p>You can add React to your project using npm or yarn:</p>
            <pre><code>npm install react react-dom</code></pre>
            <h2>Your First Component</h2>
            <p>React components are JavaScript functions that return markup:</p>
            <pre><code>
            function Welcome(props) {
              return &lt;h1&gt;Hello, {props.name}&lt;/h1&gt;;
            }
            </code></pre>
            <h2>State and Lifecycle</h2>
            <p>Components can maintain internal state and respond to lifecycle events.
            Use the useState hook to add state to functional components.</p>
          </article>
        `;

        const result = extractor.extract(mockDocument);
        expect(result).toBeTruthy();
        expect(result?.text).toContain("Getting Started with React");
        expect(result?.text).toContain("npm install react");
        expect(result?.text).toContain("useState hook");
      });
    });

    it("should have correct priority", () => {
      expect(extractor.getPriority()).toBe(5);
    });
  });
});

describe("Extractor Priority System", () => {
  it("should prioritize site-specific extractors over generic ones", () => {
    const github = new GitHubExtractor();
    const docs = new DocumentationExtractor();

    expect(github.getPriority()).toBeGreaterThan(docs.getPriority());
  });

  it("should have consistent priorities for platform extractors", () => {
    const extractors = [
      new GitHubExtractor(),
      new StackOverflowExtractor(),
      new RedditExtractor(),
      new TwitterExtractor(),
    ];

    extractors.forEach((extractor) => {
      expect(extractor.getPriority()).toBe(10);
    });
  });
});
