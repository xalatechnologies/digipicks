/**
 * InfoGrid - Display key-value pairs in a responsive grid
 */

import * as React from 'react';
import { cn } from '../../../utils';
import styles from './InfoGrid.module.css';

export interface InfoGridItem {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    highlight?: boolean;
}

export type GridColumns = 1 | 2 | 3 | 4;
export type GridGap = 'sm' | 'md' | 'lg';
export type GridVariant = 'default' | 'bordered' | 'striped';

export interface InfoGridProps {
    items: InfoGridItem[];
    columns?: GridColumns;
    gap?: GridGap;
    variant?: GridVariant;
    className?: string;
}

/**
 * InfoGrid component for displaying key-value information
 */
export function InfoGrid({
    items,
    columns = 2,
    gap = 'md',
    variant = 'default',
    className,
}: InfoGridProps): React.ReactElement {
    return (
        <div
            className={cn(
                styles.grid,
                styles[`columns-${columns}`],
                styles[`gap-${gap}`],
                styles[`variant-${variant}`],
                className
            )}
        >
            {items.map((item, index) => (
                <div
                    key={index}
                    className={cn(styles.item, item.highlight && styles.highlighted)}
                >
                    {item.icon && <div className={styles.icon}>{item.icon}</div>}
                    <div className={styles.content}>
                        <div className={styles.label}>{item.label}</div>
                        <div className={styles.value}>{item.value}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default InfoGrid;
