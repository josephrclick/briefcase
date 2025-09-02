# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-09-01-advanced-extraction-fallbacks/spec.md

> Created: 2025-09-01
> Version: 1.0.0

## Technical Requirements

### Site-Specific Extractors

- **Extractor Registry Pattern**: Implement a registry system mapping domains/patterns to specific extraction strategies
- **Platform Extractors**: Create dedicated extractors for:
  - GitHub (issues, PRs, discussions, code views)
  - Stack Overflow (questions, answers, comments)
  - Reddit (posts, comments, threads)
  - Twitter/X (threads, posts)
  - Documentation sites (detect common doc frameworks)
- **Extractor Interface**: Each extractor implements `IContentExtractor` with methods:
  - `canHandle(url: string, doc: Document): boolean`
  - `extract(doc: Document): ExtractedContent`
  - `getPriority(): number`

### Enhanced SPA Detection

- **Dynamic Content Detection**:
  - Monitor XHR/Fetch requests to detect async content loading
  - Use MutationObserver with intelligent debouncing (300ms)
  - Implement progressive timeout strategy: 1s → 3s → 5s max
- **Content Stability Verification**:
  - Track DOM mutations over 500ms windows
  - Require 2 consecutive stable windows before extraction
  - Fallback to immediate extraction after 5s timeout

### Improved DOM Analysis

- **Semantic Element Priority**:
  - Prioritize: `<main>`, `<article>`, `[role="main"]`, `[role="article"]`
  - Score containers by text density (text length / HTML length ratio)
  - Filter out navigation, footer, sidebar patterns
- **Content Scoring Algorithm**:
  - Base score: text length × paragraph count
  - Bonus for: headings, lists, semantic HTML5 elements
  - Penalty for: excessive links, ads patterns, short text blocks
  - Threshold: minimum score of 100 for valid extraction

### Manual Selection Mode

- **Content Script Integration**:
  - Inject selection overlay on activation
  - Highlight hoverable content regions with semi-transparent borders
  - Support click-to-select and drag-to-select interactions
- **Selection UI Components**:
  - Floating toolbar with "Confirm Selection" and "Cancel" buttons
  - Visual feedback showing selected text preview
  - Keyboard shortcuts: ESC to cancel, Enter to confirm
- **Communication Flow**:
  - Content script ↔ Background worker messaging
  - Selection data passed via `chrome.runtime.sendMessage`
  - Extracted text returned to side panel

### Performance Optimization

- **Lazy Loading**: Load site-specific extractors only when needed
- **Caching**: Cache extraction results for 5 minutes (URL-keyed)
- **Worker Thread**: Move heavy DOM analysis to Web Worker when possible
- **Memory Management**: Clear extraction cache when storage exceeds 10MB

## Approach

### Implementation Strategy

1. **Phase 1: Site-Specific Extractors**
   - Create extractor registry and base interface
   - Implement GitHub and Stack Overflow extractors first
   - Add comprehensive test coverage for each extractor

2. **Phase 2: Enhanced SPA Detection**
   - Upgrade existing MutationObserver implementation
   - Add XHR/Fetch monitoring capability
   - Implement progressive timeout logic

3. **Phase 3: Manual Selection Mode**
   - Create content script overlay system
   - Build selection UI components
   - Integrate with existing extraction pipeline

4. **Phase 4: Performance & Polish**
   - Add caching layer and lazy loading
   - Optimize DOM analysis algorithms
   - Performance testing and memory management

### Code Organization

```
lib/extraction/
├── registry/
│   ├── ExtractorRegistry.ts
│   └── IContentExtractor.ts
├── extractors/
│   ├── GitHubExtractor.ts
│   ├── StackOverflowExtractor.ts
│   ├── RedditExtractor.ts
│   └── TwitterExtractor.ts
├── spa/
│   ├── SPADetector.ts
│   └── ContentStabilizer.ts
├── dom/
│   ├── DOMAnalyzer.ts
│   └── ContentScorer.ts
└── manual/
    ├── SelectionOverlay.ts
    └── SelectionUI.ts
```

## External Dependencies

- **@mozilla/readability** - Already in use, no change needed
- **New dependency: `url-pattern`** (v1.0.3) - For matching URL patterns to extractors
  - **Justification**: Lightweight pattern matching for site-specific extractor routing
  - **Size**: ~2KB minified
  - **Alternative considered**: Manual regex patterns (more error-prone)
