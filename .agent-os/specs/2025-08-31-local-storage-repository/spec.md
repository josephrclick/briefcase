# Spec Requirements Document

> Spec: Local Storage Repository
> Created: 2025-08-31

## Overview

Implement a local storage repository system that persists summarized documents in chrome.storage.local with FIFO retention at 200 documents. This feature enables users to access their summarization history, manage saved content, and ensures the extension maintains a functional archive without exceeding browser storage limits.

## User Stories

### Automatic Document Persistence

As a knowledge worker, I want my summarized articles to be automatically saved, so that I can reference them later without having to re-summarize.

When I summarize a web article, the extension should automatically save both the extracted text and the generated summary to local storage. The document should appear in my recent documents list immediately, showing the title, domain, date, and summary preview. I should be able to view the full summary and original text at any time.

### Storage Management

As a frequent user, I want the extension to automatically manage storage space, so that I don't have to worry about hitting browser storage limits.

The extension should maintain up to 200 recent documents using a FIFO (First In, First Out) retention policy. When the 201st document is saved, the oldest document should be automatically removed. This ensures consistent performance and prevents storage overflow while keeping my most recent and relevant summaries accessible.

### Document History Access

As a researcher, I want to browse and search my saved summaries, so that I can quickly find previously summarized content.

The recent documents list should show my saved summaries in reverse chronological order (newest first). Each entry should display the article title, source domain, summarization date, and a preview of the key points. I should be able to click on any document to view the full summary and original extracted text.

## Spec Scope

1. **Document Storage Service** - Core service class that handles all chrome.storage.local operations for documents
2. **FIFO Retention Logic** - Automatic removal of oldest documents when exceeding 200 document limit
3. **Document Index Management** - Maintain docs:index array for efficient document listing and ordering
4. **Integration with Summarization Flow** - Automatic saving after successful summarization completion
5. **Recent Documents UI Update** - Replace mock data with real storage-backed document listing

## Out of Scope

- Full-text search functionality (planned for v2 with SQLite)
- Document export/import features
- Cloud synchronization or backup
- Document categorization or tagging
- Manual document editing capabilities

## Expected Deliverable

1. Documents are automatically saved to chrome.storage.local after summarization with proper doc:<id> keys
2. The recent documents list displays real saved documents instead of mock data
3. Storage automatically maintains exactly 200 documents using FIFO retention when limit is exceeded
