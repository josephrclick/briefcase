# Spec Requirements Document

> Spec: Critical Bug Fixes and UI Improvements
> Created: 2025-09-01

## Overview

Fix critical compatibility issues with GPT-5 models and complete UI refinements to ensure proper functionality with the latest OpenAI models and optimal user experience. These fixes address model parameter errors, UI width utilization, button placement issues, and dark mode visibility problems.

## User Stories

### Using GPT-5 Models

As a knowledge worker using the latest AI models, I want to use GPT-5-nano and other GPT-5 models for summarization, so that I can leverage the most advanced and cost-effective models available.

When I select a GPT-5 model from the dropdown, the extension should properly configure the API request with `max_completion_tokens` instead of the deprecated `max_tokens` parameter. The summarization should work seamlessly without errors, providing the same streaming experience as with GPT-4 models.

### Maximizing Side Panel Space

As a user with limited screen real estate, I want the side panel to use every pixel of available width, so that I can read content more comfortably without unnecessary white space.

The side panel should extend fully to the right edge without any unused white strips, maximizing the readable area for both extracted content and summaries.

### Managing Extension Data

As a user concerned about privacy, I want the Delete All Data button to be clearly positioned within the Danger Zone section, so that I can intentionally access this destructive action only when needed.

The Delete All Data button should remain within the settings tab's Danger Zone section, not floating in the top right corner of the interface where it could be accidentally clicked.

### Dark Mode Readability

As a user who prefers dark mode, I want all button text to be clearly readable, so that I can use all features without straining my eyes.

The Refresh and Test Connection buttons should have the same readable text color as the Try Again button in dark mode, ensuring consistent visibility across all interactive elements.

## Spec Scope

1. **GPT-5 Model Parameter Fix** - Update OpenAI provider to use `max_completion_tokens` for GPT-5 models while maintaining `max_tokens` for GPT-4 and earlier models
2. **Complete Width Optimization** - Remove all remaining padding/margins that create unused space on the right side of the panel
3. **Delete Button Positioning** - Fix CSS to ensure Delete All Data button stays within Danger Zone section
4. **Dark Mode Button Styling** - Update button text colors for consistent readability in dark mode
5. **Parameter Validation** - Review and validate all OpenAI API parameters to prevent future compatibility issues

## Out of Scope

- Adding new model options beyond fixing existing ones
- Redesigning the settings interface
- Changing the overall layout structure
- Adding new dark mode color schemes
- Implementing model-specific UI features

## Expected Deliverable

1. GPT-5 models (including GPT-5-nano) work without parameter errors when selected
2. Side panel content extends fully to the right edge with no white strip visible
3. Delete All Data button appears only within the Danger Zone section of settings tab
