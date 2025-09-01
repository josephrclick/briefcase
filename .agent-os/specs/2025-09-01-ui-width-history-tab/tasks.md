# Spec Tasks

## Tasks

- [ ] 1. Optimize panel width by reducing padding
  - [ ] 1.1 Write tests for CSS padding changes
  - [ ] 1.2 Reduce .tab-content padding from 0.5rem to 0.25rem
  - [ ] 1.3 Reduce .streaming-summarizer padding from 0.5rem to 0.25rem
  - [ ] 1.4 Reduce .controls padding from 0.75rem to 0.5rem
  - [ ] 1.5 Reduce .settings-section padding from 0.75rem to 0.5rem
  - [ ] 1.6 Verify minimum touch targets maintain 44px height
  - [ ] 1.7 Test width optimization in Chrome extension
  - [ ] 1.8 Verify all tests pass

- [ ] 2. Add History tab to navigation
  - [ ] 2.1 Write tests for History tab functionality
  - [ ] 2.2 Update activeTab state type to include "history" value
  - [ ] 2.3 Import RecentList component in SidePanel.tsx
  - [ ] 2.4 Add History Tab component between Summarize and Settings
  - [ ] 2.5 Implement conditional rendering for History tab content
  - [ ] 2.6 Connect onViewDocument handler to DocumentViewer
  - [ ] 2.7 Verify all tests pass

- [ ] 3. Style History tab components
  - [ ] 3.1 Write tests for History tab styling
  - [ ] 3.2 Add .recent-list container styles
  - [ ] 3.3 Style .document-list and .document-item classes
  - [ ] 3.4 Implement .document-info section styling
  - [ ] 3.5 Add .delete-button positioning and hover effects
  - [ ] 3.6 Style .summary-preview for text truncation
  - [ ] 3.7 Ensure dark mode compatibility
  - [ ] 3.8 Verify all tests pass

- [ ] 4. Final integration and testing
  - [ ] 4.1 Run full test suite
  - [ ] 4.2 Manual testing of tab navigation
  - [ ] 4.3 Test document viewing from History tab
  - [ ] 4.4 Test document deletion functionality
  - [ ] 4.5 Verify width optimization across all tabs
  - [ ] 4.6 Run lint and typecheck commands
  - [ ] 4.7 Load extension in Chrome and test end-to-end
