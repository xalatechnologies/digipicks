/**
 * DigilistSaaS SDK - Accessibility Monitoring Hooks (Tier 3)
 *
 * Client-side React hooks for tracking accessibility metrics throughout
 * the application. Tracks keyboard navigation, screen reader detection,
 * focus management, skip link usage, ARIA announcements, and page performance.
 *
 * Fully client-side -- no backend dependency.
 */

import { useEffect, useMemo, useState } from "react";

// =============================================================================
// Types
// =============================================================================

export type AccessibilityMetricType =
  | "keyboard-navigation"
  | "skip-link-usage"
  | "screen-reader-detection"
  | "focus-management"
  | "aria-announcement"
  | "page-load-time";

export interface AccessibilityMetric {
  type: AccessibilityMetricType;
  timestamp: number;
  page?: string;
  data: Record<string, unknown>;
}

export interface KeyboardNavigationMetric {
  action: "tab" | "shift-tab" | "arrow-key" | "enter" | "space" | "escape";
  element: string;
  page: string;
}

export interface SkipLinkUsageMetric {
  target: string;
  page: string;
}

export interface ScreenReaderDetectionMetric {
  detected: boolean;
  userAgent: string;
  screenReader?: string;
}

export interface FocusManagementMetric {
  event: "focus-trap" | "focus-restore" | "focus-lost" | "focus-move";
  element: string | undefined;
  page: string;
}

export interface AriaAnnouncementMetric {
  type: "polite" | "assertive";
  message: string;
  success: boolean;
}

export interface AccessibilityMonitoringConfig {
  enabled: boolean;
  /** Maximum number of metrics to buffer before flushing */
  bufferSize?: number;
  /** Interval in ms to auto-flush metrics */
  flushInterval?: number;
  /** Endpoint to send metrics to (optional) */
  endpoint?: string;
  /** Custom flush handler */
  onFlush?: (metrics: AccessibilityMetric[]) => void | Promise<void>;
}

export interface AccessibilityReport {
  totalMetrics: number;
  keyboardNavigationCount: number;
  skipLinkUsageCount: number;
  screenReaderDetected: boolean;
  focusLostCount: number;
  ariaAnnouncementSuccessRate: number;
  averagePageLoadTime: number;
}

export interface UseAccessibilityMonitoringOptions {
  enabled?: boolean;
  trackKeyboardNav?: boolean;
  trackSkipLinks?: boolean;
  trackFocusManagement?: boolean;
  trackScreenReader?: boolean;
  trackPagePerformance?: boolean;
  config?: Partial<AccessibilityMonitoringConfig>;
}

export interface AccessibilityMonitoringAPI {
  trackKeyboardNavigation: (
    action: KeyboardNavigationMetric["action"],
    element: string,
    page: string
  ) => void;
  trackSkipLinkUsage: (target: string, page?: string) => void;
  trackScreenReaderDetection: (
    detected: boolean,
    userAgent: string,
    screenReader?: string
  ) => void;
  trackFocusManagement: (
    event: FocusManagementMetric["event"],
    element: string | undefined,
    page: string
  ) => void;
  trackAriaAnnouncement: (
    type: AriaAnnouncementMetric["type"],
    message: string,
    success: boolean
  ) => void;
  trackPageLoadTime: (page: string, loadTime: number) => void;
  flush: () => Promise<void>;
  enable: () => void;
  disable: () => void;
}

// =============================================================================
// Accessibility Monitoring Service (in-module singleton)
// =============================================================================

