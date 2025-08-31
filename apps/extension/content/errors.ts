/**
 * Custom error types for content extraction
 */

export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

export class UnsupportedPageError extends ExtractionError {
  constructor(reason: string) {
    super(`Page not supported: ${reason}`, "UNSUPPORTED_PAGE");
    this.name = "UnsupportedPageError";
  }
}

export class MinimumContentError extends ExtractionError {
  constructor(
    public readonly actualLength: number,
    public readonly requiredLength: number,
  ) {
    super(
      `Content too short: ${actualLength} characters (minimum ${requiredLength} required)`,
      "MINIMUM_CONTENT",
    );
    this.name = "MinimumContentError";
  }
}

export class ExtractionTimeoutError extends ExtractionError {
  constructor(public readonly timeout: number) {
    super(`Extraction timed out after ${timeout}ms`, "EXTRACTION_TIMEOUT");
    this.name = "ExtractionTimeoutError";
  }
}

export class DOMStabilityTimeoutError extends ExtractionError {
  constructor(public readonly timeout: number) {
    super(`DOM did not stabilize within ${timeout}ms`, "DOM_STABILITY_TIMEOUT");
    this.name = "DOMStabilityTimeoutError";
  }
}

export class ReadabilityError extends ExtractionError {
  constructor(message: string) {
    super(`Readability extraction failed: ${message}`, "READABILITY_FAILED");
    this.name = "ReadabilityError";
  }
}

export class ManualSelectionError extends ExtractionError {
  constructor(message: string) {
    super(`Manual selection failed: ${message}`, "MANUAL_SELECTION_FAILED");
    this.name = "ManualSelectionError";
  }
}

export class MessagePassingError extends ExtractionError {
  constructor(message: string) {
    super(`Message passing failed: ${message}`, "MESSAGE_PASSING_FAILED");
    this.name = "MessagePassingError";
  }
}
