# Spec Tasks

## Tasks

- [x] 1. Update Settings Data Model and Service
  - [x] 1.1 Write tests for new selectedModel field in SettingsData interface
  - [x] 1.2 Add OpenAIModel type definition with three supported models
  - [x] 1.3 Update SettingsData interface to include selectedModel field
  - [x] 1.4 Add selectedModel to DEFAULT_SETTINGS with "gpt-4o-mini" as default
  - [x] 1.5 Add saveModelSelection method to SettingsService
  - [x] 1.6 Verify all settings tests pass

- [x] 2. Implement Model Parameter Mapping Logic
  - [x] 2.1 Write tests for getModelParameters function with different model inputs
  - [x] 2.2 Create getModelParameters function in OpenAIProvider
  - [x] 2.3 Update OpenAIProvider constructor to accept optional model parameter
  - [x] 2.4 Modify summarize method to use dynamic model and parameters
  - [x] 2.5 Modify summarizeComplete method to use dynamic model and parameters
  - [x] 2.6 Remove hardcoded "gpt-3.5-turbo" references
  - [x] 2.7 Verify all OpenAIProvider tests pass

- [x] 3. Update UI Components for Model Selection
  - [x] 3.1 Write tests for model selection dropdown functionality
  - [x] 3.2 Add model selection dropdown to EnhancedSettings component
  - [x] 3.3 Implement onChange handler for model selection persistence
  - [x] 3.4 Remove "Change API Key" button and its click handler
  - [x] 3.5 Update UI to show model-friendly display names
  - [x] 3.6 Verify settings UI tests pass

- [x] 4. Clean Up Legacy Model References
  - [x] 4.1 Search and document all occurrences of deprecated models
  - [x] 4.2 Update CLAUDE.md to reference new supported models
  - [x] 4.3 Update test fixtures to use new model names
  - [x] 4.4 Remove gpt-3.5-turbo from openai-provider.test.ts
  - [x] 4.5 Update any inline comments referencing old models
  - [x] 4.6 Verify no deprecated model references remain

- [x] 5. Integration Testing and Validation
  - [x] 5.1 Test API calls with GPT-5-nano (no temperature, with verbosity)
  - [x] 5.2 Test API calls with GPT-4o-mini (with temperature, no verbosity)
  - [x] 5.3 Test API calls with GPT-4.1-nano (no temperature, with verbosity)
  - [x] 5.4 Test model switching and parameter adaptation
  - [x] 5.5 Test settings persistence across extension restarts
  - [x] 5.6 Run full test suite and verify all tests pass
