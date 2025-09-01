# Spec Tasks

## Tasks

- [ ] 1. Fix GPT-5 model parameter compatibility
  - [ ] 1.1 Write tests for model-specific parameter selection
  - [ ] 1.2 Update getModelParameters method to detect GPT-5 models
  - [ ] 1.3 Modify summarizeStream to use max_completion_tokens for GPT-5
  - [ ] 1.4 Modify summarizeComplete to use max_completion_tokens for GPT-5
  - [ ] 1.5 Test with GPT-5-nano model to verify fix
  - [ ] 1.6 Verify all tests pass

- [ ] 2. Complete UI width optimization
  - [ ] 2.1 Write tests for CSS width verification
  - [ ] 2.2 Remove padding from .side-panel container
  - [ ] 2.3 Set .tab-content padding to 0 for left/right
  - [ ] 2.4 Adjust .streaming-summarizer padding
  - [ ] 2.5 Audit and fix parent container margins
  - [ ] 2.6 Test width across all tabs
  - [ ] 2.7 Verify all tests pass

- [ ] 3. Fix Delete All Data button positioning
  - [ ] 3.1 Write tests for button placement
  - [ ] 3.2 Investigate current CSS causing misplacement
  - [ ] 3.3 Remove absolute positioning if present
  - [ ] 3.4 Ensure button stays within .danger-zone container
  - [ ] 3.5 Test in both light and dark modes
  - [ ] 3.6 Verify all tests pass

- [ ] 4. Fix dark mode button text visibility
  - [ ] 4.1 Write tests for button text contrast
  - [ ] 4.2 Update .secondary button text color for dark mode
  - [ ] 4.3 Fix Test Connection button text color
  - [ ] 4.4 Fix Refresh button text color
  - [ ] 4.5 Match styling with Try Again button
  - [ ] 4.6 Verify accessibility standards
  - [ ] 4.7 Verify all tests pass