class AccessibilityMonitoringService {
  private metrics: AccessibilityMetric[] = [];
  private config: AccessibilityMonitoringConfig = { enabled: true, bufferSize: 50 };
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  configure(config: Partial<AccessibilityMonitoringConfig>) {
    this.config = { ...this.config, ...config };

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.config.flushInterval && this.config.enabled) {
      this.flushTimer = setInterval(() => {
        void this.flush();
      }, this.config.flushInterval);
    }
  }

  enable() {
    this.config.enabled = true;
  }

  disable() {
    this.config.enabled = false;
  }

  private addMetric(type: AccessibilityMetricType, data: Record<string, unknown>, page?: string) {
    if (!this.config.enabled) return;

    this.metrics.push({
      type,
      timestamp: Date.now(),
      page,
      data,
    });

    if (this.config.bufferSize && this.metrics.length >= this.config.bufferSize) {
      void this.flush();
    }
  }

  trackKeyboardNavigation(
    action: KeyboardNavigationMetric["action"],
    element: string,
    page: string
  ) {
    this.addMetric("keyboard-navigation", { action, element }, page);
  }

  trackSkipLinkUsage(target: string, page: string) {
    this.addMetric("skip-link-usage", { target }, page);
  }

  trackScreenReaderDetection(
    detected: boolean,
    userAgent: string,
    screenReader?: string
  ) {
    this.addMetric("screen-reader-detection", { detected, userAgent, screenReader });
  }

  trackFocusManagement(
    event: FocusManagementMetric["event"],
    element: string | undefined,
    page: string
  ) {
    this.addMetric("focus-management", { event, element }, page);
  }

  trackAriaAnnouncement(
    type: AriaAnnouncementMetric["type"],
    message: string,
    success: boolean
  ) {
    this.addMetric("aria-announcement", { type, message, success });
  }

  trackPageLoadTime(page: string, loadTime: number) {
    this.addMetric("page-load-time", { loadTime }, page);
  }

  async flush(): Promise<void> {
    if (this.metrics.length === 0) return;

    const batch = [...this.metrics];
    this.metrics = [];

    if (this.config.onFlush) {
      await this.config.onFlush(batch);
    }

    if (this.config.endpoint) {
      try {
        await fetch(this.config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metrics: batch }),
        });
      } catch {
        // Re-queue metrics on failure
        this.metrics.unshift(...batch);
      }
    }
  }
}

const accessibilityMonitoringService = new AccessibilityMonitoringService();

// =============================================================================
// Screen Reader Detection
// =============================================================================

interface ScreenReaderDetectionResult {
  detected: boolean;
  type?: string;
}

