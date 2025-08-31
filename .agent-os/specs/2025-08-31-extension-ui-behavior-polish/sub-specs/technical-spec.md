# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-31-extension-ui-behavior-polish/spec.md

## Technical Requirements

### 1. Deferred Content Extraction

**Current Implementation:**

- `SidePanel.tsx` calls `extractTextFromCurrentTab()` in `useEffect` on component mount (line 57)
- This causes automatic extraction whenever the side panel opens

**Required Changes:**

- Remove `extractTextFromCurrentTab()` from the initial `useEffect` hook
- Move extraction trigger to the "Summarize" button click handler
- Update UI to show a "ready to extract" state instead of immediately attempting extraction
- Preserve the existing "Try Again" button for retry functionality

**Implementation Details:**

- Modify `SidePanel.tsx` useEffect to only call `loadSettings()` on mount
- Add initial state showing page URL/title without extracted content
- Trigger extraction only when user interacts with StreamingSummarizer's summarize action
- Maintain existing extraction logic and error handling

### 2. Tab Change Detection

**Current Implementation:**

- No tab change detection exists
- Side panel remains static when user switches tabs

**Required Changes:**

- Implement `chrome.tabs.onActivated` listener in the side panel component
- Clear extracted content state when tab changes
- Update UI to reflect new active tab information
- Re-enable extraction for the new tab

**Implementation Details:**

- Add tab change listener in `SidePanel.tsx` useEffect:
  ```typescript
  chrome.tabs.onActivated.addListener(handleTabChange);
  ```
- Create `handleTabChange` function to:
  - Reset `extractedContent` state
  - Reset `summary` state in StreamingSummarizer
  - Optionally show tab change notification
- Clean up listener on component unmount
- Consider debouncing rapid tab switches

### 3. Enhanced Error Messaging

**Current Implementation:**

- Generic error message: `error.message || "Failed to extract text from page"` (line 120)
- No specific handling for "Receiving end does not exist" error

**Required Changes:**

- Detect specific Chrome runtime errors
- Provide targeted error messages with actionable solutions
- Special handling for content script injection failures

**Implementation Details:**

- Check for specific error patterns in catch block:
  ```typescript
  if (
    error.message?.includes("Receiving end does not exist") ||
    error.message?.includes("Could not establish connection")
  ) {
    // Show refresh instruction
  }
  ```
- Create user-friendly error messages:
  - "Please refresh this page and try again" for content script errors
  - Include icon or visual indicator for refresh action
  - Maintain existing error display structure

### 4. UI State Management

**Current Implementation:**

- Single extraction state persists until new extraction
- No clear separation between "ready" and "extracted" states

**Required Changes:**

- Add explicit UI states: `idle`, `extracting`, `extracted`, `error`
- Clear states appropriately on tab changes
- Show current tab information even before extraction

**Implementation Details:**

- Create state enum or constant for UI states
- Display tab title and URL in idle state
- Show "Extract & Summarize" button prominently in idle state
- Transition states based on user actions and tab changes

## Performance Considerations

- Tab change listeners should be lightweight to avoid UI lag
- Consider throttling tab change events if user switches rapidly
- Maintain existing extraction performance (<50ms target)
- Ensure error detection doesn't add significant overhead

## Testing Requirements

- Test manual extraction trigger with various page types
- Verify tab change detection across multiple scenarios:
  - Normal tab switching
  - Opening new tabs
  - Closing tabs
  - Switching between windows
- Test error messages with:
  - Fresh extension install
  - Pages loaded before extension
  - Protected browser pages (chrome://, about:)
- Ensure no regression in existing summarization flow
