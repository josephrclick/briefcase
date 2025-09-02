export interface StabilityOptions {
  stableTime?: number;
  maxWait?: number;
  checkInterval?: number;
  requiredWindows?: number;
  ignoredSelectors?: string[];
}

export class DOMStabilityMonitor {
  private observer: MutationObserver | null = null;
  private mutationCount = 0;
  private lastMutationTime = 0;
  private stabilityPromise: Promise<boolean> | null = null;
  private stabilityResolve: ((value: boolean) => void) | null = null;
  private checkTimer: NodeJS.Timeout | null = null;
  private maxWaitTimer: NodeJS.Timeout | null = null;
  private stableWindows = 0;
  private isDestroyed = false;
  private navigationListener: (() => void) | null = null;
  private unloadListener: (() => void) | null = null;

  constructor(private targetElement: HTMLElement | Document = document) {}

  waitForStability(options: StabilityOptions = {}): Promise<boolean> {
    const {
      stableTime = 500,
      maxWait = 3000,
      checkInterval = 100,
      requiredWindows = 1,
      ignoredSelectors = [],
    } = options;

    if (this.stabilityPromise) {
      return this.stabilityPromise;
    }

    this.stabilityPromise = new Promise<boolean>((resolve) => {
      this.stabilityResolve = resolve;
      this.stableWindows = 0;

      // Set up navigation detection to cleanup on page change
      this.navigationListener = () => {
        console.warn("Page navigation detected during DOM stability check");
        this.resolveStability(false);
      };

      this.unloadListener = () => {
        console.warn("Page unload detected during DOM stability check");
        this.destroy();
      };

      // Listen for navigation events
      window.addEventListener("popstate", this.navigationListener);
      window.addEventListener("beforeunload", this.unloadListener);

      // For SPAs, also detect URL changes
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = (...args) => {
        originalPushState.apply(history, args);
        if (this.navigationListener) this.navigationListener();
      };

      history.replaceState = (...args) => {
        originalReplaceState.apply(history, args);
        if (this.navigationListener) this.navigationListener();
      };

      // Set up mutation observer
      this.observer = new MutationObserver((mutations) => {
        // Filter out ignored mutations
        const relevantMutations =
          ignoredSelectors.length > 0
            ? mutations.filter((mutation) => {
                const target = mutation.target as HTMLElement;
                return !ignoredSelectors.some(
                  (selector) =>
                    target.matches?.(selector) || target.closest?.(selector),
                );
              })
            : mutations;

        if (relevantMutations.length > 0) {
          this.mutationCount += relevantMutations.length;
          this.lastMutationTime = Date.now();
          this.stableWindows = 0; // Reset stable windows counter
        }
      });

      // Start observing
      this.observer.observe(this.targetElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
        attributeOldValue: false,
        characterDataOldValue: false,
      });

      // Set up stability check interval
      let lastCheckTime = Date.now();
      this.checkTimer = setInterval(() => {
        const now = Date.now();
        const timeSinceLastMutation = now - this.lastMutationTime;

        if (timeSinceLastMutation >= stableTime) {
          this.stableWindows++;

          if (this.stableWindows >= requiredWindows) {
            this.resolveStability(true);
          }
        } else {
          this.stableWindows = 0;
        }

        lastCheckTime = now;
      }, checkInterval);

      // Set up max wait timer
      this.maxWaitTimer = setTimeout(() => {
        this.resolveStability(false);
      }, maxWait);
    });

    return this.stabilityPromise;
  }

  private resolveStability(stable: boolean): void {
    if (this.isDestroyed) return;

    this.cleanup();

    if (this.stabilityResolve) {
      this.stabilityResolve(stable);
      this.stabilityResolve = null;
    }

    this.stabilityPromise = null;
  }

  private cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }

    // Remove navigation listeners
    if (this.navigationListener) {
      window.removeEventListener("popstate", this.navigationListener);
      this.navigationListener = null;
    }

    if (this.unloadListener) {
      window.removeEventListener("beforeunload", this.unloadListener);
      this.unloadListener = null;
    }
  }

  getMutationCount(): number {
    return this.mutationCount;
  }

  getTimeSinceLastMutation(): number {
    return this.lastMutationTime
      ? Date.now() - this.lastMutationTime
      : Infinity;
  }

  destroy(): void {
    this.isDestroyed = true;
    this.cleanup();
    this.stabilityResolve = null;
    this.stabilityPromise = null;
  }
}
