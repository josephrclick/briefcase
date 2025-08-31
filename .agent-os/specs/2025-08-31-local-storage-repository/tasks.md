# Spec Tasks

## Tasks

- [ ] 1. Create Document Repository Service
  - [ ] 1.1 Write tests for DocumentRepository class
  - [ ] 1.2 Create DocumentRepository class with TypeScript interfaces
  - [ ] 1.3 Implement saveDocument method with document structure
  - [ ] 1.4 Implement getDocument and getRecentDocuments methods
  - [ ] 1.5 Implement deleteDocument and clearAllDocuments methods
  - [ ] 1.6 Add error handling and retry logic
  - [ ] 1.7 Verify all DocumentRepository tests pass

- [ ] 2. Implement FIFO Retention Logic
  - [ ] 2.1 Write tests for FIFO enforcement at 200 document limit
  - [ ] 2.2 Implement enforceStorageLimit private method
  - [ ] 2.3 Integrate FIFO logic into saveDocument flow
  - [ ] 2.4 Add storage monitoring with getBytesInUse
  - [ ] 2.5 Test with 200+ documents to verify oldest removal
  - [ ] 2.6 Verify all FIFO tests pass

- [ ] 3. Integrate with Summarization Flow
  - [ ] 3.1 Write integration tests for document saving after summarization
  - [ ] 3.2 Update SidePanel.tsx to save documents after summary completion
  - [ ] 3.3 Update background message handler to include document saving
  - [ ] 3.4 Ensure document includes both rawText and summaryText
  - [ ] 3.5 Add proper error handling for save failures
  - [ ] 3.6 Verify integration tests pass

- [ ] 4. Update Recent Documents UI
  - [ ] 4.1 Write tests for RecentList component with real data
  - [ ] 4.2 Replace mock data loading with DocumentRepository.getRecentDocuments()
  - [ ] 4.3 Implement real delete functionality in RecentList
  - [ ] 4.4 Add loading and error states for document operations
  - [ ] 4.5 Update document display to show real summaries
  - [ ] 4.6 Verify all RecentList tests pass

- [ ] 5. End-to-End Testing and Verification
  - [ ] 5.1 Write end-to-end tests for complete document lifecycle
  - [ ] 5.2 Test document persistence across extension reloads
  - [ ] 5.3 Verify FIFO works correctly at capacity
  - [ ] 5.4 Test storage quota error handling
  - [ ] 5.5 Manual testing of summarize-save-view flow
  - [ ] 5.6 Verify all tests pass and feature meets spec requirements
