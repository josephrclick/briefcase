# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-31-openai-integration/spec.md

## Provider Interface

### OpenAIProvider Class

```typescript
interface SummarizationParams {
  length: "brief" | "medium";
  style: "bullets" | "plain";
}

interface SummarizationResult {
  keyPoints: string[];
  tldr: string;
  tokensUsed?: number;
}

class OpenAIProvider {
  constructor(apiKey: string);

  async validateApiKey(): Promise<boolean>;

  summarize(text: string, params: SummarizationParams): ReadableStream<string>;

  async summarizeComplete(
    text: string,
    params: SummarizationParams,
  ): Promise<SummarizationResult>;
}
```

## Message Passing API

### Background Script Messages

#### Summarize Request

```typescript
// From: Side Panel
// To: Background Script
{
  type: 'SUMMARIZE_REQUEST',
  payload: {
    text: string;
    documentId: string;
    params: {
      length: 'brief' | 'medium';
      style: 'bullets' | 'plain';
    }
  }
}
```

#### Streaming Response

```typescript
// From: Background Script
// To: Side Panel
{
  type: 'SUMMARIZE_STREAM',
  payload: {
    documentId: string;
    chunk: string;
    isComplete: boolean;
    error?: string;
  }
}
```

#### Settings Update

```typescript
// From: Side Panel
// To: Background Script
{
  type: 'UPDATE_OPENAI_SETTINGS',
  payload: {
    apiKey?: string;
    defaultParams?: {
      length: 'brief' | 'medium';
      style: 'bullets' | 'plain';
    }
  }
}
```

#### API Key Validation

```typescript
// Request
{
  type: 'VALIDATE_API_KEY',
  payload: {
    apiKey: string;
  }
}

// Response
{
  type: 'API_KEY_VALIDATION_RESULT',
  payload: {
    isValid: boolean;
    error?: string;
  }
}
```

## Storage API

### Settings Structure

```typescript
// chrome.storage.local
{
  settings: {
    openaiApiKey: string; // Encrypted if possible
    summarization: {
      defaultLength: "brief" | "medium";
      defaultStyle: "bullets" | "plain";
      model: "gpt-3.5-turbo" | "gpt-4";
      maxTokens: number;
    }
    privacyBannerDismissed: boolean;
  }
}
```

### Document Update with Summary

```typescript
// chrome.storage.local
{
  [`doc:${id}`]: {
    // ... existing fields
    summaryText?: {
      keyPoints: string[];
      tldr: string;
      generatedAt: number;
      model: string;
      params: SummarizationParams;
    }
  }
}
```
