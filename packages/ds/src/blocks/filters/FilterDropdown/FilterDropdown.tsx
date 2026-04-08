import { useState, useRef, useEffect } from 'react';
import { cn } from '../../../utils';
import { CheckIcon, SearchIcon } from '../../../primitives/icons';
import styles from './FilterDropdown.module.css';

/**
 * FilterDropdown Component
 *
 * Multi-select dropdown filter with search functionality.
 *
 * @example Basic usage
 * ```tsx
 * <FilterDropdown
 *   label="Status"
 *   options={[
 *     { value: 'active', label: 'Active' },
 *     { value: 'pending', label: 'Pending' },
 *     { value: 'completed', label: 'Completed' },
 *   ]}
 *   value={['active']}
 *   onChange={handleChange}
 * />
 * ```
 */

export interface FilterDropdownOption {
    value: string;
    label: string;
    count?: number;
}

export interface FilterDropdownProps {
    /** Filter label */
    label: string;
    /** Available options */
    options: FilterDropdownOption[];
    /** Selected values */
    value?: string[];
    /** Change handler */
    onChange?: (values: string[]) => void;
    /** Enable search */
    searchable?: boolean;
    /** Search placeholder */
    searchPlaceholder?: string;
    /** Additional CSS class */
    className?: string;
}

// ChevronDownIcon kept local (no primitive equivalent)
const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

export function FilterDropdown({
    label,
    options,
    value = [],
    onChange,
    searchable = true,
    searchPlaceholder = 'Search...',
    className,
}: FilterDropdownProps): React.ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const filteredOptions = searchable && searchQuery
        ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options;

    const handleToggle = (optionValue: string) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange?.(newValue);
    };

    return (
        <div className={cn(styles.filterDropdown, className)} ref={dropdownRef}>
            <button
                type="button"
                className={cn(styles.trigger, isOpen && styles.open, value.length > 0 && styles.active)}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <span className={styles.label}>
                    {label}
                    {value.length > 0 && <span className={styles.badge}>{value.length}</span>}
                </span>
                <ChevronDownIcon />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    {searchable && (
                        <div className={styles.searchContainer}>
                            <SearchIcon />
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}

                    <div className={styles.options}>
                        {filteredOptions.length === 0 ? (
                            <div className={styles.emptyState}>No options found</div>
                        ) : (
                            filteredOptions.map((option) => (
                                <label key={option.value} className={styles.option}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={value.includes(option.value)}
                                        onChange={() => handleToggle(option.value)}
                                    />
                                    <div className={styles.checkIcon}>
                                        {value.includes(option.value) && <CheckIcon />}
                                    </div>
                                    <span className={styles.optionLabel}>
                                        {option.label}
                                        {option.count !== undefined && (
                                            <span className={styles.count}>({option.count})</span>
                                        )}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

FilterDropdown.displayName = 'FilterDropdown';
