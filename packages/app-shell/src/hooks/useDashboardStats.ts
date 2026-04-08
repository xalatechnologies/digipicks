/**
 * useDashboardStats Hook
 *
 * Fetch dashboard statistics from Convex backend.
 */

interface DashboardStats {
    totalBookings: number;
    totalResources: number;
    totalUsers: number;
    revenueThisMonth: number;
    bookingsToday: number;
    pendingApprovals: number;
    totalTenants?: number;
    activeTenants?: number;
    activeModules?: number;
}

interface UseDashboardStatsResult {
    data: DashboardStats | null;
    stats: DashboardStats | null;
    loading: boolean;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

const defaultStats: DashboardStats = {
    totalBookings: 0,
    totalResources: 0,
    totalUsers: 0,
    revenueThisMonth: 0,
    bookingsToday: 0,
    pendingApprovals: 0,
    totalTenants: 0,
    activeTenants: 0,
    activeModules: 0,
};

export function useDashboardStats(): UseDashboardStatsResult {
    return {
        data: defaultStats,
        stats: defaultStats,
        loading: false,
        isLoading: false,
        error: null,
        refetch: async () => {},
    };
}
