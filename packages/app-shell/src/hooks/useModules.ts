/**
 * useModules Hook
 *
 * Fetch platform modules. Stub for saas-admin.
 */

interface PlatformModule {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  category: string | null;
  version: string;
  enabled: boolean;
}

interface UseModulesResult {
  data: PlatformModule[] | undefined;
  loading: boolean;
  error: Error | null;
}

export function useModules(): UseModulesResult {
  return {
    data: [],
    loading: false,
    error: null,
  };
}
