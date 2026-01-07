/**
 * Retry a function with exponential backoff
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelay - Initial delay in ms (default: 1000)
 * @param maxDelay - Maximum delay in ms (default: 10000)
 * @param backoffFactor - Exponential backoff factor (default: 2)
 * @returns Promise with the result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  maxDelay: number = 10000,
  backoffFactor: number = 2
): Promise<T> {
  let lastError: Error | unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      )

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay
      const totalDelay = delay + jitter

      console.warn(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(totalDelay)}ms`,
        error
      )

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, totalDelay))
    }
  }

  throw lastError
}

/**
 * Retry with custom retry condition
 * @param fn - The async function to retry
 * @param shouldRetry - Function to determine if we should retry based on the error
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Promise with the result of the function
 */
export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown, attempt: number) => boolean,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      if (attempt === maxRetries || !shouldRetry(error, attempt)) {
        break
      }

      const delay = 1000 * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Determines if an HTTP error is retryable
 */
export function isRetryableHTTPError(error: unknown): boolean {
  if (error instanceof Response) {
    // Retry on 5xx server errors and 429 rate limit
    return error.status >= 500 || error.status === 429
  }

  if (error instanceof Error) {
    // Retry on network errors
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('fetch failed') ||
      message.includes('econnreset') ||
      message.includes('timeout')
    )
  }

  return false
}
