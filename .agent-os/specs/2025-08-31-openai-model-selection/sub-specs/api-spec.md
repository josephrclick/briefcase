# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-31-openai-model-selection/spec.md

## OpenAI API Parameter Differences

### GPT-5 Family Models (gpt-5-nano, gpt-4.1-nano)

**Endpoint:** POST https://api.openai.com/v1/chat/completions

**Required Parameters:**

```json
{
  "model": "gpt-5-nano",
  "messages": [...],
  "max_tokens": 200,
  "stream": true,
  "verbosity": "low",
  "reasoning_effort": "minimal"
}
```

**Prohibited Parameters:**

- `temperature` - Must be omitted or set to 1.0 (will cause 400 error if set to other values)

**New Parameters:**

- `verbosity`: Controls response length
  - "low" - Terse, minimal prose (best for summaries)
  - "medium" - Balanced detail (default)
  - "high" - Verbose, detailed
- `reasoning_effort`: Controls reasoning depth
  - "minimal" - Fast, for simple tasks
  - "medium" - Default
  - "high" - Deep reasoning

### GPT-4 Family Models (gpt-4o-mini)

**Endpoint:** POST https://api.openai.com/v1/chat/completions

**Required Parameters:**

```json
{
  "model": "gpt-4o-mini",
  "messages": [...],
  "max_tokens": 200,
  "stream": true,
  "temperature": 0.3
}
```

**Traditional Parameters:**

- `temperature`: 0.0 to 2.0 (controls randomness)
- Does NOT support `verbosity` or `reasoning_effort`

## Parameter Mapping Implementation

```typescript
interface GPT5Parameters {
  model: string;
  messages: any[];
  max_tokens: number;
  stream: boolean;
  verbosity: "low" | "medium" | "high";
  reasoning_effort: "minimal" | "medium" | "high";
}

interface GPT4Parameters {
  model: string;
  messages: any[];
  max_tokens: number;
  stream: boolean;
  temperature: number;
}

function getModelParameters(
  model: OpenAIModel,
  baseParams: any,
): GPT5Parameters | GPT4Parameters {
  const isGPT5Family = model === "gpt-5-nano" || model === "gpt-4.1-nano";

  if (isGPT5Family) {
    return {
      ...baseParams,
      verbosity: "low",
      reasoning_effort: "minimal",
      // NO temperature
    };
  } else {
    return {
      ...baseParams,
      temperature: 0.3,
      // NO verbosity or reasoning_effort
    };
  }
}
```

## Error Handling

### Expected Errors for Incorrect Parameters

**GPT-5 with temperature parameter:**

```json
{
  "error": {
    "message": "temperature parameter is unsupported for gpt-5-nano, only the default (1) value is supported",
    "type": "invalid_request_error",
    "code": 400
  }
}
```

**GPT-4 with verbosity parameter:**

```json
{
  "error": {
    "message": "Unrecognized request argument supplied: verbosity",
    "type": "invalid_request_error",
    "code": 400
  }
}
```

## Response Format

All models return the same response structure, ensuring compatibility:

```json
{
  "choices": [
    {
      "message": {
        "content": "...",
        "role": "assistant"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "total_tokens": 150
  }
}
```
