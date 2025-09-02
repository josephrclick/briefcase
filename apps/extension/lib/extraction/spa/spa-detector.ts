import { DOMStabilityMonitor } from "./dom-stability-monitor";
import { FrameworkDetector } from "./framework-detector";

export interface SPADetectionResult {
  isSPA: boolean;
  framework: string | null;
  confidence: number;
}

export interface LoadingProgress {
  stage: "detecting" | "waiting" | "stabilizing" | "complete";
  message: string;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface ContentWaitOptions {
  framework?: string | null;
  timeout?: number;
  monitorNetwork?: boolean;
  onProgress?: (progress: LoadingProgress) => void;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ContentWaitResult {
  stable: boolean;
  timedOut?: boolean;
  timeElapsed: number;
  networkActivity?: boolean;
  strategy?: string;
}

export class SPADetector {
  private frameworkDetector: FrameworkDetector;
  private networkMonitor: NetworkMonitor | null = null;

  constructor() {
    this.frameworkDetector = new FrameworkDetector();
  }

  detectSPA(doc: Document, win: Window): SPADetectionResult {
    // Detect framework first
    const frameworkInfo = this.frameworkDetector.detect(doc, win);

    if (frameworkInfo.framework) {
      return {
        isSPA: true,
        framework: frameworkInfo.framework,
        confidence: frameworkInfo.confidence,
      };
    }

    // Generic SPA detection
    const spaSignals = this.detectGenericSPASignals(doc, win);

    return {
      isSPA: spaSignals.confidence > 0.5,
      framework: spaSignals.confidence > 0.5 ? "unknown" : null,
      confidence: spaSignals.confidence,
    };
  }

  private detectGenericSPASignals(
    doc: Document,
    win: Window,
  ): { confidence: number } {
    let confidence = 0;

    // Check for bundled scripts
    const scripts = Array.from(doc.querySelectorAll("script[src]"));
    const bundlePatterns = [
      /bundle/,
      /chunk/,
      /vendor/,
      /app\.[a-f0-9]{8}/,
      /main\.[a-f0-9]{8}/,
    ];

    for (const script of scripts) {
      const src = script.getAttribute("src") || "";
      if (bundlePatterns.some((pattern) => pattern.test(src))) {
        confidence += 0.2;
        break;
      }
    }

    // Check for SPA-like root elements
    if (
      doc.getElementById("root") ||
      doc.getElementById("app") ||
      doc.querySelector("[data-app]")
    ) {
      confidence += 0.3;
    }

    // Check for router elements
    if (doc.querySelector("router-outlet, router-view, [ui-view]")) {
      confidence += 0.3;
    }

    // Check for minimal initial HTML
    const bodyText = doc.body.textContent?.trim() || "";
    if (bodyText.length < 100 && scripts.length > 3) {
      confidence += 0.2;
    }

    // Check for history API usage
    if (win.history && typeof win.history.pushState === "function") {
      confidence += 0.1;
    }

    return { confidence: Math.min(confidence, 1) };
  }

  private createDOMMonitor(doc: Document): DOMStabilityMonitor {
    return new DOMStabilityMonitor(doc.body || doc);
  }

  async waitForContentWithRetry(
    doc: Document,
    options: ContentWaitOptions = {},
  ): Promise<ContentWaitResult> {
    const { maxRetries = 3, retryDelay = 1000 } = options;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.waitForContent(doc, {
        ...options,
        onProgress: (progress) => {
          // Adjust progress message to include retry attempt
          if (options.onProgress) {
            const adjustedProgress = {
              ...progress,
              message:
                attempt > 1
                  ? `${progress.message} (attempt ${attempt}/${maxRetries})`
                  : progress.message,
            };
            options.onProgress(adjustedProgress);
          }
        },
      });

      if (result.stable) {
        return result;
      }

      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        if (options.onProgress) {
          options.onProgress({
            stage: "waiting",
            message: `Retrying in ${retryDelay / 1000} seconds...`,
            percentage: (attempt / maxRetries) * 100,
            estimatedTimeRemaining: retryDelay * (maxRetries - attempt),
          });
        }
        await this.delay(retryDelay * attempt); // Exponential backoff
      }
    }

    // Return the last failed result
    return await this.waitForContent(doc, options);
  }

