import { useState, useEffect, useCallback } from 'react';
import { cn } from '../../../utils';
import { SearchIcon, CloseIcon } from '../../../primitives/icons';
import styles from './SearchFilter.module.css';

/**
 * SearchFilter Component
 *
 * Debounced search input filter.
 *
 * @example Basic usage
 * ```tsx
 * <SearchFilter
 *   placeholder="Search bookings..."
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 * />
 * ```
 */

export interface SearchFilterProps {
    /** Search value */
    value?: string;
    /** Change handler */
    onChange?: (value: string) => void;
    /** Placeholder text */
    placeholder?: string;
    /** Debounce delay in ms */
    debounceMs?: number;
    /** Additional CSS class */
    className?: string;
}



export function SearchFilter({
    value = '',
    onChange,
    placeholder = 'Search...',
    debounceMs = 300,
    className,
}: SearchFilterProps): React.ReactElement {
    const [localValue, setLocalValue] = useState(value);

    // Sync with external value changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Debounced onChange
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== value) {
                onChange?.(localValue);
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [localValue, value, onChange, debounceMs]);

    const handleClear = useCallback(() => {
        setLocalValue('');
        onChange?.('');
    }, [onChange]);

    return (
        <div className={cn(styles.searchFilter, className)}>
            <div className={styles.icon}>
                <SearchIcon size={18} />
            </div>
            <input
                type="text"
                className={styles.input}
                placeholder={placeholder}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
            />
            {localValue && (
                <button
                    type="button"
                    className={styles.clearButton}
                    onClick={handleClear}
                    aria-label="Clear search"
                >
                    <CloseIcon size={16} />
                </button>
            )}
        </div>
    );
}

SearchFilter.displayName = 'SearchFilter';
