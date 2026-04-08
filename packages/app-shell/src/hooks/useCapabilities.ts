/**
 * useCapabilities — Capability-based permission checks for RBAC.
 */

import { useMemo } from 'react';
import { useRole } from '../providers/RoleProvider';
import {
  type Capability,
  type PlatformRole,
  getCapabilitiesForRole,
  roleHasCapability,
} from '../capabilities';

export interface UseCapabilitiesReturn {
  hasCapability: (capability: Capability) => boolean;
  hasAnyCapability: (capabilities: Capability[]) => boolean;
  hasAllCapabilities: (capabilities: Capability[]) => boolean;
  requireCapability: (capability: Capability) => void;
  capabilities: Capability[];
  effectiveRole: PlatformRole | undefined;
}

export function useCapabilities(): UseCapabilitiesReturn {
  const { effectiveRole } = useRole();
  const capabilities = useMemo(
    () => getCapabilitiesForRole(effectiveRole ?? undefined),
    [effectiveRole]
  );
  const hasCapability = (capability: Capability) =>
    roleHasCapability(effectiveRole ?? undefined, capability);
  const hasAnyCapability = (caps: Capability[]) => caps.some((c) => hasCapability(c));
  const hasAllCapabilities = (caps: Capability[]) => caps.every((c) => hasCapability(c));
  const requireCapability = (capability: Capability) => {
    if (!hasCapability(capability)) throw new Error(`Capability denied: ${capability}`);
  };
  return {
    hasCapability,
    hasAnyCapability,
    hasAllCapabilities,
    requireCapability,
    capabilities,
    effectiveRole: effectiveRole ?? undefined,
  };
}

export function useHasCapability(capability: Capability): boolean {
  const { hasCapability } = useCapabilities();
  return hasCapability(capability);
}

export function useHasAllCapabilities(capabilities: Capability[]): boolean {
  const { hasAllCapabilities } = useCapabilities();
  return hasAllCapabilities(capabilities);
}

export function useHasAnyCapability(capabilities: Capability[]): boolean {
  const { hasAnyCapability } = useCapabilities();
  return hasAnyCapability(capabilities);
}
