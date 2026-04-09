/**
 * AccessibilityMonitoringProvider — Shared accessibility metrics
 *
 * Enables accessibility monitoring throughout the application. Tracks keyboard navigation,
 * screen reader usage, focus management, skip link usage, and page performance.
 */

import React, { createContext, useContext } from 'react';
import { useAccessibilityMonitoring, type AccessibilityMonitoringAPI } from '@digipicks/sdk';

const AccessibilityMonitoringContext = createContext<AccessibilityMonitoringAPI | null>(null);

export interface AccessibilityMonitoringProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

/**
 * Provider that enables accessibility monitoring for the entire app
 */
export function AccessibilityMonitoringProvider({
  children,
  enabled = true,
}: AccessibilityMonitoringProviderProps): React.ReactElement {
  const monitoring = useAccessibilityMonitoring({
    enabled,
    trackKeyboardNav: true,
    trackSkipLinks: true,
    trackFocusManagement: true,
    trackScreenReader: true,
    trackPagePerformance: true,
  });

  return (
    <AccessibilityMonitoringContext.Provider value={monitoring}>{children}</AccessibilityMonitoringContext.Provider>
  );
}

/**
 * Hook to access accessibility monitoring API from any component
 */
export function useAccessibilityMonitoringContext(): AccessibilityMonitoringAPI {
  const context = useContext(AccessibilityMonitoringContext);

  if (!context) {
    throw new Error('useAccessibilityMonitoringContext must be used within AccessibilityMonitoringProvider');
  }

  return context;
}
