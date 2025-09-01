# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-31-export-summaries-feature/spec.md

## Technical Requirements

### Export Service Implementation

- Create `ExportService` class in `/apps/extension/lib/` to handle export logic
- Support three output formats: JSON (complete data), Markdown (formatted text), CSV (tabular data)
- Implement data transformation methods for each format with proper escaping and formatting
- Handle large datasets by processing documents in batches to avoid memory issues

### Chrome Extension Integration

- Add "downloads" permission to manifest.json for file downloads
- Use `chrome.downloads.download()` API to save files to user's downloads folder
- Generate appropriate MIME types: `application/json`, `text/markdown`, `text/csv`
- Create proper filenames with timestamps: `briefcase-summaries-YYYY-MM-DD.{ext}`

### UI Components

- Add Export section to EnhancedSettings.tsx component
- Create export format selection (radio buttons for JSON/Markdown/CSV)
- Implement export scope selection (All summaries, Date range, Selected items)
- Add progress indicator component for large exports
- Include export button with loading states and success/error feedback

### Data Processing

- Leverage existing DocumentRepository.getRecentDocuments() for data retrieval
- Transform Document interface data to export-friendly formats
- For Markdown: Convert summary.keyPoints to bullet lists, include TL;DR as quote blocks
- For CSV: Flatten nested data structure, handle arrays as comma-separated values
- For JSON: Export complete Document objects with optional filtering for sensitive data

### File Format Specifications

- **JSON**: Array of Document objects with full metadata and summary structure
- **Markdown**: Individual sections per document with headers, metadata table, and formatted summaries
- **CSV**: Columns for ID, Title, URL, Domain, Created Date, Summary Key Points, TL;DR, Word Count

### Performance Considerations

- Stream processing for exports over 50 documents to prevent UI blocking
- Implement batch processing with 25-document chunks
- Add cancellation support for long-running exports
- Optimize string concatenation using StringBuilder pattern for large outputs

### Error Handling

- Validate export permissions before initiating download
- Handle quota exceeded errors gracefully with user feedback
- Provide retry mechanism for failed downloads
- Log export errors to console without exposing user data

### Testing Requirements

- Unit tests for ExportService format transformations
- Integration tests for Chrome downloads API interaction
- Mock DocumentRepository data for consistent test scenarios
- Test large dataset exports (100+ documents) for performance validation
