# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-31-test-resolution-sprint/spec.md

## Technical Requirements

### API Key Format Updates

**Current Issue**: Tests use mock keys like `sk-test123456789abcdefghijklmnop` (32 chars) which fail new 40+ char validation

**Required Changes**:

- Update all mock API keys to format: `sk-test1234567890abcdefghijklmnopqrstuvwxyz123456` (50+ chars)
- Alternatively use: `sk-proj-test1234567890abcdefghijklmnopqrstuvwxyz` for project-scoped keys
- Ensure consistency across all test files

**Affected Files**:

- `lib/openai-provider.test.ts` (26 failures)
- `lib/settings-service.test.ts` (5 failures)
- `sidepanel/Settings.test.tsx` (4 failures)
- `sidepanel/SidePanel.integration.test.tsx` (10 failures)
- All other test files using mock API keys

### Validation Assertion Updates

**Current Issue**: Tests expect validation to pass with 20+ character keys

**Required Changes**:

```typescript
// Old expectation
expect(validateApiKeyFormat("sk-test123")).toBe(true); // 20+ chars

// New expectation
expect(
  validateApiKeyFormat("sk-test1234567890abcdefghijklmnopqrstuvwxyz123456"),
).toBe(true); // 40+ chars
```

### Chrome API Mock Fixes

**Current Issue**: Integration tests fail with "No active tab found"

**Required Fix**:

```typescript
// Ensure chrome.tabs.query is properly mocked
vi.mocked(chrome.tabs.query).mockResolvedValue([
  {
    id: 1,
    url: "https://example.com",
    title: "Test Page",
    active: true,
    // ... other required tab properties
  },
]);
```

### Streaming Cancellation Fixes

**Current Issue**: AbortController throws DOMException in JSDOM environment

**Required Fix**:

- Properly mock AbortController and AbortSignal
- Handle cleanup in test teardown
- Consider using fake timers for streaming tests

### Test Data Consistency

**Standard Mock API Key**:

```typescript
const MOCK_API_KEY = "sk-test1234567890abcdefghijklmnopqrstuvwxyz123456";
```

**Project-Scoped Mock API Key**:

```typescript
const MOCK_PROJECT_KEY = "sk-proj-test1234567890abcdefghijklmnopqrstuvwxyz";
```

## Implementation Strategy

### Phase 1: Global Test Constants

1. Create a shared test constants file with valid mock keys
2. Export standardized mock data for reuse

### Phase 2: Systematic Updates

1. Update `lib/openai-provider.test.ts` first (most failures)
2. Update `lib/settings-service.test.ts` validation tests
3. Fix integration test Chrome API mocks
4. Resolve streaming test issues

### Phase 3: Verification

1. Run each test file individually to verify fixes
2. Run full test suite to ensure no regressions
3. Verify in CI environment if available

## Testing Approach

- Fix tests incrementally, one file at a time
- Run tests after each fix to verify resolution
- Use `npm run test -- --run` for faster feedback
- Check for any new failures introduced by fixes