function detectScreenReader(): ScreenReaderDetectionResult {
  if (typeof window === "undefined") {
    return { detected: false };
  }

  const ua = navigator.userAgent.toLowerCase();

  // Check for known screen reader indicators in the user agent
  if (ua.includes("nvda")) return { detected: true, type: "NVDA" };
  if (ua.includes("jaws")) return { detected: true, type: "JAWS" };
  if (ua.includes("voiceover")) return { detected: true, type: "VoiceOver" };
  if (ua.includes("talkback")) return { detected: true, type: "TalkBack" };
  if (ua.includes("orca")) return { detected: true, type: "Orca" };

  // Check for accessibility-related properties
  try {
    // Some screen readers set aria-hidden on body or add specific attributes
    const body = document.body;
    if (body.getAttribute("aria-hidden") === "true") {
      return { detected: true, type: "unknown" };
    }
  } catch {
    // Ignore
  }

  return { detected: false };
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for accessibility monitoring.
 *
 * Provides methods to track accessibility metrics throughout the application.
 * Automatically manages service lifecycle and event listeners.
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   const monitoring = useAccessibilityMonitoring({
 *     enabled: true,
 *     trackKeyboardNav: true,
 *     trackSkipLinks: true,
 *   });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useAccessibilityMonitoring(
  options: UseAccessibilityMonitoringOptions = {}
): AccessibilityMonitoringAPI {
  const {
    enabled = true,
    trackKeyboardNav = false,
    trackFocusManagement = false,
    trackScreenReader = false,
    trackPagePerformance = false,
    config,
  } = options;

  // Configure service on mount or when config changes
  useEffect(() => {
    if (config) {
      accessibilityMonitoringService.configure({ ...config, enabled });
    } else if (enabled) {
      accessibilityMonitoringService.enable();
    } else {
      accessibilityMonitoringService.disable();
    }

    return () => {
      // Flush any remaining metrics on unmount
      void accessibilityMonitoringService.flush();
    };
  }, [enabled, config]);

  // Track keyboard navigation
  useEffect(() => {
    if (!trackKeyboardNav || !enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const element =
        (event.target as HTMLElement)?.tagName?.toLowerCase() || "unknown";
      const page = window.location.pathname;

      let action: KeyboardNavigationMetric["action"] = "tab";

      if (event.key === "Tab") {
        action = event.shiftKey ? "shift-tab" : "tab";
      } else if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        action = "arrow-key";
      } else if (event.key === "Enter") {
        action = "enter";
      } else if (event.key === " " || event.key === "Space") {
        action = "space";
      } else if (event.key === "Escape") {
        action = "escape";
      } else {
        return; // Don't track other keys
      }

      accessibilityMonitoringService.trackKeyboardNavigation(
        action,
        element,
        page
      );
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trackKeyboardNav, enabled]);

  // Track screen reader detection on mount
  useEffect(() => {
    if (!trackScreenReader || !enabled) return;

    const detection = detectScreenReader();
    accessibilityMonitoringService.trackScreenReaderDetection(
      detection.detected,
      navigator.userAgent,
      detection.type
    );
  }, [trackScreenReader, enabled]);

  // Track focus management
  useEffect(() => {
    if (!trackFocusManagement || !enabled) return;

    let lastFocusedElement: HTMLElement | null = null;

    const handleFocusIn = (event: FocusEvent) => {
      lastFocusedElement = event.target as HTMLElement;
    };

    const handleFocusOut = () => {
      // Check if focus was lost (not moving to another element)
      setTimeout(() => {
        if (document.activeElement === document.body) {
          accessibilityMonitoringService.trackFocusManagement(
            "focus-lost",
            lastFocusedElement?.tagName?.toLowerCase(),
            window.location.pathname
          );
        }
      }, 0);
    };

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, [trackFocusManagement, enabled]);

  // Track page performance
  useEffect(() => {
    if (!trackPagePerformance || !enabled) return;

    // Track initial page load
    if (typeof window !== "undefined" && window.performance) {
      const navigationTiming = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;
      if (navigationTiming) {
        const loadTime =
          navigationTiming.loadEventEnd - navigationTiming.fetchStart;
        accessibilityMonitoringService.trackPageLoadTime(
          window.location.pathname,
          loadTime
        );
      }
    }
  }, [trackPagePerformance, enabled]);

  // Create stable API object
  const api = useMemo<AccessibilityMonitoringAPI>(
    () => ({
      trackKeyboardNavigation: (action, element, page) => {
        accessibilityMonitoringService.trackKeyboardNavigation(
          action,
          element,
          page
        );
      },
      trackSkipLinkUsage: (target, page = window.location.pathname) => {
        accessibilityMonitoringService.trackSkipLinkUsage(target, page);
      },
      trackScreenReaderDetection: (detected, userAgent, screenReader) => {
        accessibilityMonitoringService.trackScreenReaderDetection(
          detected,
          userAgent,
          screenReader
        );
      },
      trackFocusManagement: (event, element, page) => {
        accessibilityMonitoringService.trackFocusManagement(
          event,
          element,
          page
        );
      },
      trackAriaAnnouncement: (type, message, success) => {
        accessibilityMonitoringService.trackAriaAnnouncement(
          type,
          message,
          success
        );
      },
      trackPageLoadTime: (page, loadTime) => {
        accessibilityMonitoringService.trackPageLoadTime(page, loadTime);
      },
      flush: () => accessibilityMonitoringService.flush(),
      enable: () => accessibilityMonitoringService.enable(),
      disable: () => accessibilityMonitoringService.disable(),
    }),
    []
  );

  return api;
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook to detect if user is using a screen reader.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const screenReader = useScreenReaderDetection();
 *
 *   if (screenReader.detected) {
 *     return <div aria-live="polite">Using {screenReader.type}</div>;
 *   }
 * }
 * ```
 */
export function useScreenReaderDetection(): ScreenReaderDetectionResult {
  return useMemo(() => detectScreenReader(), []);
}

/**
 * Hook to detect if user is navigating with keyboard.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isKeyboardNav = useKeyboardNavigationDetection();
 *
 *   return (
 *     <button className={isKeyboardNav ? "keyboard-focus" : ""}>
 *       Click me
 *     </button>
 *   );
 * }
 * ```
 */
export function useKeyboardNavigationDetection(): boolean {
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

  useEffect(() => {
    const handleKeyDown = () => {
      setIsKeyboardNav(true);
    };

    const handleMouseDown = () => {
      setIsKeyboardNav(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return isKeyboardNav;
}
