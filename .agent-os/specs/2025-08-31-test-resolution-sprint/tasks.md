# Spec Tasks

## Tasks

- [x] 1. Fix API Key Validation Tests
  - [x] 1.1 Create shared test constants file with valid 40+ character mock keys
  - [x] 1.2 Update all tests in lib/openai-provider.test.ts (26 failures)
  - [x] 1.3 Update validation tests in lib/settings-service.test.ts (5 failures)
  - [x] 1.4 Update tests in sidepanel/Settings.test.tsx (4 failures)
  - [x] 1.5 Verify all API key validation tests pass

- [x] 2. Fix Integration Test Chrome API Mocking
  - [x] 2.1 Create proper Chrome tabs mock with active tab
  - [x] 2.2 Update SidePanel.integration.test.tsx setup (10 failures)
  - [x] 2.3 Fix "No active tab found" errors in integration tests
  - [x] 2.4 Ensure Chrome storage mocks work correctly
  - [x] 2.5 Verify all integration tests pass

- [x] 3. Fix Streaming and AbortController Issues
  - [x] 3.1 Identify streaming tests with AbortController errors
  - [x] 3.2 Create proper AbortController/AbortSignal mocks for JSDOM
  - [x] 3.3 Fix streaming cancellation tests
  - [x] 3.4 Add cleanup in test teardown
  - [x] 3.5 Verify all streaming tests pass

- [x] 4. Update Remaining Test Files
  - [x] 4.1 Search for any remaining uses of old mock API keys
  - [x] 4.2 Update EnhancedSettings.test.tsx with new key format
  - [x] 4.3 Update background/message-handlers.test.ts
  - [x] 4.4 Update any other test files using mock keys
  - [x] 4.5 Run full test suite to verify all 199 tests pass

- [x] 5. Final Verification and Cleanup
  - [x] 5.1 Run complete test suite with coverage report
  - [x] 5.2 Verify no new test failures introduced
  - [x] 5.3 Check for any console errors or warnings
  - [x] 5.4 Document any test-specific gotchas or patterns
  - [x] 5.5 Confirm all 199 tests pass consistently
