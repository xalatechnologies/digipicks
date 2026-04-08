/**
 * MetricCard
 *
 * Generic card for displaying a single metric/value with a label and icon.
 * Suitable for capacity, stats, KPIs, and any label+value display.
 */
import * as React from 'react';
import { Card, Paragraph } from '@digdir/designsystemet-react';
import { Stack } from '../primitives';
import { cn } from '../utils';
import styles from './MetricCard.module.css';

// =============================================================================
// Types
// =============================================================================

export interface MetricCardProps {
    /** Icon element (consumer provides) */
    icon: React.ReactNode;
    /** Label text displayed above the value */
    label: string;
    /** Main value to display */
    value: string | number;
    /** Unit text displayed after the value (e.g., "people", "m²") */
    unit?: string;
    /** Card variant */
    variant?: 'default' | 'dark';
    /** Custom class name */
    className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function MetricCard({
    icon,
    label,
    value,
    unit,
    variant = 'default',
    className,
}: MetricCardProps): React.ReactElement {
    return (
        <Card
            className={cn('metric-card', className)}
            data-color={variant === 'dark' ? 'neutral' : undefined}
        >
            <Stack direction="horizontal" spacing="var(--ds-size-4)" align="center">
                {icon}
                <Stack spacing="var(--ds-size-1)">
                    <Paragraph data-size="xs" data-color="subtle" className={styles.label}>
                        {label}
                    </Paragraph>
                    <Paragraph data-size="lg" className={styles.value}>
                        {value}{unit ? ` ${unit}` : ''}
                    </Paragraph>
                </Stack>
            </Stack>
        </Card>
    );
}
