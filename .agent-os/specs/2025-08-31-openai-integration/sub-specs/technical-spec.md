# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-31-openai-integration/spec.md

## Technical Requirements

### Provider Implementation

- Create `OpenAIProvider` class implementing the provider interface
- Method signature: `summarize({text, params}) → ReadableStream`
- Support for streaming responses using OpenAI's streaming API
- Proper error handling and retry logic for API failures

### API Integration

- Use OpenAI Chat Completions API (gpt-3.5-turbo or gpt-4)
- Implement streaming using Server-Sent Events (SSE) or fetch with ReadableStream
- Handle rate limiting with exponential backoff
- Validate API key format and test connectivity

### Prompt Engineering

- System prompt: "You are a concise, accurate summarizer. Extract the most important information from the provided text."
- User prompt structure with article text (truncated to 12k characters)
- Output format with markdown sections: **Key Points** (bullet list) and **TL;DR** (2-3 sentences)
- Support for length parameter (brief: 100-150 words, medium: 200-300 words)
- Support for style parameter (bullets or plain text)

### Storage Integration

- Store API key in `chrome.storage.local` under `settings.openaiApiKey`
- Never log or expose API key in console or error messages
- Encrypt API key if possible using Chrome's built-in encryption
- Store summarization preferences in `settings.summarization`

### UI/UX Specifications

- Settings panel with password input field for API key
- "Test Connection" button to validate API key
- Summarization parameter dropdowns (length, style)
- Streaming display component showing tokens as they arrive
- Loading spinner during API calls
- Error states with clear messages and retry buttons

### Error Handling

- Network errors: "Failed to connect to OpenAI. Please check your internet connection."
- Invalid API key: "Invalid API key. Please check your OpenAI API key in settings."
- Rate limiting: "Rate limit exceeded. Please try again in a few moments."
- Token limit: "Content too long. Maximum 12,000 characters supported."
- Generic errors: "Failed to generate summary. Please try again."

### Performance Criteria

- Initial response within 3 seconds of request
- Smooth token streaming without UI freezing
- Graceful degradation on slow connections
- Cancel ongoing requests when panel closes

## External Dependencies

- **openai** (^4.0.0) - Official OpenAI JavaScript client library for API integration
- **Justification:** Official library provides robust streaming support, automatic retries, and TypeScript types
