/**
 * AccessibilityDashboard - Real-time accessibility metrics visualization
 *
 * Displays accessibility monitoring data in a user-friendly dashboard
 * with WCAG AAA compliant design.
 */

import * as React from 'react';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { cn } from '../utils';
import styles from './AccessibilityDashboard.module.css';

// Accessibility Report type (from SDK)
export interface AccessibilityReport {
  period: {
    start: Date;
    end: Date;
  };
  tenantId: string;
  metrics: {
    keyboardNavigation: {
      total: number;
      byAction: Record<string, number>;
      byPage: Record<string, number>;
    };
    skipLinkUsage: {
      total: number;
      byTarget: Record<string, number>;
    };
    screenReaderUsers: {
      total: number;
      percentage: number;
      byType: Record<string, number>;
    };
    focusIssues: {
      total: number;
      byType: Record<string, number>;
    };
    ariaAnnouncements: {
      total: number;
      successRate: number;
    };
  };
  complianceScore: number; // 0-100
  recommendations: string[];
}

export interface AccessibilityDashboardProps {
  report: AccessibilityReport;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function AccessibilityDashboard({
  report,
  isLoading = false,
  onRefresh,
  className,
}: AccessibilityDashboardProps): React.ReactElement {
  // Calculate compliance badge color
  const getComplianceColor = (score: number): string => {
    if (score >= 90) return 'var(--ds-color-success-border-default)';
    if (score >= 70) return 'var(--ds-color-warning-border-default)';
    return 'var(--ds-color-danger-border-default)';
  };

  const getComplianceLabel = (score: number): string => {
    if (score >= 90) return 'Utmerket';
    if (score >= 70) return 'God';
    return 'Trenger forbedring';
  };

  return (
    <div className={cn(styles.container, className)}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <Heading data-size="sm" className={styles.headerTitle}>
            Tilgjengelighetsoversikt
          </Heading>
          <Paragraph data-size="sm" className={styles.headerSubtitle}>
            {new Date(report.period.start).toLocaleDateString('nb-NO')} –{' '}
            {new Date(report.period.end).toLocaleDateString('nb-NO')}
          </Paragraph>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className={styles.refreshButton}
            aria-label="Oppdater tilgjengelighetsdata"
          >
            {isLoading ? 'Oppdaterer...' : 'Oppdater'}
          </button>
        )}
      </div>

      {/* Compliance Score Card */}
      <div
        role="region"
        aria-label="Samlet tilgjengelighetsscore"
        className={styles.complianceCard}
      >
        <div className={styles.complianceVisual}>
          {/* Circular Progress */}
          <svg width="200" height="200" className={styles.complianceSvg}>
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="var(--ds-color-neutral-border-subtle)"
              strokeWidth="12"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={getComplianceColor(report.complianceScore)}
              strokeWidth="12"
              strokeDasharray={`${(report.complianceScore / 100) * 565} 565`}
              strokeLinecap="round"
              className={styles.circleProgress}
            />
          </svg>

          {/* Score Text */}
          <div className={styles.scoreOverlay}>
            <span className={styles.scoreValue}>
              {report.complianceScore}
            </span>
            <span className={styles.scoreMax}>
              av 100
            </span>
          </div>
        </div>

        <span
          className={styles.complianceLabel}
          style={{ color: getComplianceColor(report.complianceScore) }}
        >
          {getComplianceLabel(report.complianceScore)}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className={styles.metricsGrid}>
        {/* Keyboard Navigation */}
        <MetricCard
          title="Tastaturnavigasjon"
          value={report.metrics.keyboardNavigation.total.toLocaleString('nb-NO')}
          subtitle="hendelser"
          icon="⌨️"
          details={[
            {
              label: 'Tab-navigasjon',
              value: report.metrics.keyboardNavigation.byAction.tab || 0,
            },
            {
              label: 'Enter-aktivering',
              value: report.metrics.keyboardNavigation.byAction.enter || 0,
            },
          ]}
        />

        {/* Screen Reader Usage */}
        <MetricCard
          title="Skjermleserbrukere"
          value={`${report.metrics.screenReaderUsers.percentage.toFixed(1)}%`}
          subtitle={`${report.metrics.screenReaderUsers.total} brukere`}
          icon="🔊"
          details={Object.entries(report.metrics.screenReaderUsers.byType).map(([type, count]) => ({
            label: type,
            value: count as number,
          }))}
        />

        {/* Skip Link Usage */}
        <MetricCard
          title="Hopp-til-lenker"
          value={report.metrics.skipLinkUsage.total.toLocaleString('nb-NO')}
          subtitle="brukstilfeller"
          icon="⏩"
          details={Object.entries(report.metrics.skipLinkUsage.byTarget).map(([target, count]) => ({
            label: target,
            value: count as number,
          }))}
        />

        {/* Focus Issues */}
        <MetricCard
          title="Fokusproblemer"
          value={report.metrics.focusIssues.total.toLocaleString('nb-NO')}
          subtitle="hendelser"
          icon="🎯"
          status={report.metrics.focusIssues.total > 10 ? 'warning' : 'success'}
          details={Object.entries(report.metrics.focusIssues.byType).map(([type, count]) => ({
            label: type,
            value: count as number,
          }))}
        />

        {/* ARIA Announcements */}
        <MetricCard
          title="ARIA-kunngjøringer"
          value={`${report.metrics.ariaAnnouncements.successRate.toFixed(1)}%`}
          subtitle="suksessrate"
          icon="📢"
          status={report.metrics.ariaAnnouncements.successRate > 95 ? 'success' : 'warning'}
          details={[
            {
              label: 'Totalt',
              value: report.metrics.ariaAnnouncements.total,
            },
          ]}
        />
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div
          role="region"
          aria-label="Anbefalinger for forbedring"
          className={styles.recommendations}
        >
          <Heading data-size="2xs" className={styles.recommendationsTitle}>
            Anbefalinger
          </Heading>
          <ul className={styles.recommendationsList}>
            {report.recommendations.map((recommendation: string, index: number) => (
              <li key={index} className={styles.recommendationItem}>
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MetricCard Component
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  status?: 'success' | 'warning' | 'danger';
  details?: Array<{ label: string; value: number }>;
}

function MetricCard({ title, value, subtitle, icon, status, details }: MetricCardProps): React.ReactElement {
  const getStatusColor = (): string => {
    if (!status) return 'var(--ds-color-neutral-border-subtle)';
    switch (status) {
      case 'success':
        return 'var(--ds-color-success-border-default)';
      case 'warning':
        return 'var(--ds-color-warning-border-default)';
      case 'danger':
        return 'var(--ds-color-danger-border-default)';
    }
  };

  return (
    <div
      className={styles.metricCard}
      style={{ '--metric-status-color': getStatusColor() } as React.CSSProperties}
    >
      <div className={styles.metricHeader}>
        <span className={styles.metricIcon} role="img" aria-hidden="true">
          {icon}
        </span>
        <Heading data-size="2xs" className={styles.metricTitle}>
          {title}
        </Heading>
      </div>

      <div className={styles.metricBody}>
        <div className={styles.metricValue}>
          {value}
        </div>
        <div className={styles.metricSubtitle}>
          {subtitle}
        </div>
      </div>

      {details && details.length > 0 && (
        <div className={styles.metricDetails}>
          {details.map((detail, index) => (
            <div key={index} className={styles.detailRow}>
              <span>{detail.label}</span>
              <span className={styles.detailValue}>
                {detail.value.toLocaleString('nb-NO')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AccessibilityDashboard;
