# Spec Requirements Document

> Spec: Extension UI Behavior Polish
> Created: 2025-08-31

## Overview

Refine the Briefcase extension's UI behavior to improve user experience by preventing automatic content extraction on load, adding tab change detection, and providing clearer error messaging for content script communication failures. These changes will make the extension more predictable and user-friendly while maintaining the core summarization functionality.

## User Stories

### Manual Content Extraction Control

As a user, I want the extension to wait for my explicit action before extracting page content, so that I have control over when extraction happens and can avoid unnecessary processing.

When I open the Briefcase side panel, the extension should display the current page information but not automatically extract text. I can then click the "Summarize" button when I'm ready to extract and summarize the content. This gives me control over the timing and avoids extracting content from pages I might just be passing through.

### Dynamic Tab Change Detection

As a user, I want the extension to recognize when I switch browser tabs while keeping the side panel open, so that I can seamlessly summarize content from different tabs without closing and reopening the extension.

When I have the Briefcase side panel open and switch to a different browser tab, the extension should detect this change and update its interface to reflect the new active tab. The previously extracted content should be cleared, and I should see the option to summarize the newly active tab's content. This allows me to efficiently work through multiple articles without repeatedly opening and closing the extension.

### Clear Error Communication

As a user who has just installed the extension, I want clear guidance when the extension cannot communicate with a page, so that I understand how to resolve the issue and successfully use the extension.

When I try to summarize a page that was loaded before the extension was installed, instead of seeing a generic error, I should receive a specific message explaining that the page needs to be refreshed for the extension to work properly. This helps me understand that it's a simple fix rather than a broken feature.

## Spec Scope

1. **Deferred Content Extraction** - Remove automatic text extraction on side panel mount and trigger extraction only when user initiates summarization
2. **Tab Change Listener** - Implement chrome.tabs.onActivated listener to detect tab switches and update the extension UI accordingly
3. **Content Script Error Handling** - Detect "Receiving end does not exist" errors and display user-friendly refresh guidance
4. **UI State Management** - Clear previous extraction state when switching tabs to prevent stale content display

## Out of Scope

- Changes to the content extraction algorithm or Readability implementation
- Modifications to the summarization process or OpenAI integration
- Storage or persistence changes for extracted content
- Changes to the extension's permissions or manifest configuration
- Cross-window tab tracking (only current window tabs)

## Expected Deliverable

1. Opening the side panel shows ready state without auto-extracting content; extraction happens only after clicking "Summarize"
2. Switching browser tabs while side panel is open updates the UI to reflect the new active tab
3. Users encountering content script communication errors see a message specifically instructing them to refresh the page
