# Spec Tasks

## Tasks

- [ ] 1. Fix API Key Validation Tests
  - [ ] 1.1 Create shared test constants file with valid 40+ character mock keys
  - [ ] 1.2 Update all tests in lib/openai-provider.test.ts (26 failures)
  - [ ] 1.3 Update validation tests in lib/settings-service.test.ts (5 failures)
  - [ ] 1.4 Update tests in sidepanel/Settings.test.tsx (4 failures)
  - [ ] 1.5 Verify all API key validation tests pass

- [ ] 2. Fix Integration Test Chrome API Mocking
  - [ ] 2.1 Create proper Chrome tabs mock with active tab
  - [ ] 2.2 Update SidePanel.integration.test.tsx setup (10 failures)
  - [ ] 2.3 Fix "No active tab found" errors in integration tests
  - [ ] 2.4 Ensure Chrome storage mocks work correctly
  - [ ] 2.5 Verify all integration tests pass

- [ ] 3. Fix Streaming and AbortController Issues
  - [ ] 3.1 Identify streaming tests with AbortController errors
  - [ ] 3.2 Create proper AbortController/AbortSignal mocks for JSDOM
  - [ ] 3.3 Fix streaming cancellation tests
  - [ ] 3.4 Add cleanup in test teardown
  - [ ] 3.5 Verify all streaming tests pass

- [ ] 4. Update Remaining Test Files
  - [ ] 4.1 Search for any remaining uses of old mock API keys
  - [ ] 4.2 Update EnhancedSettings.test.tsx with new key format
  - [ ] 4.3 Update background/message-handlers.test.ts
  - [ ] 4.4 Update any other test files using mock keys
  - [ ] 4.5 Run full test suite to verify all 199 tests pass

- [ ] 5. Final Verification and Cleanup
  - [ ] 5.1 Run complete test suite with coverage report
  - [ ] 5.2 Verify no new test failures introduced
  - [ ] 5.3 Check for any console errors or warnings
  - [ ] 5.4 Document any test-specific gotchas or patterns
  - [ ] 5.5 Confirm all 199 tests pass consistently
