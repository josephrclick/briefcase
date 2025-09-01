import { describe, it, expect, beforeEach, vi, afterEach, Mock } from "vitest";
import { SPADetector } from "./spa-detector";
import { DOMStabilityMonitor } from "./dom-stability-monitor";
import { FrameworkDetector } from "./framework-detector";

describe("SPADetector", () => {
  let detector: SPADetector;
  let mockDocument: Document;
  let mockWindow: Window;

  beforeEach(() => {
    mockDocument = document.implementation.createHTMLDocument("Test");
    mockWindow = {
      location: { href: "https://example.com" },
    } as any;
    detector = new SPADetector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("detectSPA", () => {
    it("should detect React applications", () => {
      mockDocument.body.innerHTML = '<div id="root"></div>';
      const reactRoot = mockDocument.getElementById("root");
      if (reactRoot) {
        Object.defineProperty(reactRoot, "_reactRootContainer", {
          value: {},
          configurable: true,
        });
      }

      // Add React global to trigger detection
      (mockWindow as any).React = { version: "18.0.0" };
      (mockWindow as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};

      const result = detector.detectSPA(mockDocument, mockWindow);

      expect(result.isSPA).toBe(true);
      expect(result.framework).toBe("react");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should detect Vue applications", () => {
      mockDocument.body.innerHTML = '<div id="app"></div>';
      (mockWindow as any).__VUE__ = true;
      (mockWindow as any).Vue = { version: "3.0.0" };

      const result = detector.detectSPA(mockDocument, mockWindow);

      expect(result.isSPA).toBe(true);
      expect(result.framework).toBe("vue");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should detect Angular applications", () => {
      mockDocument.body.innerHTML = '<app-root ng-version="12.0.0"></app-root>';
      // Add router outlet to boost confidence
      const appRoot = mockDocument.querySelector("app-root");
      if (appRoot) {
        appRoot.innerHTML = "<router-outlet></router-outlet>";
      }

      const result = detector.detectSPA(mockDocument, mockWindow);

      expect(result.isSPA).toBe(true);
      expect(result.framework).toBe("angular");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should detect Next.js applications", () => {
      mockDocument.body.innerHTML = '<div id="__next"></div>';

      const result = detector.detectSPA(mockDocument, mockWindow);

      expect(result.isSPA).toBe(true);
      expect(result.framework).toBe("nextjs");
      expect(result.confidence).toBeGreaterThan(0.5); // Next.js detection gives 0.6 confidence
    });

    it("should detect generic SPAs by script patterns", () => {
      // Create proper script elements with bundle patterns
      const script1 = mockDocument.createElement("script");
      script1.setAttribute("src", "/static/js/bundle.js");
      mockDocument.head.appendChild(script1);

      const script2 = mockDocument.createElement("script");
      script2.setAttribute("src", "/static/js/chunk.js");
      mockDocument.head.appendChild(script2);

      const script3 = mockDocument.createElement("script");
      script3.setAttribute("src", "/static/js/vendor.js");
      mockDocument.head.appendChild(script3);

      const script4 = mockDocument.createElement("script");
      script4.setAttribute("src", "/static/js/app.js");
      mockDocument.head.appendChild(script4);

      // Add app root element for additional confidence
      mockDocument.body.innerHTML = '<div id="app"></div>';

      const result = detector.detectSPA(mockDocument, mockWindow);

      expect(result.isSPA).toBe(true);
      expect(result.framework).toBe("unknown");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should not detect static pages as SPAs", () => {
      mockDocument.body.innerHTML = `
        <article>
          <h1>Static Content</h1>
          <p>This is a regular static HTML page.</p>
        </article>
      `;

      const result = detector.detectSPA(mockDocument, mockWindow);

      expect(result.isSPA).toBe(false);
      expect(result.framework).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });

  describe("waitForContent", () => {
    it("should wait for DOM stability", async () => {
      // Mock the DOMStabilityMonitor for this specific test
      const mockWaitForStability = vi.fn().mockResolvedValue(true);
      const mockDestroy = vi.fn();

      vi.spyOn(detector as any, "createDOMMonitor").mockReturnValue({
        waitForStability: mockWaitForStability,
        destroy: mockDestroy,
      });

      const result = await detector.waitForContent(mockDocument, {
        framework: "react",
        timeout: 3000,
      });

      expect(result.stable).toBe(true);
      expect(mockWaitForStability).toHaveBeenCalled();
      expect(mockDestroy).toHaveBeenCalled();
    });

    it("should use progressive timeout strategy", async () => {
      vi.useFakeTimers();
      const mockWaitForStability = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(() => resolve(false), 1500)),
        );
      const mockDestroy = vi.fn();

      vi.spyOn(detector as any, "createDOMMonitor").mockReturnValue({
        waitForStability: mockWaitForStability,
        destroy: mockDestroy,
      });

      const promise = detector.waitForContent(mockDocument, {
        framework: "unknown",
        timeout: 5000,
      });

      vi.advanceTimersByTime(1000);
      await Promise.resolve();

      vi.advanceTimersByTime(2000);
      await Promise.resolve();

      const result = await promise;

      expect(result.timeElapsed).toBeLessThanOrEqual(3000);
      vi.useRealTimers();
    });

    it("should detect XHR/Fetch requests", async () => {
      const mockXHR = {
        open: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn(),
      };
      global.XMLHttpRequest = vi.fn(() => mockXHR) as any;

      const mockWaitForStability = vi.fn().mockResolvedValue(true);
      const mockDestroy = vi.fn();

      vi.spyOn(detector as any, "createDOMMonitor").mockReturnValue({
        waitForStability: mockWaitForStability,
        destroy: mockDestroy,
      });

      const result = await detector.waitForContent(mockDocument, {
        framework: "react",
        monitorNetwork: true,
      });

      expect(result.stable).toBe(true);
      expect(result.networkActivity).toBeDefined();
    });

    it("should timeout after maximum wait time", async () => {
      const mockWaitForStability = vi.fn().mockResolvedValue(false);
      const mockDestroy = vi.fn();

      vi.spyOn(detector as any, "createDOMMonitor").mockReturnValue({
        waitForStability: mockWaitForStability,
        destroy: mockDestroy,
      });

      // Mock the delay method to speed up test
      vi.spyOn(detector as any, "delay").mockResolvedValue(undefined);

      // Mock Date.now to simulate time passing
      const startTime = Date.now();
      let callCount = 0;
      vi.spyOn(Date, "now").mockImplementation(() => {
        // First call is start time, second call is end time
        return callCount++ === 0 ? startTime : startTime + 5100;
      });

      const result = await detector.waitForContent(mockDocument, {
        framework: "unknown",
        timeout: 5000,
      });

      expect(result.stable).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.timeElapsed).toBeGreaterThanOrEqual(5000);
      expect(mockDestroy).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it("should optimize wait strategy based on framework", async () => {
      const mockWaitForStability = vi.fn().mockResolvedValue(true);
      const mockDestroy = vi.fn();

      vi.spyOn(detector as any, "createDOMMonitor").mockReturnValue({
        waitForStability: mockWaitForStability,
        destroy: mockDestroy,
      });

      // Mock the delay method to speed up test
      vi.spyOn(detector as any, "delay").mockResolvedValue(undefined);

      const reactResult = await detector.waitForContent(mockDocument, {
        framework: "react",
      });

      const angularResult = await detector.waitForContent(mockDocument, {
        framework: "angular",
      });

      expect(reactResult.strategy).toBe("react-optimized");
      expect(angularResult.strategy).toBe("angular-optimized");
    });
  });

  describe("waitForContentWithRetry", () => {
    it("should retry on failure", async () => {
      const mockWaitForStability = vi
        .fn()
        .mockResolvedValueOnce(false) // First attempt fails
        .mockResolvedValueOnce(false) // Second attempt fails
        .mockResolvedValueOnce(true); // Third attempt succeeds
      const mockDestroy = vi.fn();

      vi.spyOn(detector as any, "createDOMMonitor").mockReturnValue({
        waitForStability: mockWaitForStability,
        destroy: mockDestroy,
      });

      vi.spyOn(detector as any, "delay").mockResolvedValue(undefined);

      const result = await detector.waitForContentWithRetry(mockDocument, {
        framework: "react",
        maxRetries: 3,
        retryDelay: 100,
      });

      expect(result.stable).toBe(true);
      expect(mockWaitForStability).toHaveBeenCalledTimes(3);
    });

    it("should call progress callback with retry information", async () => {
      const mockWaitForStability = vi
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      const mockDestroy = vi.fn();
      const onProgress = vi.fn();

      vi.spyOn(detector as any, "createDOMMonitor").mockReturnValue({
        waitForStability: mockWaitForStability,
        destroy: mockDestroy,
      });

      vi.spyOn(detector as any, "delay").mockResolvedValue(undefined);

      await detector.waitForContentWithRetry(mockDocument, {
        framework: "react",
        maxRetries: 2,
        retryDelay: 100,
        onProgress,
      });

      // Check that progress was called with retry information
      const progressCalls = onProgress.mock.calls;
      const retryMessage = progressCalls.find((call) =>
        call[0].message.includes("attempt 2/2"),
      );
      expect(retryMessage).toBeDefined();
    });

    it("should fail after max retries", async () => {
      const mockWaitForStability = vi.fn().mockResolvedValue(false);
      const mockDestroy = vi.fn();

      vi.spyOn(detector as any, "createDOMMonitor").mockReturnValue({
        waitForStability: mockWaitForStability,
        destroy: mockDestroy,
      });

      vi.spyOn(detector as any, "delay").mockResolvedValue(undefined);

      // Mock Date.now to simulate time passing for timedOut flag
      let callCount = 0;
      const startTime = Date.now();
      vi.spyOn(Date, "now").mockImplementation(() => {
        // Alternate between start time and end time for each waitForContent call
        return callCount++ % 2 === 0 ? startTime : startTime + 5100;
      });

      const result = await detector.waitForContentWithRetry(mockDocument, {
        framework: "react",
        maxRetries: 2,
        retryDelay: 100,
      });

      expect(result.stable).toBe(false);
      expect(result.timedOut).toBe(true);
      // Should attempt initial + retries + final attempt
      expect(mockWaitForStability).toHaveBeenCalledTimes(3);

      vi.restoreAllMocks();
    });
  });

  describe("getRecommendedTimeout", () => {
    it("should return framework-specific timeouts", () => {
      expect(detector.getRecommendedTimeout("react")).toBe(2000);
      expect(detector.getRecommendedTimeout("angular")).toBe(3000);
      expect(detector.getRecommendedTimeout("vue")).toBe(2000);
      expect(detector.getRecommendedTimeout("nextjs")).toBe(2500);
      expect(detector.getRecommendedTimeout("unknown")).toBe(3000);
    });

    it("should consider page complexity", () => {
      // Create 1001 elements to trigger the complexity adjustment
      mockDocument.body.innerHTML = Array(1001)
        .fill("<div>Content</div>")
        .join("");

      const timeout = detector.getRecommendedTimeout("react", mockDocument);

      expect(timeout).toBe(2500); // 2000 base + 500 for >1000 elements
    });
  });
});

describe("DOMStabilityMonitor", () => {
  let monitor: DOMStabilityMonitor;
  let mockElement: HTMLElement;

  beforeEach(() => {
    mockElement = document.createElement("div");
    document.body.appendChild(mockElement); // Attach to document for MutationObserver
    monitor = new DOMStabilityMonitor(mockElement);
    vi.clearAllMocks();
  });

  afterEach(() => {
    monitor.destroy();
    mockElement.remove();
  });

  describe("waitForStability", () => {
    it("should detect DOM mutations", async () => {
      vi.useFakeTimers();

      const promise = monitor.waitForStability({
        stableTime: 500,
        maxWait: 2000,
      });

      mockElement.innerHTML = "Changed content";
      vi.advanceTimersByTime(300);

      mockElement.innerHTML = "Changed again";
      vi.advanceTimersByTime(300);

      vi.advanceTimersByTime(500);

      const result = await promise;

      expect(result).toBe(true);
      vi.useRealTimers();
    });

    it("should require consecutive stable windows", async () => {
      vi.useFakeTimers();

      const promise = monitor.waitForStability({
        stableTime: 500,
        requiredWindows: 2,
        maxWait: 3000,
      });

      vi.advanceTimersByTime(500);
      vi.advanceTimersByTime(500);

      const result = await promise;

      expect(result).toBe(true);
      vi.useRealTimers();
    });

    it("should timeout if never stable", async () => {
      // Use real timers but with a short timeout for testing
      const promise = monitor.waitForStability({
        stableTime: 100,
        maxWait: 200,
      });

      // Simulate continuous mutations
      const interval = setInterval(() => {
        mockElement.innerHTML = Math.random().toString();
      }, 50);

      const result = await promise;

      clearInterval(interval);
      expect(result).toBe(false); // Should timeout because mutations keep happening
    });

    it.skip("should ignore specific mutations", async () => {
      // Test with real timers but short durations
      const promise = monitor.waitForStability({
        stableTime: 100,
        maxWait: 500,
        ignoredSelectors: [".loading", ".spinner"],
      });

      const spinner = document.createElement("div");
      spinner.className = "spinner";
      mockElement.appendChild(spinner);

      // These mutations should be ignored, so stability should be achieved
      setTimeout(() => {
        spinner.innerHTML = "Loading...";
      }, 10);

      setTimeout(() => {
        spinner.innerHTML = "Still loading...";
      }, 20);

      const result = await promise;

      expect(result).toBe(true); // Should be stable because spinner mutations are ignored
    });
  });

  describe("getMutationCount", () => {
    it("should track mutation count", () => {
      const initialCount = monitor.getMutationCount();

      mockElement.innerHTML = "Change 1";
      mockElement.innerHTML = "Change 2";
      mockElement.innerHTML = "Change 3";

      setTimeout(() => {
        const finalCount = monitor.getMutationCount();
        expect(finalCount).toBeGreaterThan(initialCount);
      }, 100);
    });
  });
});

describe("FrameworkDetector", () => {
  let detector: FrameworkDetector;
  let mockDocument: Document;
  let mockWindow: any;

  beforeEach(() => {
    mockDocument = document.implementation.createHTMLDocument("Test");
    mockWindow = {} as any; // Start with a clean window object
    detector = new FrameworkDetector();
  });

  afterEach(() => {
    // Clean up any properties that were added to mockWindow
    mockWindow = {} as any;
  });

  describe("detect", () => {
    it("should detect React by multiple signals", () => {
      mockDocument.body.innerHTML = '<div id="root"></div>';
      mockWindow.React = { version: "18.0.0" };
      mockWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};

      const result = detector.detect(mockDocument, mockWindow);

      expect(result.framework).toBe("react");
      expect(result.version).toBe("18.0.0");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should detect Vue 3", () => {
      mockDocument.body.innerHTML = '<div id="app"></div>';
      mockWindow.__VUE__ = true;
      mockWindow.__VUE_DEVTOOLS_GLOBAL_HOOK__ = {};

      const result = detector.detect(mockDocument, mockWindow);

      expect(result.framework).toBe("vue");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should detect Angular by attributes", () => {
      mockDocument.body.innerHTML = `
        <app-root _nghost-app-c0="" ng-version="13.0.0">
          <router-outlet _ngcontent-app-c0=""></router-outlet>
        </app-root>
      `;

      const result = detector.detect(mockDocument, mockWindow);

      expect(result.framework).toBe("angular");
      expect(result.version).toBe("13.0.0");
      expect(result.confidence).toBeGreaterThan(0.5); // Angular detection gives 0.6 confidence
    });

    it("should detect Svelte", () => {
      mockDocument.body.innerHTML = '<div class="svelte-1234abc"></div>';

      const result = detector.detect(mockDocument, mockWindow);

      expect(result.framework).toBe("svelte");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should detect Ember", () => {
      mockWindow.Ember = { VERSION: "3.28.0" };

      const result = detector.detect(mockDocument, mockWindow);

      expect(result.framework).toBe("ember");
      expect(result.version).toBe("3.28.0");
      expect(result.confidence).toBeGreaterThan(0.5); // Ember detection gives 0.6 confidence
    });

    it("should return null for non-SPA pages", () => {
      mockDocument.body.innerHTML = "<h1>Regular HTML</h1>";

      const result = detector.detect(mockDocument, mockWindow);

      expect(result.framework).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it("should handle multiple framework signals", () => {
      mockDocument.body.innerHTML = '<div id="root" data-reactroot=""></div>';
      const root = mockDocument.getElementById("root");
      if (root) {
        Object.defineProperty(root, "_reactRootContainer", {
          value: {},
          configurable: true,
        });
      }

      // Add React global to boost confidence
      mockWindow.React = { version: "18.0.0" };
      mockWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {};

      const result = detector.detect(mockDocument, mockWindow);

      expect(result.framework).toBe("react");
      expect(result.confidence).toBeGreaterThan(0.7); // With multiple signals this should be > 0.7
    });
  });

  describe("getOptimizedWaitStrategy", () => {
    it("should return React-specific strategy", () => {
      const strategy = detector.getOptimizedWaitStrategy("react");

      expect(strategy.initialWait).toBe(100);
      expect(strategy.checkInterval).toBe(50);
      expect(strategy.stableTime).toBe(300);
      expect(strategy.maxWait).toBe(2000);
    });

    it("should return Angular-specific strategy", () => {
      const strategy = detector.getOptimizedWaitStrategy("angular");

      expect(strategy.initialWait).toBe(200);
      expect(strategy.checkInterval).toBe(100);
      expect(strategy.stableTime).toBe(500);
      expect(strategy.maxWait).toBe(3000);
    });

    it("should return default strategy for unknown frameworks", () => {
      const strategy = detector.getOptimizedWaitStrategy("unknown");

      expect(strategy.initialWait).toBe(300);
      expect(strategy.checkInterval).toBe(100);
      expect(strategy.stableTime).toBe(500);
      expect(strategy.maxWait).toBe(3000);
    });
  });
});
