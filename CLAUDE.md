# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Briefcase is a Chrome side-panel extension that extracts and summarizes web page content using OpenAI, storing everything locally for privacy. The extension operates entirely in the user's browser with no cloud storage.

## Architecture

### Core Components

1. **Chrome Extension (Manifest V3)**
   - Side Panel UI (React/Preact + TypeScript)
   - Content Scripts for advanced text extraction
   - Background Service Worker for messaging
   - Local storage via `chrome.storage.local`

2. **Advanced Extraction Pipeline (>95% success rate)**
   - **Extraction Pipeline**: Unified fallback chain with performance metrics
   - **Site-Specific Extractors**: GitHub, Stack Overflow, Reddit, Twitter/X, Documentation sites
   - **SPA Detection**: Framework detection with DOM stability monitoring
   - **DOM Analysis**: Semantic HTML5, content density, visual hierarchy analysis
   - **Manual Selection Mode**: Interactive UI fallback with keyboard navigation
   - **Fallback Chain**: Site-specific → Readability → DOM analysis → Heuristic → Manual
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
   - `settings`: API key, model selection, theme preference, collapse states
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

**Important**: Always run lint and typecheck after implementing features to ensure code quality.

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
- **Preact Events**: Use `onInput` instead of `onChange` for input elements in Preact components
- **ReadableStream Testing**: Always mock ReadableStream properly in tests using `setupReadableStreamMock()` from test-utils
- **Memory Leaks**: Use WeakMap for DOM element event listeners, add MutationObserver for cleanup
- **Infinite Recursion**: Create separate internal methods when implementing timeout wrappers
- **Race Conditions**: Add navigation detection (popstate, beforeunload) in DOM monitoring

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
- Follow TDD: Write tests first, then implement functionality
- Use `setupReadableStreamMock()` from `src/test-utils/chrome-mocks.ts` for streaming tests
- Mock all SettingsService methods including `testApiKey` returning `{ success: true/false }`

## Project Structure

```
apps/extension/
├── sidepanel/          # Side panel UI components
│   ├── SidePanel.tsx   # Main orchestrator component
│   ├── EnhancedSettings.tsx  # Settings with API key validation flow
│   ├── StreamingSummarizer.tsx  # Supports autoStart prop for auto-summarization
│   └── DocumentViewer.tsx
├── background/         # Service worker
├── content/           # Content scripts
│   ├── extraction-pipeline.ts  # Unified extraction orchestration
│   ├── manual-selection.ts     # Interactive selection mode
│   └── extractor.ts            # Core extraction logic
├── lib/              # Shared utilities
│   ├── extraction/   # Advanced extraction features
│   │   ├── extractors/  # Site-specific extractors
│   │   ├── spa/        # SPA detection & DOM stability
│   │   └── dom/        # DOM analysis utilities
│   ├── document-repository.ts
│   ├── openai-provider.ts
│   └── settings-service.ts
├── src/test-utils/    # Testing utilities
│   ├── chrome-mocks.ts  # Chrome API and ReadableStream mocks
│   └── constants.ts
└── dist/             # Build output (gitignored)
```

## Recent Feature Implementations

### Performance Optimization (v3.0) - 2025-09-02

- **Bundle Size**: Reduced from 500KB target to 207.76KB actual (57.5% reduction)
- **Main Bundle**: Optimized to 61.8KB through comprehensive lazy loading
- **Lazy Loading**: Complete implementation for OpenAI provider (106KB), UI components, and extractors
- **Bundle Analysis**: Local analysis with `npm run analyze:bundle` and visualizer
- **Architecture**: Full documentation in `docs/ARCHITECTURE.md`
- **Rollback**: Feature flags in `rollback.config.json` for quick reversion

### Advanced Extraction Fallbacks (v2.0)

- **Success Rate**: Improved from 85% to >95% through intelligent fallback chains
- **Site-Specific Extractors**: Custom extractors for GitHub, Stack Overflow, Reddit, Twitter/X
- **SPA Support**: Framework detection (React, Angular, Vue) with DOM stability monitoring
- **Manual Selection**: Interactive fallback UI with keyboard navigation and accessibility

## Testing Setup Requirements

- Global window.matchMedia mock required in vitest.setup.ts for dark mode tests
- Use `setupMatchMediaMock()` from test-utils for component tests
- Mock chrome.tabs.onActivated for tab change detection tests

## Future Considerations

- Version 2 may migrate from `chrome.storage.local` to SQLite on OPFS for full-text search
- Potential chunking support for documents >12k characters
- Enhanced metadata extraction capabilities
- Recent summaries list view for quick access to past content
