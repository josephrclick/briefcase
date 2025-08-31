# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-31-local-storage-repository/spec.md

## Technical Requirements

### Document Storage Service

- Create a `DocumentRepository` class in `/apps/extension/lib/document-repository.ts`
- Implement methods:
  - `saveDocument(document: Document): Promise<void>` - Save document and update index
  - `getDocument(id: string): Promise<Document | null>` - Retrieve single document
  - `getRecentDocuments(limit?: number): Promise<Document[]>` - Get recent documents list
  - `deleteDocument(id: string): Promise<void>` - Remove document and update index
  - `clearAllDocuments(): Promise<void>` - Remove all documents and reset index

### Document Data Structure

```typescript
interface Document {
  id: string; // Unique identifier (timestamp-based)
  url: string; // Original page URL
  title: string; // Extracted page title
  domain: string; // Source domain
  rawText: string; // Original extracted text
  summaryText?: string; // AI-generated summary
  summary?: {
    keyPoints: string[];
    tldr: string;
  };
  metadata: {
    author?: string;
    publishedDate?: string;
    readingTime?: number;
    wordCount: number;
  };
  createdAt: string; // ISO timestamp
  summarizedAt?: string; // ISO timestamp when summary was generated
}
```

### Storage Schema

- **Index Storage**: `docs:index` key contains array of document IDs (newest first)
- **Document Storage**: `doc:<id>` keys contain individual document objects
- **Storage Limits**:
  - Maximum 200 documents (FIFO enforcement)
  - Estimated 50KB per document average
  - Total storage usage ~10MB maximum

### FIFO Implementation

```typescript
private async enforceStorageLimit(): Promise<void> {
  const { 'docs:index': index } = await chrome.storage.local.get('docs:index');
  const docIds = (index || []) as string[];

  if (docIds.length > 200) {
    const idsToRemove = docIds.slice(200);
    const keysToRemove = idsToRemove.map(id => `doc:${id}`);

    await chrome.storage.local.remove(keysToRemove);
    await chrome.storage.local.set({
      'docs:index': docIds.slice(0, 200)
    });
  }
}
```

### Integration Points

1. **SidePanel.tsx Integration**:
   - Call `documentRepository.saveDocument()` after successful summarization
   - Pass document data including extracted text and summary

2. **RecentList.tsx Update**:
   - Replace mock data loading with `documentRepository.getRecentDocuments()`
   - Implement real delete functionality using `documentRepository.deleteDocument()`

3. **Background Script Integration**:
   - Add document save logic to the summarization message handler
   - Ensure document is saved after streaming completes

### Error Handling

- Handle chrome.storage.local quota exceeded errors
- Implement retry logic for transient storage failures
- Log storage operations for debugging
- Graceful degradation if storage is unavailable

### Performance Considerations

- Use batch operations when possible (chrome.storage.local.set with multiple keys)
- Implement debouncing for rapid successive saves
- Consider chunking large document lists for UI rendering
- Monitor storage.local usage via chrome.storage.local.getBytesInUse()

## Testing Requirements

- Unit tests for DocumentRepository class
- Integration tests for storage operations
- Test FIFO logic with 200+ documents
- Test storage quota handling
- Test data persistence across extension reloads
