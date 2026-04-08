/**
 * useTenants Hook
 *
 * Fetch tenants from Convex backend. Stub for saas-admin.
 */

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: string;
  created_at: string;
}

interface UseTenantsResult {
  data: Tenant[] | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTenants(): UseTenantsResult {
  return {
    data: [],
    loading: false,
    error: null,
    refetch: async () => {},
  };
}
