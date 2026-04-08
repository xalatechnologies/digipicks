/**
 * API Error Utilities for RFC 7807 Problem Details parsing
 *
 * Provides utilities for parsing and handling API errors in the RFC 7807
 * Problem Details format, converting them to user-friendly Norwegian messages.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */

// =============================================================================
// RFC 7807 Problem Details Interface
// =============================================================================

/**
 * RFC 7807 Problem Details format
 * Standard format for representing API errors
 */
export interface ProblemDetails {
  /** URI reference identifying the problem type */
  type: string;
  /** Short, human-readable summary of the problem */
  title: string;
  /** HTTP status code */
  status: number;
  /** Human-readable explanation specific to this occurrence */
  detail?: string;
  /** URI reference identifying the specific occurrence */
  instance?: string;
  /** Additional error information */
  errors?: Record<string, string[]>;
  /** Correlation ID for error tracking */
  correlationId?: string;
}

/**
 * Parsed API error with user-friendly message
 */
export interface ParsedApiError {
  /** Original Problem Details (if available) */
  problemDetails: ProblemDetails | null;
  /** User-friendly title in Norwegian */
  title: string;
  /** User-friendly description in Norwegian */
  description: string;
  /** HTTP status code (0 for network errors) */
  status: number;
  /** Error category for UI handling */
  category: ApiErrorCategory;
  /** Whether the error is retryable */
  isRetryable: boolean;
  /** Field-level validation errors (if any) */
  fieldErrors?: Record<string, string[]>;
  /** Correlation ID for support reference */
  correlationId?: string;
}

/**
 * Error categories for UI handling
 */
export type ApiErrorCategory =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'server_error'
  | 'unknown';

// =============================================================================
// Norwegian Error Messages
// =============================================================================

