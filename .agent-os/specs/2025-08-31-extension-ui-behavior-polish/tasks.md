# Spec Tasks

## Tasks

- [x] 1. Implement Deferred Content Extraction
  - [x] 1.1 Write tests for deferred extraction behavior
  - [x] 1.2 Remove extractTextFromCurrentTab() from useEffect mount hook
  - [x] 1.3 Add initial "ready" state UI showing page info without extraction
  - [x] 1.4 Move extraction trigger to user-initiated action in StreamingSummarizer
  - [x] 1.5 Update UI to show "Extract & Summarize" button in idle state
  - [x] 1.6 Verify all extraction tests pass

- [x] 2. Add Tab Change Detection
  - [x] 2.1 Write tests for tab change detection and UI updates
  - [x] 2.2 Implement chrome.tabs.onActivated listener in SidePanel component
  - [x] 2.3 Create handleTabChange function to reset content and UI state
  - [x] 2.4 Add cleanup for listener on component unmount
  - [x] 2.5 Test tab switching scenarios (normal switch, new tabs, closing tabs)
  - [x] 2.6 Verify all tab change tests pass

- [x] 3. Enhance Error Messaging for Content Script Issues
  - [x] 3.1 Write tests for specific error message scenarios
  - [x] 3.2 Update error handling to detect "Receiving end does not exist" error
  - [x] 3.3 Create user-friendly refresh instruction message
  - [x] 3.4 Add visual refresh indicator or icon to error display
  - [x] 3.5 Test with fresh install and pre-loaded pages
  - [x] 3.6 Verify all error handling tests pass

- [x] 4. Final Integration and Testing
  - [x] 4.1 Run full test suite (npm run test)
  - [x] 4.2 Manual testing of complete user flow
  - [x] 4.3 Verify no regression in existing summarization functionality
  - [x] 4.4 Run lint and typecheck commands
  - [x] 4.5 Build extension and test in Chrome
