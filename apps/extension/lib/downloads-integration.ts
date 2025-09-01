/**
 * Downloads Integration for Chrome Downloads API
 * Provides robust file download capabilities with progress tracking, retry logic, and error handling
 */

export interface DownloadOptions {
  data: string;
  filename: string;
  mimeType: string;
  saveAs?: boolean;
  conflictAction?: "uniquify" | "overwrite" | "prompt";
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface DownloadResult {
  success: boolean;
  downloadId?: number;
  error?: string;
}

export interface DownloadProgress {
  downloadId: number;
  state: string;
  bytesReceived?: number;
  totalBytes?: number;
  progress: number;
}

// Extended interface for Chrome download delta with byte tracking
interface ExtendedDownloadDelta extends chrome.downloads.DownloadDelta {
  bytesReceived?: { current?: number; previous?: number };
  totalBytes?: { current?: number; previous?: number };
}

interface ActiveDownload {
  downloadId: number;
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
  listener?: (delta: chrome.downloads.DownloadDelta) => void;
  cleanup: () => void;
}

export class DownloadsIntegration {
  private static activeDownloads = new Map<number, ActiveDownload>();

  /**
   * Download a file using Chrome Downloads API
   */
  static async downloadFile(options: DownloadOptions): Promise<DownloadResult> {
    try {
      // Validate required parameters
      if (!options.data) {
        return { success: false, error: "Data is required" };
      }
      if (!options.filename) {
        return { success: false, error: "Filename is required" };
      }

      // Check for pre-cancellation
      if (options.signal?.aborted) {
        return { success: false, error: "Download cancelled" };
      }

      // Check permissions
      const hasPermission = await chrome.permissions.contains({
        permissions: ["downloads"],
      });

      if (!hasPermission) {
        return { success: false, error: "Downloads permission not granted" };
      }

      // Check for chrome runtime errors
      if (chrome.runtime.lastError) {
        return {
          success: false,
          error: chrome.runtime.lastError.message,
        };
      }

      // Attempt download with retry logic
      const maxAttempts = (options.retryAttempts || 0) + 1;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          // Check for cancellation before each attempt
          if (options.signal?.aborted) {
            return { success: false, error: "Download cancelled" };
          }

          const result = await this.performDownload(options);

          // If successful, return result
          if (result.success) {
            return result;
          }

          lastError = new Error(result.error || "Download failed");
        } catch (error: any) {
          lastError = error;

          // Don't retry on cancellation
          if (options.signal?.aborted || error.message?.includes("cancelled")) {
            return { success: false, error: "Download cancelled" };
          }
        }

        // Wait before retry (except on last attempt)
        if (attempt < maxAttempts - 1) {
          const delay = options.retryDelay || 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      return {
        success: false,
        error: lastError?.message || "Download failed after all retry attempts",
      };
    } catch (error: any) {
      console.error("Download failed:", error);
      return {
        success: false,
        error: error.message || "Download failed",
      };
    }
  }

  /**
   * Perform the actual download
   */
  private static async performDownload(
    options: DownloadOptions,
  ): Promise<DownloadResult> {
    // Create data URL
    const dataUrl = this.createDataUrl(options.data, options.mimeType);

    // Prepare Chrome downloads options
    const chromeOptions: chrome.downloads.DownloadOptions = {
      url: dataUrl,
      filename: options.filename,
      saveAs: options.saveAs || false,
    };

    // Add conflict action if specified
    if (options.conflictAction) {
      chromeOptions.conflictAction = options.conflictAction;
    }

    // Check for cancellation before initiating download
    if (options.signal?.aborted) {
      return { success: false, error: "Download cancelled" };
    }

    // Initiate download
    const downloadId = await chrome.downloads.download(chromeOptions);

    // Validate download ID
    if (!downloadId || typeof downloadId !== "number") {
      return { success: false, error: "Invalid download ID received" };
    }

    // Handle immediate cancellation if signal is already aborted
    if (options.signal?.aborted) {
      chrome.downloads.cancel(downloadId);
      return { success: false, error: "Download cancelled" };
    }

    // Set up progress tracking if requested
    if (options.onProgress || options.signal) {
      this.setupProgressTracking(downloadId, options);
    }

    // If we have a signal, we need to wait a bit to allow for potential cancellation
    // In a real browser, the Chrome API calls would be async and give time for cancellation
    if (options.signal) {
      // Use a very short delay to allow the event loop to process the abort signal
      await new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => resolve(), 1);

        // If signal gets aborted during this wait, resolve immediately
        if (options.signal && !options.signal.aborted) {
          const abortHandler = () => {
            clearTimeout(timeoutId);
            resolve();
          };
          options.signal.addEventListener("abort", abortHandler, {
            once: true,
          });
        }
      });

