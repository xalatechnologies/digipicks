import type { ReactNode } from 'react';
import { useAuth } from './auth/AuthProvider';

interface RequireAuthProps {
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Guard that requires authentication
 */
export function RequireAuth({ children, fallback }: RequireAuthProps) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return fallback ?? null;
    }

    if (!isAuthenticated) {
        // Redirect to login or show fallback
        return fallback ?? null;
    }

    return <>{children}</>;
}
