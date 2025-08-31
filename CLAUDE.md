# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Briefcase is a Chrome side-panel extension that extracts and summarizes web page content using OpenAI, storing everything locally for privacy. The extension operates entirely in the user's browser with no cloud storage.

## Architecture

### Core Components

1. **Chrome Extension (Manifest V3)**
   - Side Panel UI (React + TypeScript)
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

5. **Component Structure**
   - `SidePanel.tsx`: Main orchestrator component
   - `EnhancedSettings.tsx`: Settings management with API key validation
   - `StreamingDisplay.tsx`: Real-time token streaming UI
   - `PrivacyBanner.tsx`: First-use privacy disclosure
   - `openai-provider.ts`: OpenAI API client wrapper

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
- **UI Framework**: React for side panel (TypeScript + hooks)
- **Text Extraction**: Mozilla Readability with custom fallback
- **Input Cap**: ~12k characters for v1 (no chunking)
- **Streaming**: ReadableStream API for real-time OpenAI responses
- **Testing**: Vitest with React Testing Library (~95% coverage)

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

## Common Pitfalls to Avoid

- **Chrome API Destructuring**: Use safe array access instead of destructuring
  ```typescript
  // ❌ Wrong: const [activeTab] = await chrome.tabs.query({...})
  // ✅ Right: const tabs = await chrome.tabs.query({...}); const activeTab = tabs?.[0];
  ```
- **OpenAI Validation**: Use `models.list()` not `chat.completions.create()` for API key validation
- **Test Mocking**: Chrome APIs need proper mocking in test environment
- **Background Script**: Must initialize message handlers on startup

## Testing Approach

- Integration tests in `SidePanel.integration.test.tsx` cover end-to-end flows
- Unit tests for individual components and utilities
- Mock Chrome APIs using vi.mock for storage, tabs, runtime
- Test streaming responses with mock ReadableStream implementations

## Future Migration Path

Version 2 will migrate from `chrome.storage.local` to SQLite on OPFS for full-text search. The migration should:

1. Read all `docs:index` and `doc:*` entries
2. Bulk insert into SQLite
3. Set `migratedV2=true` flag
4. Optionally clear old storage keys
