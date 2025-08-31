# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-31-content-extraction-readability/spec.md

> Created: 2025-08-31
> Version: 1.0.0

## Technical Requirements

### Content Extraction Pipeline

- **Primary Extraction**: Mozilla Readability library integration
  - Initialize Readability with cloned document to avoid DOM mutations
  - Extract article content with isProbablyReaderable check
  - Parse result includes textContent, title, and content properties
- **Fallback Extraction**: DOM heuristic algorithm
  - Query selectors for common content containers (article, main, [role="main"])
  - Calculate text density for block-level elements
  - Extract largest contiguous text block (minimum 800 characters)
  - Strip navigation, footer, and sidebar elements

- **Manual Selection Mode**: User-initiated text selection
  - Listen for text selection events in content script
  - Capture selected text via window.getSelection()
  - Validate minimum selection length (100 characters)
  - Send selection to side panel via chrome.runtime messaging

### Content Processing

- **Text Normalization**:
  - Convert HTML to plain text preserving paragraph breaks
  - Maintain code block formatting with ``` delimiters
  - Preserve inline code with backticks
  - Convert lists to plain text with bullet points
  - Strip excessive whitespace while maintaining readability

- **Metadata Extraction**:
  - Capture current page URL (window.location.href)
  - Generate extraction timestamp (ISO 8601 format)
  - Note image count in extracted content
  - Track extraction method used (readability/heuristic/manual)

### DOM Stability Detection

- **MutationObserver Implementation**:
  - Monitor document.body for childList and subtree changes
  - 3-second timeout for stability detection
  - Debounce rapid mutations with 500ms delay
  - Proceed with extraction after stability achieved

### Message Passing Architecture

- **Content Script → Background**:
  - Message type: 'EXTRACT_CONTENT'
  - Payload: { text, metadata, method }
  - Error handling for failed extractions

- **Background → Side Panel**:
  - Message type: 'CONTENT_EXTRACTED'
  - Forward extracted content and metadata
  - Handle connection state and reconnection

### Error Handling

- **Unsupported Page Detection**:
  - PDF detection via content-type header or URL pattern
  - Iframe detection via window.self !== window.top
  - Minimal content pages (<800 characters extractable)
  - Return clear error messages with failure reason

- **Extraction Failure Recovery**:
  - Automatic fallback from Readability to heuristics
  - Prompt for manual selection on complete failure
  - User-friendly error messages in side panel UI

## External Dependencies

- **@mozilla/readability** - Mozilla's Readability library for article extraction
  - Version: ^0.5.0
  - Justification: Industry-standard library for reliable article extraction, actively maintained
  - Used in content script for primary extraction method

## Integration Points

### Content Script Injection

- Inject content script on user action (not automatically)
- Use chrome.scripting.executeScript for dynamic injection
- Handle permissions for activeTab access

### Chrome Storage Integration

- Store extracted content with document ID
- Include extraction metadata in document object
- Respect storage quota limits (5MB for chrome.storage.local)

### Side Panel Communication

- Establish connection on panel open
- Handle disconnection and reconnection gracefully
- Queue messages during disconnection
