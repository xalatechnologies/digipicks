/**
 * SearchBar - Comprehensive search component with autocomplete
 *
 * Features:
 * - Debounced search
 * - Autocomplete suggestions
 * - Keyboard navigation
 * - Loading states
 * - Accessible (WCAG AA)
 * - Mobile responsive
 */

import * as React from 'react';
import { cn } from '../../../utils';
import { SearchIcon, CloseIcon } from '../../../primitives/icons';
import styles from './SearchBar.module.css';


const LoadingSpinner = ({ size = 16 }: { size?: number }) => (
    <svg
        className={styles.spinner}
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="10 20" />
    </svg>
);

export interface SearchSuggestion {
    id: string;
    label: string;
    value: string;
    icon?: React.ReactNode;
    metadata?: string;
}

export interface SearchBarProps {
    // Core
    value?: string;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
    placeholder?: string;

    // Autocomplete
    suggestions?: SearchSuggestion[];
    onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
    showSuggestions?: boolean;

    // Behavior
    debounceMs?: number;
    clearable?: boolean;
    autoFocus?: boolean;
    disabled?: boolean;

    // Loading
    isLoading?: boolean;

    // Styling
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'filled' | 'outlined';
    className?: string;

    // Accessibility
    ariaLabel?: string;
    ariaDescribedBy?: string;
}

/**
 * SearchBar component with autocomplete and debouncing
 */
export function SearchBar({
    value: controlledValue,
    onChange,
    onSearch,
    placeholder = 'Søk...',
    suggestions = [],
    onSuggestionSelect,
    showSuggestions = true,
    debounceMs = 300,
    clearable = true,
    autoFocus = false,
    disabled = false,
    isLoading = false,
    size = 'md',
    variant = 'default',
    className,
    ariaLabel = 'Søk',
    ariaDescribedBy,
}: SearchBarProps): React.ReactElement {
    const [internalValue, setInternalValue] = React.useState('');
    const [isFocused, setIsFocused] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const [showDropdown, setShowDropdown] = React.useState(false);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const debounceTimerRef = React.useRef<NodeJS.Timeout>();

    // Use controlled or uncontrolled value
    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const setValue = controlledValue !== undefined ? onChange : setInternalValue;

    // Debounced search
    React.useEffect(() => {
        if (!onSearch || !value) return;

        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new timer
        debounceTimerRef.current = setTimeout(() => {
            onSearch(value);
        }, debounceMs);

        // Cleanup
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [value, onSearch, debounceMs]);

    // Auto-focus
    React.useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    // Show/hide dropdown based on suggestions and focus
    React.useEffect(() => {
        setShowDropdown(isFocused && showSuggestions && suggestions.length > 0 && value.length > 0);
    }, [isFocused, showSuggestions, suggestions.length, value]);

    // Click outside to close dropdown
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setShowDropdown(false);
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue?.(newValue);
        setHighlightedIndex(-1);
    };

    const handleClear = () => {
        setValue?.('');
        setShowDropdown(false);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
    };

    const handleSuggestionClick = (suggestion: SearchSuggestion) => {
        setValue?.(suggestion.value);
        onSuggestionSelect?.(suggestion);
        setShowDropdown(false);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showDropdown || suggestions.length === 0) {
            if (e.key === 'Enter' && onSearch) {
                onSearch(value);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
                break;

            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;

            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    handleSuggestionClick(suggestions[highlightedIndex]);
                } else if (onSearch) {
                    onSearch(value);
                    setShowDropdown(false);
                }
                break;

            case 'Escape':
                e.preventDefault();
                setShowDropdown(false);
                setHighlightedIndex(-1);
                break;

            case 'Tab':
                setShowDropdown(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    const showClearButton = clearable && value.length > 0 && !disabled;

    return (
        <div className={cn(styles.container, className)}>
            <div
                className={cn(
                    styles.inputWrapper,
                    styles[`size-${size}`],
                    styles[`variant-${variant}`],
                    isFocused && styles.focused,
                    disabled && styles.disabled
                )}
            >
                {/* Search Icon */}
                <div className={styles.iconLeft}>
                    <SearchIcon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
                </div>

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    placeholder={placeholder}
                    disabled={disabled}
                    aria-label={ariaLabel}
                    aria-describedby={ariaDescribedBy}
                    aria-autocomplete="list"
                    aria-controls={showDropdown ? 'search-suggestions' : undefined}
                    aria-expanded={showDropdown}
                    aria-activedescendant={
                        highlightedIndex >= 0 ? `suggestion-${suggestions[highlightedIndex]?.id}` : undefined
                    }
                />

                {/* Loading or Clear Button */}
                <div className={styles.iconRight}>
                    {isLoading ? (
                        <LoadingSpinner size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
                    ) : showClearButton ? (
                        <button
                            type="button"
                            className={styles.clearButton}
                            onClick={handleClear}
                            aria-label="Tøm søk"
                            tabIndex={-1}
                        >
                            <CloseIcon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && (
                <div ref={dropdownRef} id="search-suggestions" className={styles.dropdown} role="listbox">
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={suggestion.id}
                            id={`suggestion-${suggestion.id}`}
                            className={cn(styles.suggestion, index === highlightedIndex && styles.highlighted)}
                            onClick={() => handleSuggestionClick(suggestion)}
                            role="option"
                            aria-selected={index === highlightedIndex}
                        >
                            {suggestion.icon && <div className={styles.suggestionIcon}>{suggestion.icon}</div>}
                            <div className={styles.suggestionContent}>
                                <div className={styles.suggestionLabel}>{suggestion.label}</div>
                                {suggestion.metadata && <div className={styles.suggestionMetadata}>{suggestion.metadata}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SearchBar;
