/**
 * BarChart
 *
 * Simple horizontal bar chart component for data visualization.
 * Follows Digdir design tokens for consistent styling.
 */
import * as React from 'react';
import { cn } from '../utils';
import styles from './BarChart.module.css';

// =============================================================================
// Types
// =============================================================================

export interface BarChartDataItem {
  /** Label for the bar */
  label: string;
  /** Numeric value */
  value: number;
  /** Optional color override */
  color?: string;
}

export interface BarChartProps {
  /** Data items to display */
  data: BarChartDataItem[];
  /** Maximum value for scale (defaults to max in data) */
  maxValue?: number;
  /** Width of label column */
  labelWidth?: string;
  /** Width of value column */
  valueWidth?: string;
  /** Bar height */
  barHeight?: string;
  /** Default bar color */
  barColor?: string;
  /** Show value labels */
  showValues?: boolean;
  /** Format function for values */
  formatValue?: (value: number) => string;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function BarChart({
  data,
  maxValue,
  labelWidth = '80px',
  valueWidth = '60px',
  barHeight = '24px',
  barColor = 'var(--ds-color-accent-base-default)',
  showValues = true,
  formatValue = (v) => v.toString(),
  className,
}: BarChartProps): React.ReactElement {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn(styles.container, className)}>
      {data.map((item, idx) => (
        <div key={idx} className={styles.row}>
          {/* Label */}
          <div className={styles.label} style={{ width: labelWidth }}>
            {item.label}
          </div>

          {/* Bar container */}
          <div className={styles.barContainer} style={{ height: barHeight }}>
            {/* Bar fill */}
            <div
              className={styles.barFill}
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color || barColor,
              }}
            />
          </div>

          {/* Value */}
          {showValues && (
            <div className={styles.value} style={{ width: valueWidth }}>
              {formatValue(item.value)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Vertical Bar Chart Variant
// =============================================================================

export interface VerticalBarChartProps {
  /** Data items to display */
  data: BarChartDataItem[];
  /** Maximum value for scale */
  maxValue?: number;
  /** Height of the chart */
  height?: string;
  /** Bar width */
  barWidth?: string;
  /** Gap between bars */
  gap?: string;
  /** Default bar color */
  barColor?: string;
  /** Show value labels */
  showValues?: boolean;
  /** Format function for values */
  formatValue?: (value: number) => string;
  /** Custom class name */
  className?: string;
}

export function VerticalBarChart({
  data,
  maxValue,
  height = '200px',
  barWidth = '40px',
  gap = 'var(--ds-size-2)',
  barColor = 'var(--ds-color-accent-base-default)',
  showValues = true,
  formatValue = (v) => v.toString(),
  className,
}: VerticalBarChartProps): React.ReactElement {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      className={cn(styles.verticalContainer, className)}
      style={{ gap, height }}
    >
      {data.map((item, idx) => (
        <div key={idx} className={styles.verticalItem}>
          {/* Value label */}
          {showValues && (
            <div className={styles.verticalValue}>{formatValue(item.value)}</div>
          )}

          {/* Bar */}
          <div
            className={styles.verticalBar}
            style={{
              width: barWidth,
              height: `${(item.value / max) * 100}%`,
              backgroundColor: item.color || barColor,
            }}
          />

          {/* Label */}
          <div className={styles.verticalLabel}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export default BarChart;
