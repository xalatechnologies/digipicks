/**
 * useUsers Hook
 *
 * Fetch users from Convex backend.
 */

interface User {
    _id: string;
    id: string;
    email: string;
    name: string;
    display_name: string | null;
    role: string;
    status: string;
    createdAt: number;
    created_at: string;
    last_login_at: string | null;
}

interface UseUsersResult {
    users: User[];
    data: User[] | undefined;
    loading: boolean;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

export function useUsers(): UseUsersResult {
    return {
        users: [],
        data: [],
        loading: false,
        isLoading: false,
        error: null,
        refetch: async () => {},
    };
}
