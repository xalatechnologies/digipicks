/**
 * Header Sub-components
 *
 * Individual components for header sections using Digdir design system components.
 * Includes: HeaderLogo, HeaderSearch, HeaderActions, HeaderActionButton,
 * HeaderIconButton, HeaderThemeToggle, HeaderLanguageSwitch, HeaderLoginButton.
 */

import React, { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@digdir/designsystemet-react';
import {
  SunIcon,
  MoonIcon,
  UserIcon,
  SearchIcon,
  XIcon,
  ArrowRightIcon,
  LogOutIcon,
} from '../primitives';
import { cn } from '../utils';
import s from './header-parts.module.css';

// =============================================================================
// Private SVGs (no primitives equivalent)
// =============================================================================

/** Chevron Down for dropdown toggles */
const ChevronDownIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/** Loading Spinner */
const LoadingSpinner = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={s.spinner}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeOpacity="0.2"
    />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/** Search Empty State Icon */
const SearchEmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8" opacity="0.5" />
    <path d="m21 21-4.35-4.35" opacity="0.5" />
    <path d="M8 11h6" strokeLinecap="round" />
  </svg>
);

// =============================================================================
// HeaderLogo
// =============================================================================

export interface HeaderLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  title?: string;
  subtitle?: string;
  /** @default '32px' */
  height?: string;
  href?: string;
  /** @default false */
  hideTextOnMobile?: boolean;
}

export const HeaderLogo = forwardRef<HTMLDivElement, HeaderLogoProps>(
  ({ src, title, subtitle, height = '32px', href, hideTextOnMobile = false, className, style, ...props }, ref) => {
    const content = (
      <div className={s.logoInner}>
        {src && (
          <img
            src={src}
            alt=""
            className={s.logoImage}
            style={{ height }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        {(title || subtitle) && (
          <div className={cn(s.logoTextGroup, hideTextOnMobile && s.logoTextHidden)}>
            {title && <span className={s.logoTitle}>{title}</span>}
            {subtitle && <span className={s.logoSubtitle}>{subtitle}</span>}
          </div>
        )}
      </div>
    );

    if (href) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={cn(s.logoLink, className)}
          style={style}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </a>
      );
    }

    return (
      <div ref={ref} className={className} style={style} {...props}>
        {content}
      </div>
    );
  }
);

HeaderLogo.displayName = 'HeaderLogo';

// =============================================================================
// Search Result Types
// =============================================================================

export interface SearchResultItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  shortcut?: string;
  meta?: string;
  group?: string;
}

export interface SearchResultGroup {
  id: string;
  label: string;
  items: SearchResultItem[];
}

// =============================================================================
// HeaderSearch
// =============================================================================

export interface HeaderSearchProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'results'> {
  /** @default 'Søk' */
  placeholder?: string;
  /** @default '100%' */
  width?: string;
  onSearch?: (value: string) => void;
  onSearchChange?: (value: string) => void;
  defaultValue?: string;
  value?: string;
  results?: SearchResultItem[] | SearchResultGroup[];
  onResultSelect?: (result: SearchResultItem) => void;
  isLoading?: boolean;
  /** @default 'Ingen resultater' */
  noResultsText?: string;
  /** @default false */
  showShortcut?: boolean;
  /** @default false */
  enableGlobalShortcut?: boolean;
  /** Height variant: 'md' (default, 52px) or 'lg' (68px, for filter toolbars) */
  size?: 'md' | 'lg';
}

function isGroupedResults(results: SearchResultItem[] | SearchResultGroup[]): results is SearchResultGroup[] {
  return results.length > 0 && results[0] !== undefined && 'items' in results[0];
}

function flattenResults(results: SearchResultItem[] | SearchResultGroup[]): SearchResultItem[] {
  if (!results.length) return [];
  if (isGroupedResults(results)) {
    return results.flatMap(group => group.items);
  }
  return results as SearchResultItem[];
}

