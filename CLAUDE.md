# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Briefcase is a Chrome side-panel extension that extracts and summarizes web page content using OpenAI, storing everything locally for privacy. The extension operates entirely in the user's browser with no cloud storage.

## Architecture

### Core Components

1. **Chrome Extension (Manifest V3)**
   - Side Panel UI (React/Preact + TypeScript)
   - Content Script for text extraction
   - Background Service Worker for messaging
   - Local storage via `chrome.storage.local`

2. **Text Extraction Pipeline**
   - Primary: Mozilla Readability library
   - Fallback: Heuristic extraction for largest content blocks
   - DOM stability detection with MutationObserver
   - Minimum 800 characters for valid extraction

3. **OpenAI Integration**
   - OpenAI SDK v4 for API interactions
   - Streaming responses via ReadableStream API
   - API key validation using models.list() endpoint
   - Token counting and display during streaming
   - Configurable model (gpt-4o-mini default) and max tokens

4. **Storage Model**
   - `docs:index`: Array of document IDs (newest first, FIFO cap at 200)
   - `doc:<id>`: Document objects with rawText, summaryText, metadata
   - `settings`: API key, model selection, max tokens preferences
   - No cloud persistence - all data in `chrome.storage.local`

## Key Data Structures

### ExtractedContent Interface

```typescript
interface ExtractedContent {
  text: string;
  charCount: number;
  metadata?: {
    title?: string;
    url?: string;
    extractedAt?: string;
    author?: string;
    publishedDate?: string;
    wordCount?: number;
  };
  error?: string;
}
```

### Document Interface

```typescript
interface Document {
  id: string;
  url: string;
  title: string;
  domain: string;
  rawText: string;
  summaryText?: string;
  metadata?: {
    author?: string;
    publishedDate?: string;
    wordCount?: number;
  };
  createdAt: string;
  summarizedAt?: string;
}
```

## Development Commands

### Build & Development

```bash
npm install          # Install dependencies
npm run build        # Build extension for production
npm run dev          # Start development with hot reload
```

### Testing & Quality

```bash
npm run test         # Run test suite
npm run lint         # Run linter
npm run typecheck    # TypeScript type checking
npm run test:coverage # Run tests with coverage report
```

### Extension Installation

1. Build: `npm run build`
2. Open `chrome://extensions`
3. Enable Developer mode
4. Load unpacked from `apps/extension/dist`

## Key Technical Decisions

- **Manifest V3**: Required for Chrome side panel support
- **Permissions**: Minimal set - `activeTab`, `scripting`, `storage` only
- **Build Tool**: Vite + CRXJS for extension bundling
- **UI Framework**: Preact for side panel (smaller bundle size)
- **Text Extraction**: Mozilla Readability with custom fallback
- **Input Cap**: ~12k characters for v1 (no chunking)
- **Streaming**: ReadableStream API for real-time OpenAI responses
- **Testing**: Vitest with React Testing Library

## Common Pitfalls to Avoid

- **Chrome API Destructuring**: Use safe array access instead of destructuring
  ```typescript
  // ❌ Wrong: const [activeTab] = await chrome.tabs.query({...})
  // ✅ Right: const tabs = await chrome.tabs.query({...}); const activeTab = tabs?.[0];
  ```
- **OpenAI Validation**: Use `models.list()` not `chat.completions.create()` for API key validation
- **Type Safety**: Ensure metadata properties are optional to handle partial data extraction

## Privacy & Security Constraints

- All data stored locally in `chrome.storage.local`
- API keys stored locally, never logged or transmitted
- No telemetry, analytics, or third-party beacons
- First-use banner explaining cloud API usage
- "Delete all data" must clear everything

## Error Handling Requirements

- Fail fast on unsupported pages (PDFs, iframes, app-like pages)
- Clear user-friendly error messages
- Retry capability for transient failures
- 3-second timeout for DOM stability detection

## Testing Approach

- Integration tests in `SidePanel.integration.test.tsx` cover end-to-end flows
- Unit tests for individual components and utilities
- Mock Chrome APIs using vi.mock for storage, tabs, runtime
- Test streaming responses with mock ReadableStream implementations

## Project Structure

```
apps/extension/
├── sidepanel/          # Side panel UI components
│   ├── SidePanel.tsx   # Main orchestrator component
│   ├── EnhancedSettings.tsx
│   ├── StreamingSummarizer.tsx
│   └── DocumentViewer.tsx
├── background/         # Service worker
├── content/           # Content scripts
├── lib/              # Shared utilities
│   ├── document-repository.ts
│   └── openai-provider.ts
└── dist/             # Build output (gitignored)
```

## Future Considerations

- Version 2 may migrate from `chrome.storage.local` to SQLite on OPFS for full-text search
- Potential chunking support for documents >12k characters
- Enhanced metadata extraction capabilities
