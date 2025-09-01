/**
 * Export Service for generating and downloading document exports in various formats
 */

import { Document, DocumentRepository } from "./document-repository";

export type ExportFormat = "json" | "markdown" | "csv";

export interface ExportOptions {
  limit?: number;
  filenamePrefix?: string;
  onProgress?: (current: number, total: number) => void;
  signal?: AbortSignal;
}

export interface ExportResult {
  success: boolean;
  format?: ExportFormat;
  documentCount?: number;
  downloadId?: number;
  error?: string;
}

export interface JSONExport {
  exportedAt: string;
  documentCount: number;
  documents: Document[];
}

export class ExportService {
  private static readonly BATCH_SIZE = 25;
  private static readonly EXPORT_MIME_TYPES = {
    json: "application/json",
    markdown: "text/markdown",
    csv: "text/csv",
  };

  /**
   * Get list of supported export formats
   */
  static getSupportedFormats(): ExportFormat[] {
    return ["json", "markdown", "csv"];
  }

  /**
   * Get MIME type for a given export format
   */
  static getMimeType(format: ExportFormat): string {
    return this.EXPORT_MIME_TYPES[format];
  }

  /**
   * Get batch size for processing large datasets
   */
  static getBatchSize(): number {
    return this.BATCH_SIZE;
  }

  /**
   * Generate filename with timestamp for given format
   */
  static generateFilename(
    format: ExportFormat,
    options?: ExportOptions,
  ): string {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const prefix = options?.filenamePrefix || "briefcase-summaries";
    const extension = this.getFileExtension(format);
    return `${prefix}-${date}.${extension}`;
  }

  /**
   * Get file extension for format
   */
  private static getFileExtension(format: ExportFormat): string {
    switch (format) {
      case "json":
        return "json";
      case "markdown":
        return "md";
      case "csv":
        return "csv";
      default:
        return "txt";
    }
  }

