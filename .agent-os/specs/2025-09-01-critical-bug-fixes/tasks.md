# Spec Tasks

## Tasks

- [x] 1. Fix GPT-5 model parameter compatibility
  - [x] 1.1 Write tests for model-specific parameter selection
  - [x] 1.2 Update getModelParameters method to detect GPT-5 models
  - [x] 1.3 Modify summarizeStream to use max_completion_tokens for GPT-5
  - [x] 1.4 Modify summarizeComplete to use max_completion_tokens for GPT-5
  - [x] 1.5 Test with GPT-5-nano model to verify fix
  - [x] 1.6 Verify all tests pass

- [x] 2. Complete UI width optimization
  - [x] 2.1 Write tests for CSS width verification
  - [x] 2.2 Remove padding from .side-panel container
  - [x] 2.3 Set .tab-content padding to 0 for left/right
  - [x] 2.4 Adjust .streaming-summarizer padding
  - [x] 2.5 Audit and fix parent container margins
  - [x] 2.6 Test width across all tabs
  - [x] 2.7 Verify all tests pass

- [x] 3. Fix Delete All Data button positioning
  - [x] 3.1 Write tests for button placement
  - [x] 3.2 Investigate current CSS causing misplacement
  - [x] 3.3 Remove absolute positioning if present
  - [x] 3.4 Ensure button stays within .danger-zone container
  - [x] 3.5 Test in both light and dark modes
  - [x] 3.6 Verify all tests pass

- [x] 4. Fix dark mode button text visibility
  - [x] 4.1 Write tests for button text contrast
  - [x] 4.2 Update .secondary button text color for dark mode
  - [x] 4.3 Fix Test Connection button text color
  - [x] 4.4 Fix Refresh button text color
  - [x] 4.5 Match styling with Try Again button
  - [x] 4.6 Verify accessibility standards
  - [x] 4.7 Verify all tests pass
