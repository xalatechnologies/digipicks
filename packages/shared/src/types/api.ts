/**
 * API Types
 * 
 * Common API request/response types.
 */

// =============================================================================
// Paginated Response
// =============================================================================

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export interface SingleResponse<T> {
    data: T;
    success: boolean;
}

// =============================================================================
// API Error (RFC 7807)
// =============================================================================

export interface ProblemDetails {
    type: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    errors?: ValidationError[];
}

export interface ValidationError {
    field: string;
    message: string;
    code?: string;
}

export interface ApiError extends ProblemDetails {
    timestamp?: string;
    traceId?: string;
}

// =============================================================================
// Query Options
// =============================================================================

export interface QueryOptions {
    page?: number;
    pageSize?: number;
    cursor?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, unknown>;
}