export const HeaderSearch = forwardRef<HTMLDivElement, HeaderSearchProps>(
  ({
    placeholder = 'Søk',
    width = '100%',
    onSearch,
    onSearchChange,
    defaultValue = '',
    value: controlledValue,
    results = [],
    onResultSelect,
    isLoading = false,
    noResultsText = 'Ingen resultater',
    showShortcut = false,
    enableGlobalShortcut = false,
    size = 'md',
    className,
    style,
    ...props
  }, ref) => {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [isFocused, setIsFocused] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const flatResults = flattenResults(results);
    const hasResults = flatResults.length > 0;
    const showDropdown = isOpen && (hasResults || isLoading || (value && !hasResults));

    // Global keyboard shortcut (⌘K / Ctrl+K)
    useEffect(() => {
      if (!enableGlobalShortcut) return;
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          inputRef.current?.focus();
          setIsOpen(true);
        }
      };
      document.addEventListener('keydown', handleGlobalKeyDown);
      return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, [enableGlobalShortcut]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSelectedIndex(-1);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset selected index when results change
    useEffect(() => { setSelectedIndex(-1); }, [results]);

    // Scroll selected item into view
    useEffect(() => {
      if (selectedIndex >= 0 && dropdownRef.current) {
        const selectedElement = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
        selectedElement?.scrollIntoView({ block: 'nearest' });
      }
    }, [selectedIndex]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedIndex >= 0) {
        const selectedResult = flatResults[selectedIndex];
        if (selectedResult) {
          handleResultSelect(selectedResult);
          return;
        }
      }
      onSearch?.(value);
      setIsOpen(false);
    };

    const handleClear = useCallback(() => {
      if (controlledValue === undefined) {
        setInternalValue('');
      }
      onSearchChange?.('');
      setIsOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.focus();
    }, [controlledValue, onSearchChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onSearchChange?.(newValue);
      setIsOpen(true);
      setSelectedIndex(-1);
    };

    const handleResultSelect = (result: SearchResultItem) => {
      onResultSelect?.(result);
      if (result.href) {
        window.location.href = result.href;
      }
      setIsOpen(false);
      setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Escape':
          if (isOpen) {
            setIsOpen(false);
            setSelectedIndex(-1);
          } else {
            handleClear();
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen && hasResults) {
            setIsOpen(true);
          }
          setSelectedIndex(prev =>
            prev < flatResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : flatResults.length - 1
          );
          break;
        case 'Enter':
          if (selectedIndex >= 0) {
            const selectedResult = flatResults[selectedIndex];
            if (selectedResult) {
              e.preventDefault();
              handleResultSelect(selectedResult);
            }
          }
          break;
        case 'Tab':
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
      if (value || hasResults) {
        setIsOpen(true);
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
    };

    // Render a single result item
    const renderResultItem = (item: SearchResultItem, index: number) => {
      const isSelected = selectedIndex === index;

      return (
        <div
          key={item.id}
          data-index={index}
          id={`result-${index}`}
          role="option"
          aria-selected={isSelected}
          onClick={() => handleResultSelect(item)}
          onMouseEnter={() => setSelectedIndex(index)}
          className={s.resultItem}
        >
          {item.icon && (
            <span className={s.resultIcon}>
              {item.icon}
            </span>
          )}

          <div className={s.resultContent}>
            <div className={s.resultLabel}>{item.label}</div>
            {item.description && (
              <div className={s.resultDescription}>{item.description}</div>
            )}
          </div>

          {item.meta && (
            <span className={s.resultMeta}>{item.meta}</span>
          )}

          {item.shortcut && (
            <kbd className={s.resultShortcut}>{item.shortcut}</kbd>
          )}

          <span className={s.resultArrow}>
            <ArrowRightIcon size={16} />
          </span>
        </div>
      );
    };

    // Render results (grouped or flat)
    const renderResults = () => {
      if (isLoading) {
        return (
          <div className={s.searchLoading}>
            <LoadingSpinner size={32} />
            <span className={s.searchLoadingText}>Søker...</span>
          </div>
        );
      }

      if (!hasResults && value) {
        return (
          <div className={s.searchEmpty}>
            <SearchEmptyIcon />
            <div className={s.searchEmptyText}>
              <div className={s.searchEmptyTitle}>{noResultsText}</div>
              <div className={s.searchEmptySubtitle}>Prøv et annet søkeord</div>
            </div>
          </div>
        );
      }

      if (isGroupedResults(results)) {
        let globalIndex = 0;
        return (
          <div className={s.resultsPadding}>
            {results.map((group, groupIndex) => (
              <div key={group.id} style={groupIndex > 0 ? { marginTop: 'var(--ds-size-4)' } : undefined}>
                <div className={s.groupHeader}>
                  <span className={s.groupTitle}>{group.label}</span>
                </div>
                {group.items.map((item) => {
                  const el = renderResultItem(item, globalIndex);
                  globalIndex++;
                  return el;
                })}
              </div>
            ))}
          </div>
        );
      }

      return (
        <div className={s.resultsPadding}>
          {flatResults.map((item, index) => renderResultItem(item, index))}
        </div>
      );
    };

    // Handle ref forwarding
    const handleRef = (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    };

    return (
      <div
        ref={handleRef}
        className={cn(s.searchContainer, className)}
        style={{ width, ...style }}
        {...props}
      >
        <form onSubmit={handleSubmit} className={s.searchForm}>
          <div
            className={s.searchInputWrapper}
            data-dropdown-open={showDropdown}
            data-focused={isFocused}
            data-size={size}
          >
            <SearchIcon
              size={20}
              className={s.searchIcon}
              aria-hidden="true"
            />

            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-label={placeholder}
              aria-expanded={showDropdown ? true : false}
              aria-controls={showDropdown ? "search-results" : undefined}
              aria-activedescendant={selectedIndex >= 0 ? `result-${selectedIndex}` : undefined}
              role="combobox"
              aria-autocomplete="list"
              autoComplete="off"
              className={s.searchInput}
            />

            {showShortcut && !value && !isFocused && (
              <kbd className={s.shortcutBadge}>
                <span className={s.shortcutSymbol}>⌘</span>
                <span>K</span>
              </kbd>
            )}

            {value && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Tøm søk"
                className={s.clearButton}
              >
                <XIcon size={14} />
              </button>
            )}
          </div>
        </form>

        {/* Dropdown Results */}
        {showDropdown && (
          <div className={s.searchDropdown}>
            <div
              ref={dropdownRef}
              id="search-results"
              role="listbox"
              className={s.searchResultsList}
            >
              {renderResults()}
            </div>

            {hasResults && (
              <div className={s.searchFooter}>
                <span className={s.footerHint}>
                  <kbd className={s.footerKbd}>↑↓</kbd>
                  naviger
                </span>
                <span className={s.footerHint}>
                  <kbd className={s.footerKbd}>↵</kbd>
                  velg
                </span>
                <span className={s.footerHint}>
                  <kbd className={s.footerKbd}>esc</kbd>
                  lukk
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

HeaderSearch.displayName = 'HeaderSearch';

// =============================================================================
// HeaderActions
// =============================================================================

export interface HeaderActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** @default 'var(--ds-size-4)' */
  spacing?: string;
}

export const HeaderActions = forwardRef<HTMLDivElement, HeaderActionsProps>(
  ({ children, spacing = 'var(--ds-size-4)', className, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(s.actions, className)}
        style={{ gap: spacing, ...style }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

HeaderActions.displayName = 'HeaderActions';

// =============================================================================
// HeaderActionButton
// =============================================================================

export const HeaderActionButton: React.ForwardRefExoticComponent<
  Omit<React.ComponentProps<typeof Button>, 'ref'> & React.RefAttributes<HTMLButtonElement>
> = forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="tertiary"
        type="button"
        {...props}
      >
        {children}
      </Button>
    );
  }
);

HeaderActionButton.displayName = 'HeaderActionButton';

// =============================================================================
// HeaderIconButton
// =============================================================================

export interface HeaderIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  badge?: number;
  /** @default 99 */
  maxBadge?: number;
  /** @default 'danger' */
  badgeColor?: 'danger' | 'accent' | 'success' | 'warning';
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
}

const badgeColorMap: Record<string, { bg: string; text: string; font: string; size: string }> = {
  'danger-sm': { bg: 'var(--ds-color-danger-base-default)', text: 'var(--ds-color-danger-contrast-default)', font: '10px', size: '16px' },
  'danger-md': { bg: 'var(--ds-color-danger-base-default)', text: 'var(--ds-color-danger-contrast-default)', font: '11px', size: '18px' },
  'danger-lg': { bg: 'var(--ds-color-danger-base-default)', text: 'var(--ds-color-danger-contrast-default)', font: '12px', size: '20px' },
  'accent-sm': { bg: 'var(--ds-color-accent-base-default)', text: 'var(--ds-color-accent-contrast-default)', font: '10px', size: '16px' },
  'accent-md': { bg: 'var(--ds-color-accent-base-default)', text: 'var(--ds-color-accent-contrast-default)', font: '11px', size: '18px' },
  'accent-lg': { bg: 'var(--ds-color-accent-base-default)', text: 'var(--ds-color-accent-contrast-default)', font: '12px', size: '20px' },
  'success-sm': { bg: 'var(--ds-color-success-base-default)', text: 'var(--ds-color-success-contrast-default)', font: '10px', size: '16px' },
  'success-md': { bg: 'var(--ds-color-success-base-default)', text: 'var(--ds-color-success-contrast-default)', font: '11px', size: '18px' },
  'success-lg': { bg: 'var(--ds-color-success-base-default)', text: 'var(--ds-color-success-contrast-default)', font: '12px', size: '20px' },
  'warning-sm': { bg: 'var(--ds-color-warning-base-default)', text: 'var(--ds-color-warning-contrast-default)', font: '10px', size: '16px' },
  'warning-md': { bg: 'var(--ds-color-warning-base-default)', text: 'var(--ds-color-warning-contrast-default)', font: '11px', size: '18px' },
  'warning-lg': { bg: 'var(--ds-color-warning-base-default)', text: 'var(--ds-color-warning-contrast-default)', font: '12px', size: '20px' },
};

export const HeaderIconButton = forwardRef<HTMLButtonElement, HeaderIconButtonProps>(
  ({ icon, badge, maxBadge = 99, badgeColor = 'danger', size = 'md', className, ...props }, ref) => {
    const displayBadge = badge !== undefined && badge > 0;
    const badgeText = badge && badge > maxBadge ? `${maxBadge}+` : badge?.toString();
    const badgeKey = `${badgeColor}-${size}`;
    const badgeStyle = badgeColorMap[badgeKey];

    return (
      <button
        ref={ref}
        type="button"
        className={cn(s.iconButton, className)}
        data-size={size}
        {...props}
      >
        <span className={s.iconButtonInner}>
          {icon}
        </span>

        {displayBadge && badgeStyle && (
          <span
            className={s.iconBadge}
            style={{
              minWidth: badgeStyle.size,
              height: badgeStyle.size,
              fontSize: badgeStyle.font,
              backgroundColor: badgeStyle.bg,
              color: badgeStyle.text,
            }}
          >
            {badgeText}
          </span>
        )}
      </button>
    );
  }
);

HeaderIconButton.displayName = 'HeaderIconButton';

// =============================================================================
// HeaderThemeToggle
// =============================================================================

export interface HeaderThemeToggleProps {
  theme?: string;
  onToggle?: () => void;
  isDark?: boolean;
}

export const HeaderThemeToggle: React.FC<HeaderThemeToggleProps> = ({ onToggle, isDark = false }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Bytt til lyst tema' : 'Bytt til mørkt tema'}
      title={isDark ? 'Bytt til lyst tema' : 'Bytt til mørkt tema'}
      className={s.themeToggle}
    >
      <span className={s.themeIconWrapper} data-dark={isDark}>
        {isDark ? (
          <SunIcon size={22} aria-hidden />
        ) : (
          <MoonIcon size={22} aria-hidden />
        )}
      </span>
    </button>
  );
};

// =============================================================================
// HeaderLanguageSwitch
// =============================================================================

export interface HeaderLanguageSwitchProps {
  language?: string;
  onSwitch?: (lang: string) => void;
  /** @default [{ code: 'no', label: 'NO' }, { code: 'en', label: 'EN' }] */
  languages?: Array<{ code: string; label: string }>;
}

export const HeaderLanguageSwitch: React.FC<HeaderLanguageSwitchProps> = ({
  language = 'no',
  onSwitch,
  languages = [{ code: 'no', label: 'NO' }, { code: 'en', label: 'EN' }]
}) => {
  const handleToggle = () => {
    if (languages.length === 0) return;
    const currentIndex = languages.findIndex(l => l.code === language);
    const nextIndex = (currentIndex + 1) % languages.length;
    const nextLang = languages[nextIndex];
    if (nextLang) {
      onSwitch?.(nextLang.code);
    }
  };

  const currentLang = languages.find(l => l.code === language) ?? languages[0];
  if (!currentLang) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`Språk: ${currentLang.label}. Klikk for å bytte.`}
      className={s.langSwitch}
    >
      {currentLang.label}
    </button>
  );
};

// =============================================================================
// HeaderLoginButton
// =============================================================================

export interface HeaderLoginButtonProps {
  isLoggedIn?: boolean;
  userName?: string | undefined;
  avatarUrl?: string;
  onLogin?: () => void;
  onLogout?: () => void;
  /** @default 'Logg inn' */
  loginText?: string;
  /** @default 'Logg ut' */
  logoutText?: string;
  /** @default 'accent' */
  color?: 'accent' | 'neutral' | 'danger';
  menuItems?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    href?: string;
    divider?: boolean;
  }>;
}

export const HeaderLoginButton: React.FC<HeaderLoginButtonProps> = ({
  isLoggedIn,
  userName,
  avatarUrl,
  onLogin,
  onLogout,
  loginText = 'Logg inn',
  logoutText = 'Logg ut',
  color = 'accent',
  menuItems = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const colorProps = color !== 'neutral' ? { 'data-color': color } : {};

  type MenuItem = {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    href?: string;
    divider?: boolean;
  };

  // Logged in state
  if (isLoggedIn && userName) {
    const allMenuItems: MenuItem[] = menuItems.length > 0 ? menuItems : [
      { label: logoutText, icon: <LogOutIcon size={18} />, onClick: onLogout },
    ];

    return (
      <div ref={containerRef} className={s.loginContainer}>
        <Button
          variant="primary"
          type="button"
          {...colorProps}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Brukerinfo for ${userName}`}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className={s.userAvatar} />
          ) : (
            <UserIcon size={20} aria-hidden />
          )}
          <span className={s.userName}>{userName}</span>
          <span className={s.chevronWrapper} data-open={isOpen}>
            <ChevronDownIcon size={16} />
          </span>
        </Button>

        {isOpen && (
          <div role="menu" className={s.userDropdown}>
            <div className={s.userDropdownHeader}>
              <div className={s.userDropdownName}>{userName}</div>
            </div>

            <div className={s.userDropdownItems}>
              {allMenuItems.map((item, index) => {
                if (item.divider) {
                  return <div key={`divider-${index}`} className={s.menuDivider} />;
                }

                const content = (
                  <>
                    {item.icon && (
                      <span className={s.menuItemIcon}>{item.icon}</span>
                    )}
                    <span>{item.label}</span>
                  </>
                );

                if (item.href) {
                  return (
                    <a
                      key={index}
                      href={item.href}
                      role="menuitem"
                      className={s.menuItem}
                      onClick={() => setIsOpen(false)}
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <button
                    key={index}
                    type="button"
                    role="menuitem"
                    className={s.menuItem}
                    onClick={() => {
                      setIsOpen(false);
                      item.onClick?.();
                    }}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Logged out state
  return (
    <Button
      variant="primary"
      type="button"
      {...colorProps}
      onClick={onLogin}
      aria-label={loginText}
    >
      <UserIcon size={20} aria-hidden />
      {loginText}
    </Button>
  );
};