      // Check for cancellation after the micro-delay
      if (options.signal.aborted) {
        chrome.downloads.cancel(downloadId);
        this.cleanupDownload(downloadId);
        return { success: false, error: "Download cancelled" };
      }
    }

    return { success: true, downloadId };
  }

  /**
   * Create data URL from content and MIME type
   */
  private static createDataUrl(data: string, mimeType: string): string {
    return `data:${mimeType};charset=utf-8,${encodeURIComponent(data)}`;
  }

  /**
   * Set up progress tracking for a download
   */
  private static setupProgressTracking(
    downloadId: number,
    options: DownloadOptions,
  ): void {
    const listener = (delta: chrome.downloads.DownloadDelta) => {
      if (delta.id !== downloadId) return;

      // Handle cancellation
      if (options.signal?.aborted) {
        chrome.downloads.cancel(downloadId);
        this.cleanupDownload(downloadId);
        return;
      }

      // Create progress object
      const progress: DownloadProgress = {
        downloadId,
        state: delta.state?.current || "unknown",
        progress: 0,
      };

      // Calculate progress percentage
      // Use extended interface for proper type safety
      const extendedDelta = delta as ExtendedDownloadDelta;
      if (
        extendedDelta.bytesReceived?.current &&
        extendedDelta.totalBytes?.current
      ) {
        progress.bytesReceived = extendedDelta.bytesReceived.current;
        progress.totalBytes = extendedDelta.totalBytes.current;

        if (
          progress.totalBytes &&
          progress.totalBytes > 0 &&
          progress.bytesReceived
        ) {
          progress.progress = Math.round(
            (progress.bytesReceived / progress.totalBytes) * 100,
          );
        }
      } else if (delta.state?.current === "complete") {
        progress.progress = 100;
      }

      // Call progress callback
      if (options.onProgress) {
        options.onProgress(progress);
      }

      // Clean up on completion or error
      if (
        delta.state?.current === "complete" ||
        delta.state?.current === "interrupted" ||
        delta.state?.current === "cancelled"
      ) {
        this.cleanupDownload(downloadId);
      }
    };

    // Store active download info
    const activeDownload: ActiveDownload = {
      downloadId,
      onProgress: options.onProgress,
      signal: options.signal,
      listener,
      cleanup: () => {
        chrome.downloads.onChanged.removeListener(listener);
        this.activeDownloads.delete(downloadId);
      },
    };

    this.activeDownloads.set(downloadId, activeDownload);

    // Add listener
    chrome.downloads.onChanged.addListener(listener);

    // Handle cancellation from signal
    if (options.signal) {
      const handleAbort = () => {
        // Use synchronous cancellation for immediate effect
        chrome.downloads.cancel(downloadId);
        this.cleanupDownload(downloadId);
      };

      if (options.signal.aborted) {
        handleAbort();
      } else {
        options.signal.addEventListener("abort", handleAbort, { once: true });
      }
    }
  }

  /**
   * Cancel a download
   */
  private static async cancelDownload(downloadId: number): Promise<void> {
    try {
      await chrome.downloads.cancel(downloadId);
      this.cleanupDownload(downloadId);
    } catch (error) {
      console.error("Failed to cancel download:", error);
      // Still clean up even if cancel fails
      this.cleanupDownload(downloadId);
    }
  }

  /**
   * Clean up download tracking
   */
  private static cleanupDownload(downloadId: number): void {
    const activeDownload = this.activeDownloads.get(downloadId);
    if (activeDownload) {
      activeDownload.cleanup();
    }
  }

  /**
   * Get list of supported MIME types
   */
  static getSupportedMimeTypes(): Record<string, string> {
    return {
      json: "application/json",
      markdown: "text/markdown",
      csv: "text/csv",
      txt: "text/plain",
      html: "text/html",
      xml: "application/xml",
    };
  }

  /**
   * Get MIME type for file extension
   */
  static getMimeTypeForExtension(extension: string): string {
    const mimeTypes = this.getSupportedMimeTypes();
    const normalizedExt = extension.toLowerCase().replace(/^\./, "");
    return mimeTypes[normalizedExt] || "text/plain";
  }

  /**
   * Validate download options
   */
  static validateOptions(options: DownloadOptions): string | null {
    if (!options.data) {
      return "Data is required";
    }
    if (!options.filename) {
      return "Filename is required";
    }
    if (!options.mimeType) {
      return "MIME type is required";
    }
    if (options.retryAttempts !== undefined && options.retryAttempts < 0) {
      return "Retry attempts must be non-negative";
    }
    if (options.retryDelay !== undefined && options.retryDelay < 0) {
      return "Retry delay must be non-negative";
    }
    return null;
  }

  /**
   * Get download status
   */
  static async getDownloadStatus(
    downloadId: number,
  ): Promise<chrome.downloads.DownloadItem | null> {
    try {
      const results = await chrome.downloads.search({ id: downloadId });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error("Failed to get download status:", error);
      return null;
    }
  }

  /**
   * Get active downloads count
   */
  static getActiveDownloadsCount(): number {
    return this.activeDownloads.size;
  }

  /**
   * Cancel all active downloads
   */
  static async cancelAllDownloads(): Promise<void> {
    const downloadIds = Array.from(this.activeDownloads.keys());

    await Promise.all(
      downloadIds.map((downloadId) => this.cancelDownload(downloadId)),
    );
  }

  /**
   * Clean up all download tracking (for testing or shutdown)
   */
  static cleanupAll(): void {
    for (const downloadId of this.activeDownloads.keys()) {
      this.cleanupDownload(downloadId);
    }
  }
}
