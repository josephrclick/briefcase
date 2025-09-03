# Briefcase Extension Architecture

## Overview

Briefcase is a performance-optimized Chrome extension that extracts and summarizes web content using AI, with a focus on minimal bundle size and fast loading times. The extension uses modern web technologies and intelligent code splitting to achieve a main bundle size of just 61.8 KB (12.4% of the 500 KB target).

## Architecture Principles

### 1. Performance First

- **Lazy Loading**: Non-critical components load on-demand
- **Code Splitting**: Separate bundles for different features
- **Tree Shaking**: Eliminate unused code at build time
- **Minimal Dependencies**: Carefully chosen, lightweight libraries

### 2. Privacy by Design

- **Local Storage Only**: All data stored in `chrome.storage.local`
- **No Telemetry**: No tracking or analytics without explicit opt-in
- **API Key Security**: Keys stored locally, never transmitted

### 3. Progressive Enhancement

- **Graceful Degradation**: Core features work without advanced extractors
- **Fallback Chains**: Multiple extraction methods ensure reliability
- **Error Recovery**: Smart retry mechanisms for transient failures

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Side Panel  │  │   Content    │  │  Background  │      │
│  │     (UI)     │  │   Scripts    │  │   Service    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼──────┐      │
│  │            Chrome Extension APIs                   │      │
│  │  (storage, tabs, scripting, runtime)               │      │
│  └────────────────────────────────────────────────────┘      │
│                                                               │
│  ┌────────────────────────────────────────────────────┐      │
│  │               Lazy-Loaded Modules                  │      │
│  ├────────────────┬───────────────┬──────────────────┤      │
│  │ OpenAI Provider│  UI Components │    Extractors    │      │
│  │   (106 KB)     │   (15-20 KB)  │   (30-50 KB ea)  │      │
│  └────────────────┴───────────────┴──────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Core Components (Main Bundle - 61.8 KB)

#### 1. Side Panel UI

- **Framework**: Preact (3KB alternative to React)
- **Entry Point**: `sidepanel/index.tsx`
- **Core Components**:
  - `SidePanel.tsx`: Main orchestrator component
  - `StreamingSummarizer.tsx`: Real-time summarization UI
  - `RecentList.tsx`: Document history browser

#### 2. Content Scripts

- **Entry Point**: `content/content-script.ts`
- **Core Modules**:
  - `ContentExtractor`: Basic text extraction using Readability
  - `ExtractionPipeline`: Orchestrates extraction strategies
  - `DOMAnalyzer`: Semantic HTML analysis

#### 3. Background Service Worker

- **Entry Point**: `background/service-worker.ts`
- **Responsibilities**:
  - Message routing between components
  - API key validation
  - Extension lifecycle management

### Lazy-Loaded Components

#### 1. OpenAI Provider (106 KB)

```typescript
// Loaded only when summarization is needed
const { LazyOpenAIProvider } = await import("./openai-provider-lazy");
```

- OpenAI SDK and dependencies
- Streaming response handling
- Token counting utilities

#### 2. Enhanced Settings (15.6 KB)

```typescript
// Loaded when settings tab is accessed
const { LazyEnhancedSettings } = await import("./LazyEnhancedSettings");
```

- API key management
- Export functionality
- Advanced configuration

#### 3. Site-Specific Extractors (30-50 KB each)

```typescript
// Loaded based on domain detection
const extractorMap = {
  "github.com": () => import("./extractors/github"),
  "reddit.com": () => import("./extractors/reddit"),
  "stackoverflow.com": () => import("./extractors/stackoverflow"),
};
```

## Data Flow Architecture

### 1. Content Extraction Flow

```
User clicks "Extract" → Content Script injection
  → ExtractionPipeline.extract()
    → Site-specific extractor (if applicable)
    → Readability fallback
    → DOM analysis fallback
    → Manual selection (if all fail)
  → Send extracted content to Side Panel
```

### 2. Summarization Flow

```
Extracted content ready → User clicks "Summarize"
  → Lazy load OpenAI provider
  → Stream API request
  → Display tokens in real-time
  → Save to DocumentRepository
```

### 3. Storage Architecture

```typescript
interface StorageSchema {
  "docs:index": string[]; // Document IDs (FIFO, max 200)
  "doc:<id>": Document; // Individual documents
  settings: SettingsData; // User preferences
  "performance-metrics": Metrics[]; // Performance tracking
}
```

## Performance Optimizations

### Bundle Size Management

#### Initial Load (61.8 KB)

- Core UI components
- Basic extraction logic
- Essential utilities

