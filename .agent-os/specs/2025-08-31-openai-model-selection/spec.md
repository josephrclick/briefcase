# Spec Requirements Document

> Spec: OpenAI Model Selection
> Created: 2025-08-31

## Overview

Implement a model selection feature that allows users to choose between GPT-5-nano, GPT-4o-mini, and GPT-4.1-nano for text summarization, with automatic parameter adaptation based on the selected model's requirements. This feature will optimize cost and performance by letting users select the most appropriate model for their needs while ensuring compatibility with each model's specific API parameters.

## User Stories

### Model Selection for Cost-Conscious Users

As a budget-conscious user, I want to select GPT-5-nano for my summarizations, so that I can minimize API costs while still getting quality summaries.

The user opens the settings panel and sees a new dropdown in the OpenAI Configuration section listing three available models. They select "GPT-5-nano" from the dropdown, which automatically persists their choice. When they extract and summarize content, the extension uses GPT-5-nano with appropriate parameters (no temperature, using verbosity instead) without requiring any additional configuration from the user.

### Seamless Model Switching

As a power user, I want to switch between different models based on my current needs, so that I can balance quality, speed, and cost for different types of content.

The user has been using GPT-4o-mini but wants to try the faster GPT-5-nano for a batch of simple articles. They open settings, change the model selection from the dropdown, and the choice is immediately saved. The extension automatically adjusts its API parameters - removing temperature settings and adding verbosity parameters - ensuring the API calls succeed without errors.

## Spec Scope

1. **Model Selection Dropdown** - Add a dropdown in the OpenAI Configuration section with three model options: GPT-5-nano, GPT-4o-mini, and GPT-4.1-nano
2. **Settings Persistence** - Store the selected model in chrome.storage.local and load it on extension startup
3. **Parameter Adaptation** - Implement model-aware parameter logic that uses temperature for GPT-4 models and verbosity/reasoning_effort for GPT-5 models
4. **UI Simplification** - Remove the redundant "Change API Key" button while keeping the expand/collapse functionality
5. **Legacy Model Cleanup** - Remove all references to deprecated models (gpt-3.5-turbo, gpt-4o) from the codebase

## Out of Scope

- Migration to the new Responses API endpoint (will continue using Chat Completions API)
- Implementing model-specific prompt optimizations
- Adding cost estimation or usage tracking features
- Supporting additional OpenAI models beyond the three specified
- Chunking or handling documents larger than 12k characters

## Expected Deliverable

1. Users can select their preferred OpenAI model from a dropdown that persists across sessions
2. API calls succeed with all three models without parameter-related errors
3. The settings UI is cleaner with the removal of the redundant "Change API Key" button
