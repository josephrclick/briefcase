# Spec Requirements Document

> Spec: UI Width Optimization and History Tab
> Created: 2025-09-01

## Overview

Optimize the Briefcase Chrome extension side panel to maximize width utilization by reducing padding and add a History tab to provide users access to their stored document summaries. This enhancement improves the user experience by utilizing all available screen space and exposing the already-implemented document storage functionality through an intuitive interface.

## User Stories

### Accessing Document History

As a knowledge worker, I want to access my previously summarized documents through a dedicated History tab, so that I can quickly reference past summaries without re-extracting content.

When I click on the History tab, I see a list of my recent documents with titles, domains, and summary previews. I can click on any document to view its full summary, and I can delete documents I no longer need. The list shows up to 20 most recent documents, automatically managing storage with the FIFO retention policy already implemented.

### Maximizing Content Display

As a user with limited screen space, I want the side panel to use all available width, so that I can read content more comfortably without unnecessary white space.

The side panel should utilize the full width available in Chrome's side panel API, reducing excessive padding while maintaining readability and touch targets for interactive elements.

## Spec Scope

1. **Width Optimization** - Reduce padding in tab content, streaming summarizer, and controls to maximize usable width
2. **History Tab Addition** - Add a third tab labeled "History" to the navigation bar between Summarize and Settings tabs
3. **RecentList Integration** - Connect the existing RecentList component to display when the History tab is active
4. **History Tab Styling** - Create consistent styles for document list items, hover states, and delete buttons
5. **Tab State Management** - Update activeTab state to support "history" value and implement switching logic

## Out of Scope

- Modifying the underlying DocumentRepository implementation
- Changing the FIFO retention policy or storage limits
- Adding search or filtering capabilities to the history list
- Implementing export functionality for stored documents
- Creating new storage backends or migration tools

## Expected Deliverable

1. Side panel utilizes full available width with minimal padding while maintaining usability
2. History tab is visible and clickable in the navigation, displaying the RecentList component when selected
3. Users can view, click to expand, and delete their stored document summaries through the History tab interface
