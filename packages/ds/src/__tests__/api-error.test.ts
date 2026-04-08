import { describe, it, expect } from 'vitest';
import {
  parseApiError,
  parseErrorObject,
  getStatusMessage,
  shouldOfferRetry,
  formatFieldErrors,
  createProblemDetails,
} from '../utils/api-error';

// ---------------------------------------------------------------------------
// parseApiError
// ---------------------------------------------------------------------------

describe('parseApiError', () => {
  it('parses RFC 7807 Problem Details', () => {
    const result = parseApiError({
      type: 'urn:error:validation',
      title: 'Validation Error',
      status: 400,
      detail: 'Ugyldig e-postadresse',
    }, 400);

    expect(result.status).toBe(400);
    expect(result.category).toBe('validation');
    expect(result.description).toBe('Ugyldig e-postadresse');
    expect(result.isRetryable).toBe(false);
    expect(result.problemDetails).not.toBeNull();
  });

  it('categorizes 401 as unauthorized', () => {
    const result = parseApiError({}, 401);
    expect(result.category).toBe('unauthorized');
    expect(result.title).toMatch(/ikke logget inn/i);
  });

  it('categorizes 403 as forbidden', () => {
    const result = parseApiError({}, 403);
    expect(result.category).toBe('forbidden');
  });

  it('categorizes 404 as not_found', () => {
    const result = parseApiError({}, 404);
    expect(result.category).toBe('not_found');
  });

  it('categorizes 408 as timeout', () => {
    const result = parseApiError({}, 408);
    expect(result.category).toBe('timeout');
    expect(result.isRetryable).toBe(true);
  });

  it('categorizes 409 as conflict', () => {
    const result = parseApiError({}, 409);
    expect(result.category).toBe('conflict');
  });

  it('categorizes 500 as server_error', () => {
    const result = parseApiError({}, 500);
    expect(result.category).toBe('server_error');
    expect(result.isRetryable).toBe(true);
  });

  it('categorizes 504 as timeout', () => {
    const result = parseApiError({}, 504);
    expect(result.category).toBe('timeout');
  });

  it('categorizes 0 as network error', () => {
    const result = parseApiError({}, 0);
    expect(result.category).toBe('network');
    expect(result.isRetryable).toBe(true);
  });

  it('extracts status from problem details if not provided', () => {
    const result = parseApiError({
      type: 'urn:error:not-found',
      title: 'Not Found',
      status: 404,
    });
    expect(result.status).toBe(404);
    expect(result.category).toBe('not_found');
  });

  it('extracts nested problem details from error property', () => {
    const result = parseApiError({
      error: {
        type: 'urn:error:conflict',
        title: 'Conflict',
        status: 409,
      },
    }, 409);
    expect(result.problemDetails).not.toBeNull();
    expect(result.category).toBe('conflict');
  });

  it('converts SDK ApiError format', () => {
    const result = parseApiError({
      message: 'Booking overlap',
      code: 'BOOKING_CONFLICT',
      status: 409,
    }, 409);
    expect(result.problemDetails).not.toBeNull();
    expect(result.problemDetails?.type).toBe('urn:error:BOOKING_CONFLICT');
  });

  it('carries field errors through', () => {
    const result = parseApiError({
      type: 'urn:error:validation',
      title: 'Validation',
      status: 422,
      errors: { email: ['Ugyldig e-post'] },
    }, 422);
    expect(result.fieldErrors).toEqual({ email: ['Ugyldig e-post'] });
  });

  it('carries correlationId through', () => {
    const result = parseApiError({
      type: 'urn:error:server',
      title: 'Server Error',
      status: 500,
      correlationId: 'abc-123',
    }, 500);
    expect(result.correlationId).toBe('abc-123');
  });

  it('uses server error title when specific (not generic)', () => {
    const result = parseApiError({
      type: 'urn:error:db',
      title: 'Database Connection Failed',
      status: 500,
    }, 500);
    expect(result.title).toBe('Database Connection Failed');
  });
});

// ---------------------------------------------------------------------------
// parseErrorObject
// ---------------------------------------------------------------------------

describe('parseErrorObject', () => {
  it('detects network errors', () => {
    const err = new TypeError('Failed to fetch');
    const result = parseErrorObject(err);
    expect(result.category).toBe('network');
    expect(result.isRetryable).toBe(true);
  });

  it('detects abort/timeout errors', () => {
    const err = new DOMException('The operation was aborted', 'AbortError');
    const result = parseErrorObject(err);
    expect(result.category).toBe('timeout');
    expect(result.isRetryable).toBe(true);
  });

  it('detects chunk load errors', () => {
    const err = new Error('Loading chunk 42 failed');
    const result = parseErrorObject(err);
    expect(result.category).toBe('network');
    expect(result.title).toMatch(/oppdatering/i);
  });

  it('handles SDK ApiError with status', () => {
    const err = Object.assign(new Error('Forbidden'), { status: 403, code: 'FORBIDDEN' });
    const result = parseErrorObject(err);
    expect(result.category).toBe('forbidden');
    expect(result.status).toBe(403);
  });

  it('returns unknown for generic errors', () => {
    const err = new Error('Something weird happened');
    const result = parseErrorObject(err);
    expect(result.category).toBe('unknown');
    expect(result.isRetryable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getStatusMessage
// ---------------------------------------------------------------------------

describe('getStatusMessage', () => {
  it('returns Norwegian messages', () => {
    const msg = getStatusMessage(404);
    expect(msg.title).toMatch(/ikke funnet/i);
  });

  it('returns network message for 0', () => {
    const msg = getStatusMessage(0);
    expect(msg.title).toMatch(/nettverksfeil/i);
  });

  it('returns server error for 503', () => {
    const msg = getStatusMessage(503);
    expect(msg.title).toMatch(/serverfeil/i);
  });
});

// ---------------------------------------------------------------------------
// shouldOfferRetry
// ---------------------------------------------------------------------------

describe('shouldOfferRetry', () => {
  it('returns true for ParsedApiError with isRetryable', () => {
    expect(shouldOfferRetry({
      problemDetails: null,
      title: 'test',
      description: 'test',
      status: 500,
      category: 'server_error',
      isRetryable: true,
    })).toBe(true);
  });

  it('returns false for non-retryable ParsedApiError', () => {
    expect(shouldOfferRetry({
      problemDetails: null,
      title: 'test',
      description: 'test',
      status: 404,
      category: 'not_found',
      isRetryable: false,
    })).toBe(false);
  });

  it('parses Error object and checks', () => {
    const networkErr = new TypeError('Failed to fetch');
    expect(shouldOfferRetry(networkErr)).toBe(true);

    const genericErr = new Error('Unknown');
    expect(shouldOfferRetry(genericErr)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatFieldErrors
// ---------------------------------------------------------------------------

describe('formatFieldErrors', () => {
  it('passes through field errors', () => {
    const errors = { email: ['Ugyldig e-post'], name: ['For kort'] };
    expect(formatFieldErrors(errors)).toEqual(errors);
  });

  it('handles empty errors', () => {
    expect(formatFieldErrors({})).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// createProblemDetails
// ---------------------------------------------------------------------------

describe('createProblemDetails', () => {
  it('creates default problem details', () => {
    const pd = createProblemDetails({});
    expect(pd.type).toBe('about:blank');
    expect(pd.title).toBe('An error occurred');
    expect(pd.status).toBe(500);
  });

  it('accepts overrides', () => {
    const pd = createProblemDetails({ status: 404, title: 'Not Found' });
    expect(pd.status).toBe(404);
    expect(pd.title).toBe('Not Found');
  });
});