const norwegianMessages: Record<ApiErrorCategory, { title: string; description: string }> = {
  network: {
    title: 'Nettverksfeil',
    description: 'Kunne ikke koble til serveren. Sjekk internettforbindelsen din og prøv igjen.',
  },
  timeout: {
    title: 'Forespørselen tok for lang tid',
    description: 'Serveren svarte ikke i tide. Prøv igjen senere.',
  },
  unauthorized: {
    title: 'Du er ikke logget inn',
    description: 'Du må logge inn for å utføre denne handlingen.',
  },
  forbidden: {
    title: 'Ingen tilgang',
    description: 'Du har ikke tilgang til denne ressursen.',
  },
  not_found: {
    title: 'Ikke funnet',
    description: 'Ressursen du leter etter finnes ikke.',
  },
  validation: {
    title: 'Ugyldig data',
    description: 'Det var feil i dataene du sendte inn. Sjekk feltene og prøv igjen.',
  },
  conflict: {
    title: 'Konflikt',
    description: 'Handlingen kunne ikke fullføres på grunn av en konflikt.',
  },
  server_error: {
    title: 'Serverfeil',
    description: 'Det oppstod en feil på serveren. Prøv igjen senere.',
  },
  unknown: {
    title: 'Noe gikk galt',
    description: 'Beklager, det oppstod en uventet feil. Prøv igjen senere.',
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Categorize HTTP status codes into error categories
 */
function categorizeStatus(status: number): ApiErrorCategory {
  if (status === 0) return 'network';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 408 || status === 504) return 'timeout';
  if (status === 409) return 'conflict';
  if (status >= 400 && status < 500) return 'validation';
  if (status >= 500) return 'server_error';
  return 'unknown';
}

/**
 * Determine if an error is retryable
 */
function isRetryableCategory(category: ApiErrorCategory): boolean {
  return ['network', 'timeout', 'server_error'].includes(category);
}

/**
 * Check if a value looks like RFC 7807 Problem Details
 */
function isProblemDetails(value: unknown): value is ProblemDetails {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  // RFC 7807 requires type, title, and status
  return (
    typeof obj.type === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.status === 'number'
  );
}

/**
 * Extract Problem Details from various error response formats
 */
function extractProblemDetails(
  response: unknown
): ProblemDetails | null {
  // Direct Problem Details format
  if (isProblemDetails(response)) {
    return response;
  }

  // Nested in error property (common pattern)
  if (typeof response === 'object' && response !== null) {
    const obj = response as Record<string, unknown>;

    if (obj.error && isProblemDetails(obj.error)) {
      return obj.error;
    }

    // SDK ApiError format conversion
    if (
      typeof obj.message === 'string' &&
      typeof obj.code === 'string' &&
      typeof obj.status === 'number'
    ) {
      const result: ProblemDetails = {
        type: `urn:error:${obj.code}`,
        title: obj.message,
        status: obj.status,
      };

      // Only add optional properties if they have values
      if (typeof obj.details === 'string') {
        result.detail = obj.details;
      }
      if (isValidationErrors(obj.details)) {
        result.errors = obj.details;
      }

      return result;
    }
  }

  return null;
}

/**
 * Check if details is a validation errors object
 */
function isValidationErrors(
  details: unknown
): details is Record<string, string[]> {
  if (typeof details !== 'object' || details === null) {
    return false;
  }

  return Object.values(details).every(
    (value) => Array.isArray(value) && value.every((v) => typeof v === 'string')
  );
}

// =============================================================================
// Main Parser Functions
// =============================================================================

/**
 * Parse an API response error into a user-friendly format
 *
 * @param response - The error response body (parsed JSON)
 * @param status - HTTP status code (optional, will try to extract from response)
 * @returns Parsed error with Norwegian messages
 *
 * @example
 * ```typescript
 * try {
 *   const data = await api.getBooking(id);
 * } catch (error) {
 *   const parsed = parseApiError(error);
 *   showError(parsed.title, parsed.description);
 * }
 * ```
 */
export function parseApiError(
  response: unknown,
  status?: number
): ParsedApiError {
  const problemDetails = extractProblemDetails(response);

  // Extract status from problem details if not provided
  const errorStatus = status ?? problemDetails?.status ?? 0;
  const category = categorizeStatus(errorStatus);
  const baseMessage = norwegianMessages[category];

  // Use problem details for more specific messages
  let title = baseMessage.title;
  let description = baseMessage.description;

  if (problemDetails) {
    // For validation errors with detail, use the detail
    if (category === 'validation' && problemDetails.detail) {
      description = problemDetails.detail;
    }

    // For server errors with a specific title, use it
    if (category === 'server_error' && problemDetails.title !== 'Internal Server Error') {
      title = problemDetails.title;
    }

    // If detail is provided and is user-friendly, use it
    if (problemDetails.detail && problemDetails.detail.length < 200) {
      description = problemDetails.detail;
    }
  }

  const result: ParsedApiError = {
    problemDetails,
    title,
    description,
    status: errorStatus,
    category,
    isRetryable: isRetryableCategory(category),
  };

  // Only add optional properties if they have values
  if (problemDetails?.errors) {
    result.fieldErrors = problemDetails.errors;
  }
  if (problemDetails?.correlationId) {
    result.correlationId = problemDetails.correlationId;
  }

  return result;
}

/**
 * Parse an Error object (including ApiError from SDK)
 *
 * @param error - JavaScript Error object
 * @returns Parsed error with Norwegian messages
 *
 * @example
 * ```typescript
 * try {
 *   await bookingService.create(data);
 * } catch (error) {
 *   const parsed = parseErrorObject(error);
 *   // Use with ErrorScreen or toast
 * }
 * ```
 */
export function parseErrorObject(error: Error): ParsedApiError {
  // Check for ApiError from SDK (has status and code properties)
  const apiError = error as Error & {
    status?: number;
    code?: string;
    details?: Record<string, unknown>;
  };

  // Network error detection
  if (
    error.name === 'TypeError' &&
    (error.message.includes('fetch') || error.message.includes('network'))
  ) {
    return {
      problemDetails: null,
      ...norwegianMessages.network,
      status: 0,
      category: 'network',
      isRetryable: true,
    };
  }

  // Abort/Timeout error
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return {
      problemDetails: null,
      ...norwegianMessages.timeout,
      status: 408,
      category: 'timeout',
      isRetryable: true,
    };
  }

  // Chunk load failure (dynamic import)
  if (
    error.message.includes('Loading chunk') ||
    error.message.includes('ChunkLoadError') ||
    error.message.includes('dynamically imported module')
  ) {
    return {
      problemDetails: null,
      title: 'Oppdatering tilgjengelig',
      description: 'Applikasjonen har blitt oppdatert. Last inn siden på nytt for å fortsette.',
      status: 0,
      category: 'network',
      isRetryable: true,
    };
  }

  // SDK ApiError with status
  if (typeof apiError.status === 'number' && apiError.status > 0) {
    return parseApiError(
      {
        message: apiError.message,
        code: apiError.code ?? 'UNKNOWN_ERROR',
        status: apiError.status,
        details: apiError.details,
      },
      apiError.status
    );
  }

  // Generic unknown error
  return {
    problemDetails: null,
    ...norwegianMessages.unknown,
    status: 0,
    category: 'unknown',
    isRetryable: false,
  };
}

/**
 * Get user-friendly message for a specific HTTP status code
 *
 * @param status - HTTP status code
 * @returns Norwegian title and description
 */
export function getStatusMessage(status: number): { title: string; description: string } {
  const category = categorizeStatus(status);
  return norwegianMessages[category];
}

/**
 * Format field validation errors for display
 *
 * @param fieldErrors - Object mapping field names to error messages
 * @returns Formatted error messages
 *
 * @example
 * ```typescript
 * const parsed = parseApiError(error);
 * if (parsed.fieldErrors) {
 *   const formatted = formatFieldErrors(parsed.fieldErrors);
 *   // formatted.email = ['E-postadresse er påkrevd']
 * }
 * ```
 */
export function formatFieldErrors(
  fieldErrors: Record<string, string[]>
): Record<string, string[]> {
  // Pass through as-is - validation messages should already be Norwegian from API
  // This function provides a hook for future field name translations if needed
  return fieldErrors;
}

/**
 * Check if an error indicates the user should retry
 *
 * @param error - Error object or parsed error
 * @returns Whether the user should be offered a retry option
 */
export function shouldOfferRetry(error: Error | ParsedApiError): boolean {
  if ('isRetryable' in error) {
    return error.isRetryable;
  }

  const parsed = parseErrorObject(error);
  return parsed.isRetryable;
}

/**
 * Create a Problem Details error response (for testing/mocking)
 *
 * @param overrides - Fields to override
 * @returns Problem Details object
 */
export function createProblemDetails(
  overrides: Partial<ProblemDetails>
): ProblemDetails {
  return {
    type: 'about:blank',
    title: 'An error occurred',
    status: 500,
    ...overrides,
  };
}
