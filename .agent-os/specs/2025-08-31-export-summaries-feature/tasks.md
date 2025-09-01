# Spec Tasks

This tasks checklist is for the spec detailed in @.agent-os/specs/2025-08-31-export-summaries-feature/spec.md

## Tasks

- [x] 1. Chrome Extension Permissions and Manifest Updates
  - [x] 1.1 Write tests for manifest permissions validation
  - [x] 1.2 Add "downloads" permission to manifest.json
  - [x] 1.3 Test permission is properly granted during extension reload
  - [x] 1.4 Verify downloads API is accessible in background service worker

- [x] 2. ExportService Core Implementation
  - [x] 2.1 Write tests for ExportService class and format transformations
  - [x] 2.2 Create ExportService class in /apps/extension/lib/export-service.ts
  - [x] 2.3 Implement JSON export method with Document serialization
  - [x] 2.4 Implement Markdown export with formatted headers and metadata
  - [x] 2.5 Implement CSV export with proper escaping and flattening
  - [x] 2.6 Add batch processing for large datasets (25-document chunks)
  - [x] 2.7 Implement error handling and filename generation
  - [x] 2.8 Verify all export service tests pass

- [x] 3. Chrome Downloads API Integration
  - [x] 3.1 Write tests for downloads API integration
  - [x] 3.2 Implement download trigger using chrome.downloads.download()
  - [x] 3.3 Configure MIME types for each export format
  - [x] 3.4 Add download progress tracking and cancellation
  - [x] 3.5 Implement retry mechanism for failed downloads
  - [x] 3.6 Handle browser download preferences
  - [x] 3.7 Verify all downloads integration tests pass

- [x] 4. Export UI Components
  - [x] 4.1 Write tests for Export UI components and interactions
  - [x] 4.2 Add Export section to EnhancedSettings.tsx
  - [x] 4.3 Create format selection radio buttons (JSON, Markdown, CSV)
  - [x] 4.4 Implement export scope selection UI
  - [x] 4.5 Add progress indicator with loading animations
  - [x] 4.6 Create export button with state management
  - [x] 4.7 Implement user feedback and error display
  - [x] 4.8 Verify all UI component tests pass

- [x] 5. Integration Testing and Performance Validation
  - [x] 5.1 Write integration test suite for complete export workflow
  - [x] 5.2 Test with various document counts (1, 10, 50, 100+)
  - [x] 5.3 Validate exported file content integrity
  - [x] 5.4 Test export cancellation and retry mechanisms
  - [x] 5.5 Verify memory usage with large datasets
  - [x] 5.6 Test error scenarios and edge cases
  - [x] 5.7 Validate files open in appropriate applications
  - [x] 5.8 Verify all integration tests pass