#### Deferred Loading (~438 KB saved)

- OpenAI SDK: 106 KB
- Site extractors: 150-200 KB
- Advanced UI: 50-100 KB
- Development tools: 50+ KB

### Loading Strategy

```typescript
// Example: Lazy loading with prefetch hint
const loadOpenAIProvider = () => {
  // Prefetch hint for likely next action
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => {
      import(/* webpackPrefetch: true */ "./openai-provider-lazy");
    });
  }
};
```

### Performance Monitoring

```typescript
// Track critical metrics
performanceMonitor.startExtraction();
// ... extraction logic
const duration = performanceMonitor.endExtraction();

// Thresholds
const TARGETS = {
  extraction: 3000, // 3 seconds
  firstToken: 1000, // 1 second
  bundleLoad: 500, // 500ms per chunk
};
```

## Build Configuration

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    preact(),
    crx({ manifest }),
    visualizer({
      filename: "dist/bundle-stats.html",
      template: "treemap",
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          openai: ["openai"],
          "ui-heavy": ["@radix-ui/react-tabs"],
        },
      },
    },
  },
});
```

### TypeScript Configuration

- Strict mode enabled
- Module resolution: bundler
- Target: ES2020 (Chrome 114+ support)

## Development Guidelines

### Adding New Features

1. **Assess Bundle Impact**

   ```bash
   npm run analyze:bundle
   ```

2. **Implement Lazy Loading**

   ```typescript
   const LazyFeature = lazy(
     () => import(/* webpackChunkName: "feature" */ "./Feature"),
   );
   ```

3. **Add Performance Tracking**
   ```typescript
   await trackPerformance("feature-operation", async () => {
     // Feature logic
   });
   ```

### Code Organization Patterns

#### Provider Pattern

```typescript
abstract class SummaryProvider {
  abstract summarize(text: string): ReadableStream<string>;
  abstract validateApiKey(): Promise<boolean>;
}

class LazyProviderFactory {
  static async getProvider(type: string): Promise<SummaryProvider> {
    switch (type) {
      case "openai":
        const { OpenAIProvider } = await import("./providers/openai");
        return new OpenAIProvider();
    }
  }
}
```

#### Extractor Registry Pattern

```typescript
class ExtractorRegistry {
  private loaders: Map<string, () => Promise<IExtractor>>;

  async getExtractor(url: string): Promise<IExtractor | null> {
    for (const [domain, loader] of this.loaders) {
      if (url.includes(domain)) {
        return await loader();
      }
    }
    return null;
  }
}
```

## Testing Strategy

### Unit Tests

- Component isolation with mocked dependencies
- Chrome API mocking via `vi.mock()`
- Streaming response simulation

### Integration Tests

- Full user flow testing
- Cross-component communication
- Storage persistence verification

### Performance Tests

```typescript
describe("Performance Requirements", () => {
  it("should load main bundle under 100KB", () => {
    expect(mainBundleSize).toBeLessThan(100 * 1024);
  });

  it("should extract content within 3 seconds", async () => {
    const start = performance.now();
    await extractContent(testUrl);
    expect(performance.now() - start).toBeLessThan(3000);
  });
});
```

## Deployment & Monitoring

### CI/CD Pipeline

1. **Build & Test**: On every commit
2. **Bundle Analysis**: Track size changes
3. **Performance Metrics**: Monitor thresholds
4. **Release**: Automated Chrome Web Store deployment

### Production Monitoring

- Bundle size tracking in GitHub Actions
- Performance metrics via `performance-monitor.ts`
- Error tracking with source maps
- User feedback collection (opt-in)

## Future Optimizations

### Planned Improvements

1. **Web Workers**: Offload extraction processing
2. **WASM Modules**: Faster text processing
3. **Service Worker Caching**: Improved load times
4. **Partial Hydration**: Faster initial render

### Potential Features

- Multiple LLM providers (Claude, Gemini)
- Full-text search with SQLite/OPFS
- Collaborative features
- Export to various formats

## Security Considerations

### API Key Management

- Stored in `chrome.storage.local`
- Never included in logs or errors
- Validated before use
- Rotation reminders

### Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'none'"
  }
}
```

### Permissions Model

- Minimal permissions requested
- Active tab access only
- No broad host permissions
- User consent for downloads

## Conclusion

The Briefcase extension architecture prioritizes performance through intelligent code splitting and lazy loading, achieving a remarkably small main bundle while maintaining full functionality. The modular design allows for easy extension and optimization, while the comprehensive monitoring ensures performance targets are maintained as the codebase evolves.
