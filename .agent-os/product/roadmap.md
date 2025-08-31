# Product Roadmap

## Phase 1: Core MVP

**Goal:** Deliver a functional Chrome extension that reliably extracts and summarizes web articles with local storage
**Success Criteria:** 95% success rate on top 50 news/blog sites, <3 second extraction time, zero data loss

### Features

- [x] Chrome extension scaffold with Manifest V3 setup - Basic extension structure and permissions `S`
- [x] Side panel UI with React/Preact components - Main interface for user interaction `M`
- [x] Content extraction using Readability - Reliable article text extraction from web pages `M`
- [x] OpenAI integration with streaming - API connection with token streaming display `M`
- [x] Local storage repository implementation - chrome.storage.local with FIFO retention `M`
- [x] Error handling for common failure modes - Friendly messages for PDFs, iframes, loading pages `S`
- [x] Settings page with API key management - Secure storage and validation of OpenAI key `S`

### Dependencies

- Chrome 114+ for Side Panel API support
- OpenAI API account and key
- Vite + CRXJS build pipeline

## Phase 2: Enhanced User Experience

**Goal:** Polish the user experience with customization options and improved extraction reliability
**Success Criteria:** <5% failure rate on supported pages, 90% user satisfaction score

### Features

- [x] Summary customization controls - Length (Brief/Medium) and Style (Bullets/Plain) options `S`
- [ ] Recent summaries list - Quick access to last 20 items with search `M`
- [x] Privacy banner and onboarding - First-use disclosure and feature introduction `S`
- [x] Retry mechanism for failures - Smart retry with timeout detection `S`
- [ ] Advanced extraction fallbacks - Custom extractors for edge cases `L`
- [x] Delete all data functionality - Complete local data removal option `XS`
- [ ] Export summaries feature - Download summaries as JSON/Markdown `S`

### Dependencies

- Completion of Phase 1 core features
- User feedback from initial testing
- A/B testing framework for UI variants

## Phase 3: Scale and Polish

**Goal:** Optimize performance, add power user features, and prepare for public release
**Success Criteria:** <500KB bundle size, <1 second time to first summary token, Chrome Web Store approval

### Features

- [ ] Performance optimization - Code splitting, lazy loading, bundle size reduction `L`
- [ ] Keyboard shortcuts - Power user shortcuts for common actions `S`
- [ ] Multiple LLM provider support - Add Claude, Gemini, local models `L`
- [ ] Full-text search in summaries - Search across all stored summaries `M`
- [ ] Summary collections/tags - Organize summaries by topic or project `M`
- [ ] Chrome Web Store listing - Store page, screenshots, privacy policy `S`
- [ ] Analytics opt-in - Optional usage analytics for improvement `M`

### Dependencies

- Performance profiling data
- Provider API documentation
- Chrome Web Store developer account
- Privacy policy and terms of service