  async waitForContent(
    doc: Document,
    options: ContentWaitOptions = {},
  ): Promise<ContentWaitResult> {
    const startTime = Date.now();
    const {
      framework,
      timeout = 5000,
      monitorNetwork = false,
      onProgress,
    } = options;

    // Get optimized wait strategy
    const strategy = this.frameworkDetector.getOptimizedWaitStrategy(
      framework || null,
    );

    // Report initial progress
    if (onProgress) {
      onProgress({
        stage: "detecting",
        message: `Detected ${framework || "generic"} application`,
        percentage: 10,
        estimatedTimeRemaining: strategy.maxWait,
      });
    }

    // Start network monitoring if requested
    if (monitorNetwork) {
      this.networkMonitor = new NetworkMonitor();
      this.networkMonitor.start();
    }

    // Report waiting stage
    if (onProgress) {
      onProgress({
        stage: "waiting",
        message: "Waiting for initial content load",
        percentage: 25,
        estimatedTimeRemaining: strategy.maxWait - strategy.initialWait,
      });
    }

    // Initial wait
    await this.delay(strategy.initialWait);

    // Create DOM stability monitor
    const monitor = this.createDOMMonitor(doc);

    try {
      // Report stabilizing stage
      if (onProgress) {
        onProgress({
          stage: "stabilizing",
          message: "Waiting for DOM to stabilize",
          percentage: 50,
          estimatedTimeRemaining: strategy.stableTime,
        });
      }

      // Use progressive timeout strategy
      const timeoutSteps = [1000, 2000, 3000, 5000];
      const effectiveTimeout = Math.min(
        timeout,
        timeoutSteps.find((t) => t >= timeout) || 5000,
      );

      const stable = await monitor.waitForStability({
        stableTime: strategy.stableTime,
        maxWait: effectiveTimeout,
        checkInterval: strategy.checkInterval,
        requiredWindows: framework === "angular" ? 2 : 1,
        ignoredSelectors: [
          ".loading",
          ".spinner",
          ".skeleton",
          "[data-loading]",
        ],
      });

      const timeElapsed = Date.now() - startTime;
      const networkActivity = this.networkMonitor?.hasActivity() || false;

      // Report completion
      if (onProgress) {
        onProgress({
          stage: "complete",
          message: stable
            ? "Content loaded successfully"
            : "Content loading timed out",
          percentage: 100,
          estimatedTimeRemaining: 0,
        });
      }

      return {
        stable,
        timedOut: !stable && timeElapsed >= effectiveTimeout,
        timeElapsed,
        networkActivity,
        strategy: `${framework || "generic"}-optimized`,
      };
    } finally {
      monitor.destroy();
      if (this.networkMonitor) {
        this.networkMonitor.stop();
        this.networkMonitor = null;
      }
    }
  }

  getRecommendedTimeout(framework: string | null, doc?: Document): number {
    const baseTimeouts: Record<string, number> = {
      react: 2000,
      vue: 2000,
      angular: 3000,
      nextjs: 2500,
      svelte: 2000,
      ember: 2500,
      unknown: 3000,
    };

    let timeout = baseTimeouts[framework || "unknown"] || 3000;

    // Adjust based on page complexity
    if (doc) {
      const elementCount = doc.querySelectorAll("*").length;
      if (elementCount > 1000) {
        timeout += 500;
      }
      if (elementCount > 5000) {
        timeout += 1000;
      }
    }

    return timeout;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class NetworkMonitor {
  private originalFetch: typeof fetch;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open;
  private activeRequests = 0;
  private totalRequests = 0;

  constructor() {
    this.originalFetch = window.fetch;
    this.originalXHROpen = XMLHttpRequest.prototype.open;
  }

  start(): void {
    // Monitor fetch requests
    window.fetch = (...args) => {
      this.activeRequests++;
      this.totalRequests++;

      return this.originalFetch.apply(window, args).finally(() => {
        this.activeRequests--;
      });
    };

    // Monitor XHR requests
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      ...args: any[]
    ) {
      this.addEventListener("loadstart", () => {
        (window as any).__networkMonitor?.onRequestStart();
      });

      this.addEventListener("loadend", () => {
        (window as any).__networkMonitor?.onRequestEnd();
      });

      return (XMLHttpRequest.prototype.open as any).apply(this, args);
    };

    // Store reference for XHR callbacks
    (window as any).__networkMonitor = {
      onRequestStart: () => {
        this.activeRequests++;
        this.totalRequests++;
      },
      onRequestEnd: () => {
        this.activeRequests--;
      },
    };
  }

  stop(): void {
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHROpen;
    delete (window as any).__networkMonitor;
  }

  hasActivity(): boolean {
    return this.totalRequests > 0;
  }

  getActiveRequests(): number {
    return this.activeRequests;
  }
}
