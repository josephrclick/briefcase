# Spec Tasks

## Tasks

- [x] 1. Create Document Repository Service
  - [x] 1.1 Write tests for DocumentRepository class
  - [x] 1.2 Create DocumentRepository class with TypeScript interfaces
  - [x] 1.3 Implement saveDocument method with document structure
  - [x] 1.4 Implement getDocument and getRecentDocuments methods
  - [x] 1.5 Implement deleteDocument and clearAllDocuments methods
  - [x] 1.6 Add error handling and retry logic
  - [x] 1.7 Verify all DocumentRepository tests pass

- [x] 2. Implement FIFO Retention Logic
  - [x] 2.1 Write tests for FIFO enforcement at 200 document limit
  - [x] 2.2 Implement enforceStorageLimit private method
  - [x] 2.3 Integrate FIFO logic into saveDocument flow
  - [x] 2.4 Add storage monitoring with getBytesInUse
  - [x] 2.5 Test with 200+ documents to verify oldest removal
  - [x] 2.6 Verify all FIFO tests pass

- [x] 3. Integrate with Summarization Flow
  - [x] 3.1 Write integration tests for document saving after summarization
  - [x] 3.2 Update SidePanel.tsx to save documents after summary completion
  - [x] 3.3 Update background message handler to include document saving
  - [x] 3.4 Ensure document includes both rawText and summaryText
  - [x] 3.5 Add proper error handling for save failures
  - [x] 3.6 Verify integration tests pass

- [x] 4. Update Recent Documents UI
  - [x] 4.1 Write tests for RecentList component with real data
  - [x] 4.2 Replace mock data loading with DocumentRepository.getRecentDocuments()
  - [x] 4.3 Implement real delete functionality in RecentList
  - [x] 4.4 Add loading and error states for document operations
  - [x] 4.5 Update document display to show real summaries
  - [x] 4.6 Verify all RecentList tests pass

- [x] 5. End-to-End Testing and Verification
  - [x] 5.1 Write end-to-end tests for complete document lifecycle
  - [x] 5.2 Test document persistence across extension reloads
  - [x] 5.3 Verify FIFO works correctly at capacity
  - [x] 5.4 Test storage quota error handling
  - [x] 5.5 Manual testing of summarize-save-view flow
  - [x] 5.6 Verify all tests pass and feature meets spec requirements
