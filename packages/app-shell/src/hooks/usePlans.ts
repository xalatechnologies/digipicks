/**
 * usePlans Hook
 *
 * Fetch subscription plans. Stub for saas-admin.
 */

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  active: boolean;
  modules: string[];
}

interface UsePlansResult {
  data: Plan[] | undefined;
  loading: boolean;
  error: Error | null;
}

export function usePlans(): UsePlansResult {
  return {
    data: [],
    loading: false,
    error: null,
  };
}
