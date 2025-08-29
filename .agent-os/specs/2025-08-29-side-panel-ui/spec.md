# Spec Requirements Document

> Spec: Side Panel UI
> Created: 2025-08-29

## Overview

Implement the core Chrome side panel interface for Briefcase that provides one-click article summarization with settings management and document history. This UI will enable users to summarize web content, configure their OpenAI API key, and access previously summarized documents through a clean, intuitive interface.

## User Stories

### First-Time User Setup

As a new user, I want to easily configure my OpenAI API key and understand privacy implications, so that I can start summarizing content immediately.

When I first open the extension, I see a welcome screen explaining that content will be sent to OpenAI using my API key, with all data stored locally. I can paste my API key into a secure input field, test the connection, and proceed to the main interface once configured.

### Article Summarization

As a knowledge worker, I want to summarize the current webpage with customizable settings, so that I can quickly extract key information in my preferred format.

From any article page, I open the side panel and see extraction status, choose my summary length (Brief/Medium) and style (Bullets/Plain), then click "Summarize" to see streaming results with Key Points appearing first, followed by a TL;DR section.

### Document History Access

As a researcher, I want to access my recently summarized documents, so that I can reference previous summaries without re-processing pages.

I click the "Recent" tab to see my last 20 summarized documents with titles, domains, and dates. Clicking any item shows the saved summary and original text, with options to delete individual items or clear all history.

## Spec Scope

1. **Settings Interface** - API key configuration with secure input, connection testing, and privacy banner
2. **Summarization Controls** - Length/style selectors, summarize button, and streaming result display
3. **Recent Documents List** - Chronological list of last 20 summaries with search and delete capabilities
4. **Document Viewer** - Display saved summaries with metadata and original text access
5. **Error Handling UI** - User-friendly error messages for unsupported pages and API failures

## Out of Scope

- Content extraction logic (handled by content script)
- OpenAI API integration (handled by background service)
- Database migration UI (v2 feature)
- Advanced search functionality (v2 feature)
- Export capabilities (future enhancement)

## Expected Deliverable

1. Functional side panel that opens when extension icon is clicked and displays current page readiness
2. Working settings page where users can input and test their OpenAI API key
3. Summarization interface that shows streaming results with proper formatting and error states
