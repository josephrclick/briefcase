# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-09-01-critical-bug-fixes/spec.md

## Technical Requirements

### GPT-5 Model Parameter Compatibility

- Modify `OpenAIProvider.summarizeStream()` and `OpenAIProvider.summarizeComplete()` methods to conditionally use correct parameter
- For GPT-5 models: Use `max_completion_tokens` parameter instead of `max_tokens`
- For GPT-4 and earlier models: Continue using `max_tokens` parameter
- Update the `getModelParameters()` method to return model-specific configurations
- Implement parameter selection logic based on model name prefix detection
- Ensure backward compatibility with existing GPT-4 configurations

### UI Width Optimization

- Audit all container elements from `.side-panel` down to content areas
- Set `.side-panel` and `.tab-content` padding to 0 on left and right sides
- Adjust `.streaming-summarizer` to use full width with minimal internal padding
- Remove or minimize right padding/margin on all parent containers
- Verify no parent element has margin or padding creating the white strip
- Test width utilization across all three tabs (Summarize, History, Settings)

### Delete All Data Button Positioning

- Investigate current CSS positioning that causes button misplacement
- Remove any absolute positioning that takes button out of document flow
- Ensure button remains within `.danger-zone` container
- Apply proper styling to maintain button within settings section
- Verify button doesn't overlap with other UI elements
- Test button placement in both light and dark modes

### Dark Mode Button Styling

- Identify CSS variables used for button text in dark mode
- Update `.secondary` button class text color for dark mode
- Ensure Test Connection button uses readable text color
- Ensure Refresh button uses readable text color
- Match text color styling with existing Try Again button
- Verify contrast ratios meet accessibility standards

### Parameter Validation Review

- Audit all OpenAI API parameters currently being sent
- Remove deprecated parameters for GPT-5 models (temperature, etc.)
- Ensure `verbosity` and `reasoning_effort` are properly set for GPT-5
- Validate that no unsupported parameters are sent to any model
- Add error handling for parameter-related API errors
- Document supported parameters per model family
