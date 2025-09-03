/**
 * Performance Monitoring Module
 *
 * Tracks key performance metrics for the Briefcase extension including:
 * - Extension startup time
 * - Content extraction duration
 * - Summarization time to first token
 * - Memory usage patterns
 * - Bundle loading times
 */

interface PerformanceMetrics {
  startupTime?: number;
  extractionTime?: number;
  summarizationTime?: number;
  memoryUsage?: number;
  bundleLoadTimes?: Record<string, number>;
  timestamp: string;
}

interface PerformanceThresholds {
  startupTime: number; // ms
  extractionTime: number; // ms
  summarizationTime: number; // ms
  memoryUsage: number; // MB
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();
  private readonly MAX_METRICS_HISTORY = 100;

  // Performance thresholds for alerts
  private readonly thresholds: PerformanceThresholds = {
    startupTime: 1000, // 1 second
    extractionTime: 3000, // 3 seconds
    summarizationTime: 1000, // 1 second to first token
    memoryUsage: 50, // 50 MB
  };

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Monitor extension startup if in service worker context
    if (typeof chrome !== "undefined" && chrome.runtime) {
      this.measureStartupTime();
    }

    // Set up periodic memory monitoring
    if (typeof performance !== "undefined" && "memory" in performance) {
      setInterval(() => this.captureMemoryUsage(), 30000); // Every 30 seconds
    }
  }

  /**
   * Mark the start of a performance measurement
   */
  mark(name: string): void {
    this.marks.set(name, performance.now());
    console.log(`[Performance] Mark set: ${name}`);
  }

  /**
   * Measure the time between a mark and now
   */
  measure(name: string, startMark: string): number {
    const start = this.marks.get(startMark);
    if (!start) {
      console.warn(`[Performance] Start mark not found: ${startMark}`);
      return 0;
    }

    const duration = performance.now() - start;
    this.measures.set(name, duration);

    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

    // Check against thresholds
    this.checkThreshold(name, duration);

    return duration;
  }

  /**
   * Measure extension startup time
   */
  private measureStartupTime(): void {
    // Use Navigation Timing API if available
    if (performance.timing) {
      const startupTime =
        performance.timing.loadEventEnd - performance.timing.fetchStart;
      this.recordMetric({ startupTime });
    }
  }

  /**
   * Track content extraction performance
   */
  startExtraction(): void {
    this.mark("extraction-start");
  }

  endExtraction(): number {
    const duration = this.measure("extraction", "extraction-start");
    this.recordMetric({ extractionTime: duration });
    return duration;
  }

  /**
   * Track summarization performance
   */
  startSummarization(): void {
    this.mark("summarization-start");
  }

  endSummarization(): number {
    const duration = this.measure("summarization", "summarization-start");
    this.recordMetric({ summarizationTime: duration });
    return duration;
  }

  /**
   * Track bundle loading
   */
  trackBundleLoad(bundleName: string, startTime: number): void {
    const loadTime = performance.now() - startTime;
    console.log(
      `[Performance] Bundle loaded: ${bundleName} in ${loadTime.toFixed(2)}ms`,
    );

    const currentBundleTimes =
      this.metrics[this.metrics.length - 1]?.bundleLoadTimes || {};
    currentBundleTimes[bundleName] = loadTime;

    this.recordMetric({ bundleLoadTimes: currentBundleTimes });
  }

  /**
   * Capture current memory usage
   */
  private captureMemoryUsage(): void {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      const usedMemoryMB = memory.usedJSHeapSize / 1024 / 1024;

      this.recordMetric({ memoryUsage: usedMemoryMB });

      // Warn if memory usage is high
      if (usedMemoryMB > this.thresholds.memoryUsage) {
        console.warn(
          `[Performance] High memory usage: ${usedMemoryMB.toFixed(2)}MB`,
        );
      }
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: Partial<PerformanceMetrics>): void {
    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: new Date().toISOString(),
    };

    this.metrics.push(fullMetric);

    // Maintain history limit
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift();
    }

    // Store in chrome.storage.local for persistence
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local
        .set({
          "performance-metrics": this.metrics,
        })
        .catch((err) =>
          console.error("[Performance] Failed to store metrics:", err),
        );
    }
  }

  /**
   * Check if a metric exceeds its threshold
   */
  private checkThreshold(metricName: string, value: number): void {
    const thresholdKey = (metricName.replace("-", "") +
      "Time") as keyof PerformanceThresholds;
    const threshold = this.thresholds[thresholdKey];

    if (threshold && value > threshold) {
      console.warn(
        `[Performance] Threshold exceeded for ${metricName}: ${value.toFixed(2)}ms > ${threshold}ms`,
      );

      // Could trigger alerts or telemetry here
      this.reportPerformanceIssue(metricName, value, threshold);
    }
  }

  /**
   * Report performance issues (placeholder for telemetry)
   */
  private reportPerformanceIssue(
    metric: string,
    value: number,
    threshold: number,
  ): void {
    // In production, this would send telemetry
    // For now, just log to console
    const issue = {
      metric,
      value,
      threshold,
      exceeded: value - threshold,
      timestamp: new Date().toISOString(),
    };

    console.warn("[Performance] Issue detected:", issue);
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    averages: Record<string, number>;
    recent: PerformanceMetrics[];
    issues: string[];
  } {
    const recent = this.metrics.slice(-10);

    // Calculate averages
    const averages: Record<string, number> = {};
    const metricKeys: (keyof PerformanceMetrics)[] = [
      "startupTime",
      "extractionTime",
      "summarizationTime",
      "memoryUsage",
    ];

    metricKeys.forEach((key) => {
      const values = this.metrics
        .map((m) => m[key])
        .filter((v): v is number => v !== undefined);

      if (values.length > 0) {
        averages[key] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    });

    // Identify current issues
    const issues: string[] = [];
    const latestMetric = this.metrics[this.metrics.length - 1];

    if (latestMetric) {
      Object.entries(this.thresholds).forEach(([key, threshold]) => {
        const value = latestMetric[key as keyof PerformanceMetrics];
        if (typeof value === "number" && value > threshold) {
          issues.push(
            `${key} exceeds threshold: ${value.toFixed(2)} > ${threshold}`,
          );
        }
      });
    }

    return { averages, recent, issues };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.marks.clear();
    this.measures.clear();

    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.remove("performance-metrics");
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper function for tracking async operations
export async function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  performanceMonitor.mark(`${operation}-start`);

  try {
    const result = await fn();
    performanceMonitor.measure(operation, `${operation}-start`);
    return result;
  } catch (error) {
    performanceMonitor.measure(`${operation}-error`, `${operation}-start`);
    throw error;
  }
}
