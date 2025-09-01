# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-09-01-recent-list-search/spec.md

## Technical Requirements

### Component Updates

- **RecentList.tsx Enhancement**
  - Add search state using `useState<string>('')` for query tracking
  - Implement filtered documents computation using `useMemo` for performance
  - Case-insensitive search across title, domain, and summaryText fields
  - Debounce search input to prevent excessive re-renders (150ms delay)

### UI Components

- **Search Input Field**
  - Positioned at top of RecentList component, below the h2 heading
  - Full width with appropriate padding matching existing UI patterns
  - Placeholder text: "Search documents..."
  - Clear button (×) shown when search query is present
  - Preact-compatible input handling with `onInput` event

### Search Implementation

- **Filtering Logic**
  - Convert search query and target fields to lowercase for case-insensitive matching
  - Check if query exists in: `doc.title`, `doc.domain`, `doc.summaryText`
  - Use JavaScript's native `includes()` for substring matching
  - Return filtered array maintaining original sort order (newest first)

### State Management

- **Local Component State**
  - Search query stored in component state, not persisted
  - Filtered results computed on each render based on current query
  - Loading and empty states preserved from existing implementation

### Performance Considerations

- **Optimization Strategies**
  - Use `useMemo` to memoize filtered results
  - Debounce search input to reduce filtering frequency
  - Limit search to already-loaded 20 documents (no additional data fetching)
  - Maintain existing lazy-loading behavior for document list

### Styling Requirements

- **Visual Design**
  - Search input styled consistently with existing form controls
  - Use existing CSS variables for theming (light/dark mode support)
  - Clear button aligned to right within input field
  - Smooth transitions for filtering animations

### Empty State Handling

- **No Results Message**
  - Display when filtered documents array is empty
  - Message: "No documents match your search. Try different keywords."
  - Maintain existing empty state for when no documents exist at all

### Accessibility

- **ARIA Labels and Keyboard Support**
  - Label search input appropriately for screen readers
  - Ensure clear button is keyboard accessible
  - Maintain focus management when clearing search
  - Support standard keyboard shortcuts (Escape to clear)
