# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-31-openai-model-selection/spec.md

## Technical Requirements

### Model Configuration

- Define a TypeScript type for supported models: `type OpenAIModel = "gpt-5-nano" | "gpt-4o-mini" | "gpt-4.1-nano"`
- Add `selectedModel` field to `SettingsData` interface with default value "gpt-4o-mini"
- Persist model selection in `chrome.storage.local` using existing SettingsService

### Parameter Mapping Logic

- Create a `getModelParameters` function in OpenAIProvider that:
  - Detects model family (GPT-5 vs GPT-4) based on model name
  - Returns appropriate parameters based on model family:
    - GPT-5 family (gpt-5-nano, gpt-4.1-nano): omit `temperature`, add `verbosity: "low"` and `reasoning_effort: "minimal"`
    - GPT-4 family (gpt-4o-mini): include `temperature: 0.3`, omit `verbosity` and `reasoning_effort`
- Apply parameter mapping in both `summarize()` and `summarizeComplete()` methods

### UI Components

- Add model selection dropdown in EnhancedSettings component:
  - Position below API key input field
  - Include label "Model" with help text "Choose the AI model for summarization"
  - Populate with three options: "GPT-5 Nano (Fastest, Cheapest)", "GPT-4o Mini (Balanced)", "GPT-4.1 Nano (Fast, Large Context)"
  - Trigger settings save on change
- Remove "Change API Key" button and associated click handler
- Maintain expand/collapse functionality using only the chevron icon

### API Integration

- Update OpenAIProvider constructor to accept optional model parameter
- Modify `summarize()` and `summarizeComplete()` methods to:
  - Accept model from settings or constructor
  - Use model-specific parameters via `getModelParameters()`
  - Pass dynamic model value instead of hardcoded "gpt-3.5-turbo"

### Code Cleanup

- Remove all references to deprecated models:
  - gpt-3.5-turbo (currently hardcoded in two places)
  - gpt-4o (in documentation)
  - Any other legacy model references in comments or tests

### Testing Considerations

- Ensure mock implementations in tests support new model parameter
- Update test fixtures to use new model names
- Verify streaming works with all three models
- Test parameter mapping logic with unit tests

## Performance Criteria

- Model selection dropdown should load instantly with saved preference
- API calls should not fail due to incorrect parameters for any model
- No increase in bundle size beyond necessary type definitions
- Settings persistence should work identically to existing preferences
