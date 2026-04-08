/**
 * ToggleActionButton
 *
 * Generic toggle button with auth gating support. Suitable for
 * favorite/like/bookmark/follow actions. Consumer provides icons.
 *
 * @example
 * ```tsx
 * import { ToggleActionButton, HeartIcon } from '@digilist-saas/ds';
 *
 * <ToggleActionButton
 *   isActive={isFavorited}
 *   onToggle={() => toggleFavorite()}
 *   activeIcon={<HeartIcon fill="currentColor" size={18} />}
 *   inactiveIcon={<HeartIcon size={18} />}
 *   activeLabel="Remove from favorites"
 *   inactiveLabel="Add to favorites"
 * />
 * ```
 */
'use client';

import * as React from 'react';
import { Button } from '@digdir/designsystemet-react';
import { cn } from '../utils';

// =============================================================================
// Types
// =============================================================================

export interface ToggleActionButtonProps {
    /** Whether the action is currently active */
    isActive?: boolean;
    /** Whether the user is authenticated */
    isAuthenticated?: boolean;
    /** Optional count to display */
    count?: number;
    /** Show count alongside button */
    showCount?: boolean;
    /** Callback when toggled (authenticated user) */
    onToggle?: () => void;
    /** Callback when unauthenticated user tries to toggle */
    onAuthRequired?: () => void;
    /** Loading state */
    isLoading?: boolean;
    /** Visual variant */
    variant?: 'icon' | 'button' | 'compact';
    /** Size */
    size?: 'sm' | 'md' | 'lg';
    /** Icon when active (consumer provides) */
    activeIcon: React.ReactNode;
    /** Icon when inactive (consumer provides) */
    inactiveIcon: React.ReactNode;
    /** Accessible label when active */
    activeLabel: string;
    /** Accessible label when inactive */
    inactiveLabel: string;
    /** Button text when active (for 'button' variant) */
    activeText?: string;
    /** Button text when inactive (for 'button' variant) */
    inactiveText?: string;
    /** Custom class name */
    className?: string;
    /** Disable the button */
    disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ToggleActionButton({
    isActive = false,
    isAuthenticated = true,
    count,
    showCount = false,
    onToggle,
    onAuthRequired,
    isLoading = false,
    variant = 'icon',
    size = 'md',
    activeIcon,
    inactiveIcon,
    activeLabel,
    inactiveLabel,
    activeText,
    inactiveText,
    className,
    disabled = false,
}: ToggleActionButtonProps): React.ReactElement {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (disabled || isLoading) return;

        if (!isAuthenticated && onAuthRequired) {
            onAuthRequired();
            return;
        }

        onToggle?.();
    };

    const label = isActive ? activeLabel : inactiveLabel;
    const currentIcon = isActive ? activeIcon : inactiveIcon;

    if (variant === 'icon') {
        return (
            <Button
                type="button"
                variant="tertiary"
                onClick={handleClick}
                aria-label={label}
                aria-pressed={isActive}
                disabled={disabled || isLoading}
                className={cn('toggle-action-button', className)}
                data-size={size}
            >
                {currentIcon}
            </Button>
        );
    }

    if (variant === 'compact') {
        return (
            <Button
                type="button"
                variant="tertiary"
                onClick={handleClick}
                aria-label={label}
                aria-pressed={isActive}
                disabled={disabled || isLoading}
                className={cn('toggle-action-button', className)}
                data-size="sm"
            >
                {currentIcon}
                {showCount && count !== undefined && (
                    <span>{count}</span>
                )}
            </Button>
        );
    }

    return (
        <Button
            type="button"
            onClick={handleClick}
            data-size={size}
            variant={isActive ? 'primary' : 'secondary'}
            data-color={isActive ? 'danger' : 'neutral'}
            disabled={disabled || isLoading}
            className={cn('toggle-action-button', className)}
            aria-pressed={isActive}
        >
            {currentIcon}
            {isActive ? (activeText || activeLabel) : (inactiveText || inactiveLabel)}
            {showCount && count !== undefined && ` (${count})`}
        </Button>
    );
}
