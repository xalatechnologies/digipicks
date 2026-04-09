/**
 * ModeProvider — Leietaker / Utleier mode switching
 *
 * The "mode" layer sits on top of the context switcher (personal/org).
 * - Leietaker (renter): default mode for all users
 * - Utleier (owner/lessor): mini-backoffice mode, only available if user has a tenantId
 *
 * Mode is persisted in localStorage. If user loses owner access, mode resets to leietaker.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthBridge } from './AuthBridge';
import { useRoleContext } from './RoleProvider';

export type DashboardMode = 'leietaker' | 'utleier';

export interface ModeContextValue {
  /** Current active mode */
  mode: DashboardMode;
  /** User has a tenant — can access utleier mode */
  isOwner: boolean;
  /** User has no tenant — leietaker-only */
  isNormalUser: boolean;
  /** Can the user toggle modes? (only owners) */
  canToggle: boolean;
  /** Set mode explicitly */
  setMode: (mode: DashboardMode) => void;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

const STORAGE_KEY = 'dashboard_mode';

export const ModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthBridge();
  const { effectiveRole } = useRoleContext();

  const isOwner = (effectiveRole === 'admin' || effectiveRole === 'creator') && !!user?.tenantId;
  const isNormalUser = effectiveRole === 'subscriber';
  const canToggle = isOwner;

  const [mode, setModeState] = useState<DashboardMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Respect stored preference if valid
    if (stored === 'utleier' || stored === 'leietaker') return stored;
    // Default: owners start in utleier mode, normal users in leietaker
    return isOwner ? 'utleier' : 'leietaker';
  });

  // If user loses owner access, force back to leietaker
  useEffect(() => {
    if (!isOwner && mode === 'utleier') {
      setModeState('leietaker');
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isOwner, mode]);

  // When owner status is first detected and no stored preference, switch to utleier
  useEffect(() => {
    if (isOwner && !localStorage.getItem(STORAGE_KEY)) {
      setModeState('utleier');
      localStorage.setItem(STORAGE_KEY, 'utleier');
    }
  }, [isOwner]);

  const setMode = useCallback(
    (newMode: DashboardMode) => {
      if (newMode === 'utleier' && !isOwner) return; // Guard: non-owners can't switch to utleier
      setModeState(newMode);
      localStorage.setItem(STORAGE_KEY, newMode);
    },
    [isOwner],
  );

  const value = useMemo<ModeContextValue>(
    () => ({
      mode: isOwner ? mode : 'leietaker',
      isOwner,
      isNormalUser,
      canToggle,
      setMode,
    }),
    [mode, isOwner, isNormalUser, canToggle, setMode],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
};

export function useMode(): ModeContextValue {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}

/** Returns mode context if available, or null (safe for use outside ModeProvider). */
export function useModeOptional(): ModeContextValue | null {
  return useContext(ModeContext) ?? null;
}
