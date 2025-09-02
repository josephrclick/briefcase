# Briefcase Extension Architecture

## Overview

The Briefcase Chrome extension follows a modular, layered architecture designed for maintainability, testability, and performance optimization through lazy loading.

## Architecture Principles

1. **Separation of Concerns** - Each module has a single, well-defined responsibility
2. **Dependency Inversion** - Depend on abstractions, not concrete implementations
3. **Interface Segregation** - Modules expose minimal, focused interfaces
4. **Loose Coupling** - Modules communicate through well-defined contracts
5. **High Cohesion** - Related functionality is grouped within modules
6. **Lazy Loading** - Load heavy dependencies only when needed
7. **Progressive Enhancement** - Core functionality works without optional modules

## Module Layers

### 1. UI Layer (`sidepanel/*`)

**Responsibility**: User interface and interaction

- React/Preact components
- State management
- User event handling
- Display of extraction and summarization results

**Key Components**:

- `SidePanel.tsx` - Main orchestrator
- `StreamingSummarizer.tsx` - Streaming summary display
- `EnhancedSettings.tsx` - Settings management
- `DocumentViewer.tsx` - Document display

### 2. Provider Layer (`lib/providers/*`, `lib/openai-*`)

**Responsibility**: Summary generation and AI integration

- Abstract provider interfaces
- OpenAI implementation (lazy-loaded)
- Future provider support ready
- Streaming and complete summarization

**Key Components**:

- `lib/providers/interfaces.ts` - Provider contracts
- `lib/openai-provider.ts` - OpenAI implementation
- `lib/openai-provider-lazy.ts` - Lazy loading wrapper

### 3. Extraction Layer (`content/*`, `lib/extraction/*`)

**Responsibility**: Content extraction from web pages

- Extraction pipeline with fallback strategies
- Site-specific extractors
- SPA detection and handling
- DOM analysis

**Key Components**:

- `content/extraction-pipeline.ts` - Main pipeline
- `lib/extraction/interfaces.ts` - Extraction contracts
- `lib/extraction/extractors/*` - Site-specific extractors
- `lib/extraction/spa/*` - SPA detection

### 4. Storage Layer (`lib/document-repository.ts`, `lib/settings-service.ts`)

**Responsibility**: Data persistence and settings

- Chrome storage API wrapper
- Document CRUD operations
- Settings management
- Storage quota management

**Key Components**:

- `lib/document-repository.ts` - Document storage
- `lib/settings-service.ts` - Settings management

### 5. Communication Layer (`background/*`, `content/*`)

**Responsibility**: Cross-context messaging

- Chrome extension messaging
- Content script injection
- Tab event handling
- Message routing

**Key Components**:

- `background/message-handlers.ts` - Message processing
- `content/index.ts` - Content script entry

## Module Communication

### Import Boundaries

Modules follow strict import rules to maintain clean separation:

```typescript
// ✅ Good: UI imports interfaces
import { ISummaryProvider } from "../lib/providers/interfaces";

// ❌ Bad: UI imports concrete implementation
import { OpenAIProvider } from "../lib/openai-provider";

// ✅ Good: Lazy loading for performance
const provider = await import("../lib/openai-provider-lazy");
```

### Communication Patterns

1. **Message Passing** - Cross-context communication via Chrome APIs
2. **Direct Import** - Same-context modules via interfaces
3. **Dynamic Import** - Lazy loading for performance
4. **Event Emitters** - Decoupled component communication

## Performance Optimization Strategy

### Current Bundle Analysis (Baseline)

- **Total Size**: 215KB (43% of 500KB target)
- **Core**: 153.3KB
- **Content Script**: 42.3KB
- **CSS**: 17.8KB

### Optimization Approach

1. **Phase 1: Architecture Foundation** ✅
   - Performance baseline established
   - Provider lazy loading prepared
   - Extraction/provider separation complete
   - Module boundaries defined

2. **Phase 2: Quick Wins** (Next)
   - Lazy load manual selection UI (~50-100KB)
   - Dynamic site-specific extractors (~30-50KB each)

3. **Phase 3: Extended Optimization**
   - Split non-critical UI components
   - Lazy load OpenAI dependencies
   - Implement extractor registry

4. **Phase 4: Monitoring**
   - Bundle size tracking
   - Performance metrics
   - Automated alerts

## Development Guidelines

### Adding New Features

1. **Identify the appropriate layer** for your feature
2. **Define interfaces first** before implementation
3. **Follow import boundaries** - check ESLint rules
4. **Consider lazy loading** for large dependencies
5. **Write tests** at the interface level

### Testing Strategy

- **Unit Tests** - Test modules in isolation via interfaces
- **Integration Tests** - Test cross-module communication
- **E2E Tests** - Test complete user flows
- **Performance Tests** - Monitor bundle size changes

### Code Organization

```
apps/extension/
├── sidepanel/           # UI Layer
├── lib/
│   ├── providers/       # Provider Layer
│   ├── extraction/      # Extraction utilities
│   ├── architecture/    # Architecture definitions
│   └── *.ts            # Core services
├── content/            # Content scripts
├── background/         # Service worker
└── scripts/            # Build tools
```

## ESLint Configuration

Module boundaries are enforced via ESLint rules in `.eslintrc.boundaries.js`:

- Prevents UI from importing concrete providers
- Prevents providers from importing UI or extraction
- Prevents extraction from importing providers or UI
- Ensures storage layer independence
- Enforces interface usage over implementations

## Future Considerations

### Provider Abstraction

When adding a second provider:

1. Implement `ISummaryProvider` interface
2. Register in provider factory
3. Update UI to support provider selection
4. Maintain lazy loading pattern

### Extraction Enhancement

For new extraction methods:

1. Implement `IContentExtractor` interface
2. Register in extraction pipeline
3. Define priority and fallback behavior
4. Consider lazy loading for large extractors

### Bundle Size Management

- Monitor with `npm run analyze:bundle`
- Target: ~500KB total
- Current: 215KB (285KB headroom)
- Focus on sustainable patterns over aggressive optimization

## Commands

```bash
# Analyze bundle size
npm run analyze:bundle

# Run tests
npm test

# Type checking
npm run typecheck

# Lint with boundaries
npm run lint
```

## References

- [Module Boundaries](./lib/architecture/module-boundaries.ts)
- [Provider Interfaces](./lib/providers/interfaces.ts)
- [Extraction Interfaces](./lib/extraction/interfaces.ts)
- [Performance Baseline](../../.agent-os/specs/2025-09-02-performance-optimization/baseline-report.md)
