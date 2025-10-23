import { https } from 'firebase-functions/v2';

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: string;
  code: string;
  details?: string;
  retryable: boolean;
}

/**
 * Error codes for AI features
 */
export enum AIErrorCode {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  OPENAI_API_ERROR = 'OPENAI_API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_MODEL = 'INVALID_MODEL',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: AIErrorCode,
  message: string,
  details?: string,
  retryable: boolean = false
): ErrorResponse {
  return {
    error: message,
    code,
    details,
    retryable,
  };
}

/**
 * Handle OpenAI API errors
 */
export function handleOpenAIError(error: any): ErrorResponse {
  console.error('OpenAI API Error:', error);

  // Rate limit errors
  if (error.status === 429) {
    return createErrorResponse(
      AIErrorCode.QUOTA_EXCEEDED,
      'OpenAI API quota exceeded. Please try again later.',
      error.message,
      true
    );
  }

  // Authentication errors
  if (error.status === 401 || error.status === 403) {
    return createErrorResponse(
      AIErrorCode.AUTHENTICATION_ERROR,
      'OpenAI API authentication failed.',
      error.message,
      false
    );
  }

  // Invalid request errors
  if (error.status === 400) {
    return createErrorResponse(
      AIErrorCode.INVALID_INPUT,
      'Invalid request to OpenAI API.',
      error.message,
      false
    );
  }

  // Timeout errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return createErrorResponse(
      AIErrorCode.TIMEOUT,
      'Request to OpenAI API timed out.',
      error.message,
      true
    );
  }

  // Server errors (retryable)
  if (error.status >= 500) {
    return createErrorResponse(
      AIErrorCode.OPENAI_API_ERROR,
      'OpenAI API is temporarily unavailable.',
      error.message,
      true
    );
  }

  // Generic error
  return createErrorResponse(
    AIErrorCode.OPENAI_API_ERROR,
    'Failed to process request with OpenAI API.',
    error.message,
    false
  );
}

/**
 * Validate request has required authentication
 */
export function validateAuth(context: https.CallableRequest): string {
  if (!context.auth) {
    throw new https.HttpsError(
      'unauthenticated',
      'User must be authenticated to use AI features.'
    );
  }
  return context.auth.uid;
}

/**
 * Validate input text
 */
export function validateTextInput(
  text: string | undefined | null,
  fieldName: string = 'text',
  minLength: number = 1,
  maxLength: number = 5000
): string {
  if (!text || typeof text !== 'string') {
    throw new https.HttpsError(
      'invalid-argument',
      `${fieldName} is required and must be a string.`
    );
  }

  const trimmed = text.trim();

  if (trimmed.length < minLength) {
    throw new https.HttpsError(
      'invalid-argument',
      `${fieldName} must be at least ${minLength} character(s).`
    );
  }

  if (trimmed.length > maxLength) {
    throw new https.HttpsError(
      'invalid-argument',
      `${fieldName} must be no more than ${maxLength} characters.`
    );
  }

  return trimmed;
}

/**
 * Validate language code
 */
export function validateLanguageCode(
  lang: string | undefined | null,
  fieldName: string = 'targetLanguage'
): string {
  if (!lang || typeof lang !== 'string') {
    throw new https.HttpsError(
      'invalid-argument',
      `${fieldName} is required and must be a string.`
    );
  }

  const trimmed = lang.trim().toLowerCase();

  // Basic validation - should be 2-5 characters (ISO language codes)
  if (trimmed.length < 2 || trimmed.length > 5) {
    throw new https.HttpsError(
      'invalid-argument',
      `${fieldName} must be a valid language code (e.g., 'en', 'es', 'fr').`
    );
  }

  return trimmed;
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>
): Promise<T> {
  return fn().catch((error) => {
    if (error instanceof https.HttpsError) {
      throw error;
    }

    // Log unexpected errors
    console.error('Unexpected error:', error);

    throw new https.HttpsError(
      'internal',
      'An unexpected error occurred. Please try again.',
      error.message
    );
  });
}

