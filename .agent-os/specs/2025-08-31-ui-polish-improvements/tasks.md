# Spec Tasks

## Tasks

- [x] 1. Implement API Key Save Flow Enhancement
  - [x] 1.1 Write tests for API key validation and save flow transformation
  - [x] 1.2 Add `apiKeyValidated` state to EnhancedSettings component
  - [x] 1.3 Modify handleTestConnection to set validation flag on success
  - [x] 1.4 Transform button text and action based on validation state
  - [x] 1.5 Implement combined test and save operation flow
  - [x] 1.6 Reset validation state when API key input changes
  - [x] 1.7 Update UI messaging for the new flow
  - [x] 1.8 Verify all tests pass

- [x] 2. Implement Combined Extract & Summarize Workflow
  - [x] 2.1 Write tests for automatic summarization trigger after extraction
  - [x] 2.2 Add auto-summarize prop to StreamingSummarizer component
  - [x] 2.3 Modify handleExtractClick to trigger summarization on success
  - [x] 2.4 Implement auto-start functionality in StreamingSummarizer
  - [x] 2.5 Add proper error handling for each stage of the combined flow
  - [x] 2.6 Update loading states for the combined operation
  - [x] 2.7 Ensure manual retry capability remains functional
  - [x] 2.8 Verify all tests pass

- [x] 3. Implement Conditional Settings Display
  - [x] 3.1 Write tests for collapsible OpenAI configuration section
  - [x] 3.2 Add collapse state management to EnhancedSettings
  - [x] 3.3 Create "Change API Key" button component
  - [x] 3.4 Implement section collapse/expand logic based on API key status
  - [x] 3.5 Persist collapse preference in chrome.storage.local
  - [x] 3.6 Update UI layout for collapsed state
  - [x] 3.7 Verify all tests pass

- [x] 4. Optimize UI Width and Spacing
  - [x] 4.1 Write visual regression tests for layout changes
  - [x] 4.2 Reduce padding in tab-content from 1rem to 0.5rem
  - [x] 4.3 Optimize streaming-summarizer padding to 0.5rem
  - [x] 4.4 Adjust controls and settings-section padding to 0.75rem
  - [x] 4.5 Update summary-container padding to 0.75rem
  - [x] 4.6 Ensure minimum button touch targets (44x44px) are maintained
  - [x] 4.7 Test readability across different content lengths
  - [x] 4.8 Verify all tests pass

- [x] 5. Implement Dark Mode Support
  - [x] 5.1 Write tests for theme detection and switching
  - [x] 5.2 Add theme preference to SettingsData interface
  - [x] 5.3 Implement CSS custom properties for theming
  - [x] 5.4 Create light and dark theme variable sets
  - [x] 5.5 Add system theme detection with matchMedia
  - [x] 5.6 Create theme toggle component with sun/moon icons
  - [x] 5.7 Apply theme variables to all UI components
  - [x] 5.8 Verify all tests pass
