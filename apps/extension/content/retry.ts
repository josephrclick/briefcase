/**
 * Retry logic for transient failures
 */

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  shouldRetry: (error: Error) => {
    // Retry on network errors, timeouts, and temporary DOM issues
    const retryableMessages = [
      "timeout",
      "network",
      "failed to fetch",
      "dom",
      "mutation",
      "loading",
    ];

    const message = error.message.toLowerCase();
    return retryableMessages.some((keyword) => message.includes(keyword));
  },
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = config.initialDelay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if this is the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Don't retry if the error is not retryable
      if (!config.shouldRetry(lastError)) {
        break;
      }

      // Wait before retrying with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next attempt
      delay = Math.min(delay * config.backoffFactor, config.maxDelay);
    }
  }

  // If we get here, all attempts failed
  if (lastError) {
    throw lastError;
  }

  throw new Error("Operation failed after all retry attempts");
}

/**
 * Specific retry configuration for content extraction
 */
export const extractionRetryOptions: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 500,
  maxDelay: 5000,
  backoffFactor: 2,
  shouldRetry: (error: Error) => {
    // Don't retry on explicit extraction errors that won't improve
    const nonRetryableMessages = [
      "minimum content",
      "unsupported page",
      "pdf",
      "iframe",
      "manual selection",
      "api key",
      "not suitable for readability",
    ];

    const message = error.message.toLowerCase();

    // Don't retry if it's a known non-retryable error
    if (nonRetryableMessages.some((keyword) => message.includes(keyword))) {
      return false;
    }

    // Retry on other errors (network, timeouts, temporary DOM issues)
    return true;
  },
};
