# Spec Tasks

## Tasks

- [ ] 1. Implement Deferred Content Extraction
  - [ ] 1.1 Write tests for deferred extraction behavior
  - [ ] 1.2 Remove extractTextFromCurrentTab() from useEffect mount hook
  - [ ] 1.3 Add initial "ready" state UI showing page info without extraction
  - [ ] 1.4 Move extraction trigger to user-initiated action in StreamingSummarizer
  - [ ] 1.5 Update UI to show "Extract & Summarize" button in idle state
  - [ ] 1.6 Verify all extraction tests pass

- [ ] 2. Add Tab Change Detection
  - [ ] 2.1 Write tests for tab change detection and UI updates
  - [ ] 2.2 Implement chrome.tabs.onActivated listener in SidePanel component
  - [ ] 2.3 Create handleTabChange function to reset content and UI state
  - [ ] 2.4 Add cleanup for listener on component unmount
  - [ ] 2.5 Test tab switching scenarios (normal switch, new tabs, closing tabs)
  - [ ] 2.6 Verify all tab change tests pass

- [ ] 3. Enhance Error Messaging for Content Script Issues
  - [ ] 3.1 Write tests for specific error message scenarios
  - [ ] 3.2 Update error handling to detect "Receiving end does not exist" error
  - [ ] 3.3 Create user-friendly refresh instruction message
  - [ ] 3.4 Add visual refresh indicator or icon to error display
  - [ ] 3.5 Test with fresh install and pre-loaded pages
  - [ ] 3.6 Verify all error handling tests pass

- [ ] 4. Final Integration and Testing
  - [ ] 4.1 Run full test suite (npm run test)
  - [ ] 4.2 Manual testing of complete user flow
  - [ ] 4.3 Verify no regression in existing summarization functionality
  - [ ] 4.4 Run lint and typecheck commands
  - [ ] 4.5 Build extension and test in Chrome