  /**
   * Create batches from array of documents
   */
  static createBatches<T>(items: T[]): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += this.BATCH_SIZE) {
      batches.push(items.slice(i, i + this.BATCH_SIZE));
    }
    return batches;
  }

  /**
   * Export documents in specified format
   */
  static async exportDocuments(
    format: ExportFormat,
    options: ExportOptions = {},
  ): Promise<ExportResult> {
    try {
      // Validate format
      if (!this.getSupportedFormats().includes(format)) {
        return {
          success: false,
          error: `Unsupported export format: ${format}`,
        };
      }

      // Check for cancellation
      if (options.signal?.aborted) {
        return {
          success: false,
          error: "Export cancelled",
        };
      }

      // Check permissions
      const hasPermission = await chrome.permissions.contains({
        permissions: ["downloads"],
      });

      if (!hasPermission) {
        return {
          success: false,
          error: "Downloads permission not granted",
        };
      }

      // Get documents
      const repository = new DocumentRepository();
      const documents = await repository.getRecentDocuments(options.limit);

      if (documents.length === 0) {
        return {
          success: false,
          error: "No documents to export",
        };
      }

      // Check for cancellation before processing
      if (options.signal?.aborted) {
        return {
          success: false,
          error: "Export cancelled",
        };
      }

      // Generate export data based on format
      let exportData: string;
      try {
        switch (format) {
          case "json":
            exportData = await this.generateJSON(documents, options);
            break;
          case "markdown":
            exportData = await this.generateMarkdown(documents, options);
            break;
          case "csv":
            exportData = await this.generateCSV(documents, options);
            break;
          default:
            return {
              success: false,
              error: `Unsupported format: ${format}`,
            };
        }
      } catch (error: any) {
        if (error.message === "Export cancelled" || options.signal?.aborted) {
          return {
            success: false,
            error: "Export cancelled",
          };
        }
        throw error;
      }

      // Check for cancellation before download
      if (options.signal?.aborted) {
        return {
          success: false,
          error: "Export cancelled",
        };
      }

      // Create download
      const filename = this.generateFilename(format, options);
      const mimeType = this.getMimeType(format);
      const dataUrl = `data:${mimeType};charset=utf-8,${encodeURIComponent(exportData)}`;

      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename,
        saveAs: false,
      });

      return {
        success: true,
        format,
        documentCount: documents.length,
        downloadId,
      };
    } catch (error: any) {
      console.error("Export failed:", error);
      return {
        success: false,
        error: error.message || "Export failed",
      };
    }
  }

  /**
   * Export documents as JSON
   */
  static async exportAsJSON(
    options: ExportOptions = {},
  ): Promise<ExportResult> {
    return this.exportDocuments("json", options);
  }

  /**
   * Export documents as Markdown
   */
  static async exportAsMarkdown(
    options: ExportOptions = {},
  ): Promise<ExportResult> {
    return this.exportDocuments("markdown", options);
  }

  /**
   * Export documents as CSV
   */
  static async exportAsCSV(options: ExportOptions = {}): Promise<ExportResult> {
    return this.exportDocuments("csv", options);
  }

  /**
   * Generate JSON export data
   */
  static async generateJSON(
    documents: Document[],
    options?: ExportOptions,
  ): Promise<string> {
    // Process documents in batches if needed
    const batches = this.createBatches(documents);
    let processedDocuments: Document[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Check for cancellation
      if (options?.signal?.aborted) {
        throw new Error("Export cancelled");
      }

      // Process batch
      processedDocuments = processedDocuments.concat(batch);

      // Report progress
      if (options?.onProgress && batches.length > 1) {
        const processed = (i + 1) * this.BATCH_SIZE;
        const currentProgress = Math.min(processed, documents.length);
        const progressPercent = Math.round(
          (currentProgress / documents.length) * 100,
        );
        options.onProgress(currentProgress, progressPercent);
      }

      // Small delay between batches to prevent UI blocking
      if (batches.length > 1 && i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    const exportData: JSONExport = {
      exportedAt: new Date().toISOString(),
      documentCount: documents.length,
      documents: processedDocuments,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate Markdown export data
   */
  static async generateMarkdown(
    documents: Document[],
    options?: ExportOptions,
  ): Promise<string> {
    const batches = this.createBatches(documents);
    let markdown = "";

    // Add header
    const date = new Date().toISOString().split("T")[0];
    markdown += "# Briefcase Export\n\n";
    markdown += `Exported on: ${date}\n`;
    markdown += `Total documents: ${documents.length}\n\n`;
    markdown += "---\n\n";

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Check for cancellation
      if (options?.signal?.aborted) {
        throw new Error("Export cancelled");
      }

      // Process batch
      for (const doc of batch) {
        markdown += `## ${doc.title}\n\n`;

        // Metadata table
        markdown += "| Field | Value |\n";
        markdown += "|-------|-------|\n";
        markdown += `| URL | ${doc.url} |\n`;
        markdown += `| Domain | ${doc.domain} |\n`;

        if (doc.metadata.author) {
          markdown += `| Author | ${doc.metadata.author} |\n`;
        }
        if (doc.metadata.publishedDate) {
          markdown += `| Published | ${doc.metadata.publishedDate} |\n`;
        }
        markdown += `| Word Count | ${doc.metadata.wordCount} |\n`;
        if (doc.metadata.readingTime) {
          markdown += `| Reading Time | ${doc.metadata.readingTime} min |\n`;
        }
        markdown += `| Created | ${doc.createdAt} |\n`;
        if (doc.summarizedAt) {
          markdown += `| Summarized | ${doc.summarizedAt} |\n`;
        }
        markdown += "\n";

        // Summary section
        if (doc.summary || doc.summaryText) {
          if (doc.summary?.keyPoints && doc.summary.keyPoints.length > 0) {
            markdown += "### Key Points\n\n";
            for (const point of doc.summary.keyPoints) {
              markdown += `- ${point}\n`;
            }
            markdown += "\n";
          }

          if (doc.summary?.tldr) {
            markdown += "### TL;DR\n\n";
            markdown += `${doc.summary.tldr}\n\n`;
          } else if (doc.summaryText) {
            markdown += "### Summary\n\n";
            markdown += `${doc.summaryText}\n\n`;
          }
        } else {
          markdown += "*No summary available*\n\n";
        }

        markdown += "---\n\n";
      }

      // Report progress
      if (options?.onProgress && batches.length > 1) {
        const processed = (i + 1) * this.BATCH_SIZE;
        const currentProgress = Math.min(processed, documents.length);
        const progressPercent = Math.round(
          (currentProgress / documents.length) * 100,
        );
        options.onProgress(currentProgress, progressPercent);
      }

      // Small delay between batches
      if (batches.length > 1 && i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    return markdown;
  }

  /**
   * Generate CSV export data
   */
  static async generateCSV(
    documents: Document[],
    options?: ExportOptions,
  ): Promise<string> {
    const batches = this.createBatches(documents);
    let csv = "";

    // CSV headers
    const headers = [
      "id",
      "title",
      "url",
      "domain",
      "summaryText",
      "author",
      "publishedDate",
      "wordCount",
      "readingTime",
      "keyPoints",
      "tldr",
      "createdAt",
      "summarizedAt",
    ];
    csv += headers.join(",") + "\n";

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // Check for cancellation
      if (options?.signal?.aborted) {
        throw new Error("Export cancelled");
      }

      // Process batch
      for (const doc of batch) {
        const row = [
          this.escapeCsv(doc.id),
          this.escapeCsv(doc.title),
          this.escapeCsv(doc.url),
          this.escapeCsv(doc.domain),
          this.escapeCsv(doc.summaryText || ""),
          this.escapeCsv(doc.metadata.author || ""),
          this.escapeCsv(doc.metadata.publishedDate || ""),
          doc.metadata.wordCount.toString(),
          (doc.metadata.readingTime || "").toString(),
          this.escapeCsv(doc.summary?.keyPoints?.join("; ") || ""),
          this.escapeCsv(doc.summary?.tldr || ""),
          this.escapeCsv(doc.createdAt),
          this.escapeCsv(doc.summarizedAt || ""),
        ];
        csv += row.join(",") + "\n";
      }

      // Report progress
      if (options?.onProgress && batches.length > 1) {
        const processed = (i + 1) * this.BATCH_SIZE;
        const currentProgress = Math.min(processed, documents.length);
        const progressPercent = Math.round(
          (currentProgress / documents.length) * 100,
        );
        options.onProgress(currentProgress, progressPercent);
      }

      // Small delay between batches
      if (batches.length > 1 && i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    return csv;
  }

  /**
   * Escape CSV field value
   */
  private static escapeCsv(value: string): string {
    if (!value) return "";

    // If value contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }
}
