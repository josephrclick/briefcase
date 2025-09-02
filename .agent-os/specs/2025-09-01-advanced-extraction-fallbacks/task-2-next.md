# Task 2: SPA Detection - Next Steps Guide

## Current Status (57% Complete)

### ✅ Completed Components

- **DOM Stability Monitor** (`dom-stability-monitor.ts`) - Fully implemented with mutation tracking
- **Framework Detector** (`framework-detector.ts`) - Detects React, Vue, Angular, Next.js, Svelte, Ember
- **SPA Detector** (`spa-detector.ts`) - Main orchestrator with network monitoring
- **Test Suite** (`spa-detector.test.ts`) - Comprehensive tests written but need mock fixes

### ⚠️ Critical Issues to Fix First

1. **Test Mocks Not Working**
   - Tests are failing because mocks aren't properly intercepting the actual class imports
   - The `vi.mock()` calls need to be hoisted or the mock implementations need adjustment
   - Consider using manual mocks in `__mocks__` directory if auto-mocking continues to fail

2. **NetworkMonitor XHR Patching**
   - The XHR prototype patching in `spa-detector.ts:225-238` needs refinement
   - Must preserve original XHR open method properly before patching

### 🔄 Remaining Subtasks

#### Task 2.4: Content Loading Indicators

**What needs implementation:**

- Add progress callback to `waitForContent()` method
- Create `LoadingProgress` interface with stages: detecting, waiting, stabilizing, complete
- Emit progress events that UI can subscribe to
- Consider adding estimated time remaining based on framework type

#### Task 2.5: Retry Logic

**What needs implementation:**

- Add retry mechanism to `waitForContent()` when stability detection fails
- Implement exponential backoff for retries
- Add max retry count (suggest 3 attempts)
- Track failure reasons: timeout vs instability vs network errors

#### Task 2.7: Fix and Verify Tests

**What needs fixing:**

- Mock setup in `spa-detector.test.ts` needs proper initialization
- Consider splitting tests into separate files for each class
- Add integration tests that don't use mocks to verify actual functionality

### 📝 Integration Points

1. **Connect to ContentExtractor**
   - The SPA detector needs to be integrated into the main extraction pipeline
   - Add SPA detection before content extraction in `content/extractor.ts`
   - Use detected framework to optimize extraction timing

2. **UI Feedback Integration**
   - Loading indicators need to connect to the SidePanel component
   - Add progress state to extraction workflow
   - Show framework detection results in UI (optional enhancement)

### 🎯 Quick Win Opportunities

1. **Simple Retry Implementation** (30 mins)

```typescript
async waitForContentWithRetry(doc: Document, options: ContentWaitOptions, maxRetries = 3): Promise<ContentWaitResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await this.waitForContent(doc, options)
    if (result.stable) return result

    if (attempt < maxRetries) {
      await this.delay(1000 * attempt) // Exponential backoff
    }
  }
  return { stable: false, timedOut: true, timeElapsed: 0 }
}
```

2. **Fix Test Mocks** (45 mins)

- Move mock implementations to `beforeEach` blocks
- Or create `__mocks__` directory with manual mocks
- Ensure `vi.clearAllMocks()` is called in `afterEach`

### 🚨 Watch Out For

1. **Memory Leaks**
   - MutationObserver must be disconnected in all code paths
   - NetworkMonitor must restore original fetch/XHR methods
   - Clear all timers on cleanup

2. **Browser Compatibility**
   - MutationObserver options may vary across browsers
   - Some framework detection signals might not work in all contexts
   - Test in Chrome, Edge, and Firefox

3. **Performance Impact**
   - DOM monitoring can be expensive on large pages
   - Consider sampling mutations instead of processing all
   - Add performance metrics to track overhead

### 📊 Success Metrics

When complete, Task 2 should:

- Detect SPAs with >90% accuracy
- Wait appropriate time for content (not too short, not too long)
- Provide clear progress feedback to users
- Handle failures gracefully with retries
- Pass all 28 tests in `spa-detector.test.ts`

### 🔗 Related Files

- `/apps/extension/lib/extraction/spa/` - All SPA detection code
- `/apps/extension/content/extractor.ts` - Main extraction pipeline to integrate with
- `/apps/extension/sidepanel/SidePanel.tsx` - UI component for progress feedback

## Recommended Next Actions

1. **Fix the test mocks** - Can't verify correctness without passing tests
2. **Implement retry logic** - Simple addition with high value
3. **Add basic progress callbacks** - Even simple "waiting..." feedback helps UX
4. **Integration test** - Manually test on React/Vue/Angular sites
5. **Connect to main pipeline** - Make it actually work in the extension

Good luck! The foundation is solid - just needs these finishing touches.
