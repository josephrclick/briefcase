import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import {
  DownloadsIntegration,
  DownloadResult,
  DownloadOptions,
} from "./downloads-integration";

describe("DownloadsIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock chrome.downloads API
    global.chrome = {
      ...global.chrome,
      downloads: {
        download: vi.fn().mockResolvedValue(123),
        search: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        cancel: vi.fn(),
        removeFile: vi.fn(),
        erase: vi.fn(),
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
        onCreated: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      permissions: {
        contains: vi.fn().mockResolvedValue(true),
      },
      runtime: {
        lastError: null,
      },
    } as any;
  });

  describe("Basic Download Functionality", () => {
    it("should successfully trigger a download", async () => {
      const result = await DownloadsIntegration.downloadFile({
        data: '{"test": "data"}',
        filename: "test-export.json",
        mimeType: "application/json",
      });

      expect(result.success).toBe(true);
      expect(result.downloadId).toBe(123);
      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: "data:application/json;charset=utf-8,%7B%22test%22%3A%20%22data%22%7D",
        filename: "test-export.json",
        saveAs: false,
      });
    });

    it("should handle download failures", async () => {
      (chrome.downloads.download as Mock).mockRejectedValue(
        new Error("Download failed"),
      );

      const result = await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Download failed");
    });

    it("should validate required parameters", async () => {
      const result = await DownloadsIntegration.downloadFile({
        data: "",
        filename: "test.txt",
        mimeType: "text/plain",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Data is required");
    });

    it("should validate filename parameter", async () => {
      const result = await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "",
        mimeType: "text/plain",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Filename is required");
    });
  });

  describe("MIME Type Configuration", () => {
    it("should support JSON MIME type", async () => {
      await DownloadsIntegration.downloadFile({
        data: '{"test": "json"}',
        filename: "data.json",
        mimeType: "application/json",
      });

      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("data:application/json"),
        }),
      );
    });

    it("should support Markdown MIME type", async () => {
      await DownloadsIntegration.downloadFile({
        data: "# Markdown content",
        filename: "content.md",
        mimeType: "text/markdown",
      });

      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("data:text/markdown"),
        }),
      );
    });

    it("should support CSV MIME type", async () => {
      await DownloadsIntegration.downloadFile({
        data: "col1,col2\nval1,val2",
        filename: "data.csv",
        mimeType: "text/csv",
      });

      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("data:text/csv"),
        }),
      );
    });

    it("should handle custom MIME types", async () => {
      await DownloadsIntegration.downloadFile({
        data: "custom data",
        filename: "custom.txt",
        mimeType: "text/custom",
      });

      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("data:text/custom"),
        }),
      );
    });
  });

  describe("Download Progress Tracking", () => {
    it("should set up progress tracking listeners", async () => {
      const progressCallback = vi.fn();

      await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        onProgress: progressCallback,
      });

      expect(chrome.downloads.onChanged.addListener).toHaveBeenCalled();
    });

    it("should track download state changes", async () => {
      const progressCallback = vi.fn();
      let changeListener: any;

      (chrome.downloads.onChanged.addListener as Mock).mockImplementation(
        (listener) => {
          changeListener = listener;
        },
      );

      await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        onProgress: progressCallback,
      });

      // Simulate download progress
      changeListener({
        id: 123,
        state: { current: "in_progress", previous: "in_progress" },
        bytesReceived: { current: 50, previous: 25 },
        totalBytes: { current: 100, previous: 100 },
      });

      expect(progressCallback).toHaveBeenCalledWith({
        downloadId: 123,
        state: "in_progress",
        bytesReceived: 50,
        totalBytes: 100,
        progress: 50,
      });
    });

    it("should handle download completion", async () => {
      const progressCallback = vi.fn();
      let changeListener: any;

      (chrome.downloads.onChanged.addListener as Mock).mockImplementation(
        (listener) => {
          changeListener = listener;
        },
      );

      await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        onProgress: progressCallback,
      });

      // Simulate download completion
      changeListener({
        id: 123,
        state: { current: "complete", previous: "in_progress" },
      });

      expect(progressCallback).toHaveBeenCalledWith({
        downloadId: 123,
        state: "complete",
        progress: 100,
      });
    });

    it("should remove progress listener after completion", async () => {
      const progressCallback = vi.fn();
      let changeListener: any;

      (chrome.downloads.onChanged.addListener as Mock).mockImplementation(
        (listener) => {
          changeListener = listener;
        },
      );

      await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        onProgress: progressCallback,
      });

      // Simulate completion
      changeListener({
        id: 123,
        state: { current: "complete", previous: "in_progress" },
      });

      expect(chrome.downloads.onChanged.removeListener).toHaveBeenCalledWith(
        changeListener,
      );
    });
  });

  describe("Download Cancellation", () => {
    it("should support cancellation during download", async () => {
      const abortController = new AbortController();

      const downloadPromise = DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        signal: abortController.signal,
      });

      // Wait a tick to allow download setup to complete, then cancel
      await new Promise((resolve) => setTimeout(resolve, 0));
      abortController.abort();

      const result = await downloadPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain("Download cancelled");
      expect(chrome.downloads.cancel).toHaveBeenCalledWith(123);
    });

    it("should handle pre-cancelled signal", async () => {
      const abortController = new AbortController();
      abortController.abort(); // Pre-cancel

      const result = await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        signal: abortController.signal,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Download cancelled");
      expect(chrome.downloads.download).not.toHaveBeenCalled();
    });

    it("should clean up listeners on cancellation", async () => {
      const abortController = new AbortController();
      const progressCallback = vi.fn();
      let changeListener: any;

      (chrome.downloads.onChanged.addListener as Mock).mockImplementation(
        (listener) => {
          changeListener = listener;
        },
      );

      const downloadPromise = DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        onProgress: progressCallback,
        signal: abortController.signal,
      });

      // Wait a tick to allow download setup to complete, then cancel
      await new Promise((resolve) => setTimeout(resolve, 0));
      abortController.abort();
      await downloadPromise;

      expect(chrome.downloads.onChanged.removeListener).toHaveBeenCalledWith(
        changeListener,
      );
    });
  });

  describe("Retry Mechanism", () => {
    it("should retry failed downloads", async () => {
      (chrome.downloads.download as Mock)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue(456);

      const result = await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        retryAttempts: 2,
      });

      expect(result.success).toBe(true);
      expect(result.downloadId).toBe(456);
      expect(chrome.downloads.download).toHaveBeenCalledTimes(2);
    });

    it("should respect maximum retry attempts", async () => {
      (chrome.downloads.download as Mock).mockRejectedValue(
        new Error("Persistent error"),
      );

      const result = await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        retryAttempts: 3,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Persistent error");
      expect(chrome.downloads.download).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it("should add delay between retries", async () => {
      const delayMock = vi
        .spyOn(global, "setTimeout")
        .mockImplementation((fn) => {
          (fn as Function)();
          return 123 as any;
        });

      (chrome.downloads.download as Mock)
        .mockRejectedValueOnce(new Error("Temporary error"))
        .mockResolvedValue(789);

      await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        retryAttempts: 1,
        retryDelay: 1000,
      });

      expect(delayMock).toHaveBeenCalledWith(expect.any(Function), 1000);
      delayMock.mockRestore();
    });

    it("should not retry on user cancellation", async () => {
      const abortController = new AbortController();

      (chrome.downloads.download as Mock).mockImplementation(async () => {
        abortController.abort();
        throw new Error("Download cancelled");
      });

      const result = await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        retryAttempts: 3,
        signal: abortController.signal,
      });

      expect(result.success).toBe(false);
      expect(chrome.downloads.download).toHaveBeenCalledTimes(1); // No retries on cancellation
    });
  });

  describe("Browser Download Preferences", () => {
    it("should respect saveAs preference", async () => {
      await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        saveAs: true,
      });

      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          saveAs: true,
        }),
      );
    });

    it("should handle conflictAction preference", async () => {
      await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
        conflictAction: "overwrite",
      });

      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          conflictAction: "overwrite",
        }),
      );
    });

    it("should support custom download directory", async () => {
      // Note: Chrome doesn't allow setting custom directories from extensions
      // This tests that we don't break when the option is provided
      await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "downloads/test.txt", // Subdirectory in filename
        mimeType: "text/plain",
      });

      expect(chrome.downloads.download).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: "downloads/test.txt",
        }),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle permission denied errors", async () => {
      (chrome.permissions.contains as Mock).mockResolvedValue(false);

      const result = await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Downloads permission not granted");
    });

    it("should handle chrome runtime errors", async () => {
      global.chrome.runtime.lastError = { message: "Runtime error occurred" };

      const result = await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
      });

      // Clean up
      global.chrome.runtime.lastError = null;

      expect(result.success).toBe(false);
      expect(result.error).toContain("Runtime error occurred");
    });

    it("should handle invalid download IDs", async () => {
      (chrome.downloads.download as Mock).mockResolvedValue(null);

      const result = await DownloadsIntegration.downloadFile({
        data: "test data",
        filename: "test.txt",
        mimeType: "text/plain",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid download ID received");
    });

    it("should handle large file data", async () => {
      // Create a large string (> 1MB)
      const largeData = "x".repeat(1024 * 1024 + 1);

      const result = await DownloadsIntegration.downloadFile({
        data: largeData,
        filename: "large-file.txt",
        mimeType: "text/plain",
      });

      // Should still succeed for large files
      expect(result.success).toBe(true);
      expect(chrome.downloads.download).toHaveBeenCalled();
    });
  });

  describe("Data URL Encoding", () => {
    it("should properly encode special characters", async () => {
      const specialData = "Special chars: \n\r\t\"'&<>{}[]";

      await DownloadsIntegration.downloadFile({
        data: specialData,
        filename: "special.txt",
        mimeType: "text/plain",
      });

      const calledArgs = (chrome.downloads.download as Mock).mock.calls[0][0];
      expect(calledArgs.url).toContain("data:text/plain;charset=utf-8,");
      expect(decodeURIComponent(calledArgs.url.split(",")[1])).toBe(
        specialData,
      );
    });

    it("should handle Unicode characters", async () => {
      const unicodeData = "Unicode: 🚀 测试 🌟";

      await DownloadsIntegration.downloadFile({
        data: unicodeData,
        filename: "unicode.txt",
        mimeType: "text/plain",
      });

      const calledArgs = (chrome.downloads.download as Mock).mock.calls[0][0];
      expect(decodeURIComponent(calledArgs.url.split(",")[1])).toBe(
        unicodeData,
      );
    });

    it("should handle binary-like data", async () => {
      const binaryData = String.fromCharCode(...Array(256).keys());

      await DownloadsIntegration.downloadFile({
        data: binaryData,
        filename: "binary.dat",
        mimeType: "application/octet-stream",
      });

      expect(chrome.downloads.download).toHaveBeenCalled();
      const calledArgs = (chrome.downloads.download as Mock).mock.calls[0][0];
      expect(calledArgs.url).toContain("data:application/octet-stream");
    });
  });

  describe("Integration with ExportService", () => {
    it("should integrate with ExportService formats", async () => {
      const formats = [
        {
          data: '{"test": "json"}',
          mimeType: "application/json",
          extension: ".json",
        },
        {
          data: "# Test Markdown",
          mimeType: "text/markdown",
          extension: ".md",
        },
        {
          data: "col1,col2\nval1,val2",
          mimeType: "text/csv",
          extension: ".csv",
        },
      ];

      for (const format of formats) {
        const result = await DownloadsIntegration.downloadFile({
          data: format.data,
          filename: `test${format.extension}`,
          mimeType: format.mimeType,
        });

        expect(result.success).toBe(true);
      }

      expect(chrome.downloads.download).toHaveBeenCalledTimes(3);
    });

    it("should handle batch downloads", async () => {
      const downloads = Array(5)
        .fill(null)
        .map((_, i) => ({
          data: `Data ${i}`,
          filename: `file${i}.txt`,
          mimeType: "text/plain",
        }));

      const results = await Promise.all(
        downloads.map((download) =>
          DownloadsIntegration.downloadFile(download),
        ),
      );

      expect(results.every((r) => r.success)).toBe(true);
      expect(chrome.downloads.download).toHaveBeenCalledTimes(5);
    });
  });
});
