import * as React from 'react';
import { cn } from '../../../utils';
import {
    SearchIcon,
    SunIcon,
    MoonIcon,
    BellIcon,
    SettingsIcon,
    LogOutIcon,
} from '../../../primitives/icons';
import styles from './AppHeader.module.css';

/**
 * AppHeader Component
 *
 * Unified header component for all applications with configurable zones.
 * Supports two APIs:
 *
 * **Slot-based** (preferred): Pass `logo`, `search`, `actions` as ReactNode slots.
 * **Prop-based** (legacy): Use `leftContent`, `showSearch`, `showThemeToggle`, etc.
 *
 * Slot props take priority — if `logo` is provided, it renders instead of `leftContent`.
 * If `search` is provided, it renders instead of the built-in search.
 * If `actions` is provided, it renders instead of the built-in action buttons.
 *
 * @example Slot-based (recommended)
 * ```tsx
 * <AppHeader
 *   sticky
 *   logo={<HeaderLogo src="/logo.svg" title="DIGILIST" href="/" />}
 *   search={<GlobalSearch placeholder="Søk..." />}
 *   actions={
 *     <HeaderActions>
 *       <HeaderThemeToggle isDark={isDark} onToggle={toggleTheme} />
 *       <NotificationBell count={3} />
 *       <UserMenu userName="John" onLogout={logout} />
 *     </HeaderActions>
 *   }
 * />
 * ```
 *
 * @example Prop-based (legacy)
 * ```tsx
 * <AppHeader
 *   leftContent={<AccountSwitcher />}
 *   showSearch
 *   searchPlaceholder="Search..."
 *   showThemeToggle
 *   isDark={isDark}
 *   onThemeToggle={toggleTheme}
 * />
 * ```
 */

export interface AppHeaderProps {
    /** HTML id attribute */
    id?: string;

    /** Make the header sticky at the top */
    sticky?: boolean;

    // ── Slot-based API (preferred) ──────────────────────────────

    /** Logo/brand slot for the left zone */
    logo?: React.ReactNode;
    /** Search slot for the center zone (replaces built-in search) */
    search?: React.ReactNode;
    /** Actions slot for the right zone (replaces built-in action buttons) */
    actions?: React.ReactNode;

    // ── Prop-based API (legacy) ─────────────────────────────────

    /** Custom content for left zone (e.g., logo, account switcher) */
    leftContent?: React.ReactNode;

    /** Show built-in search bar in center */
    showSearch?: boolean;
    /** Search placeholder text */
    searchPlaceholder?: string;
    /** Search value (controlled) */
    searchValue?: string;
    /** Search change handler */
    onSearchChange?: (value: string) => void;
    /** Search results for autocomplete */
    searchResults?: Array<{
        id: string;
        label: string;
        description?: string;
        icon?: React.ReactNode;
        href?: string;
    }>;
    /** Search result select handler */
    onSearchResultSelect?: (result: { id: string; href?: string }) => void;

    /** Show theme toggle */
    showThemeToggle?: boolean;
    /** Is dark mode active */
    isDark?: boolean;
    /** Theme toggle handler */
    onThemeToggle?: () => void;

    /** Show notification bell */
    showNotifications?: boolean;
    /** Notification count */
    notificationCount?: number;
    /** Notification click handler */
    onNotificationClick?: () => void;

    /** Show settings button */
    showSettings?: boolean;
    /** Settings click handler */
    onSettingsClick?: () => void;

    /** Show logout button */
    showLogout?: boolean;
    /** Logout handler */
    onLogout?: () => void;

    /** User information */
    user?: {
        name: string;
        email: string;
        avatar?: string;
    };

    /** Additional CSS class */
    className?: string;
}


export function AppHeader({
    id,
    sticky = true,
    logo,
    search,
    actions,
    leftContent,
    showSearch = false,
    searchPlaceholder = 'Search...',
    searchValue = '',
    onSearchChange,
    searchResults = [],
    onSearchResultSelect,
    showThemeToggle = false,
    isDark = false,
    onThemeToggle,
    showNotifications = false,
    notificationCount = 0,
    onNotificationClick,
    showSettings = false,
    onSettingsClick,
    showLogout = false,
    onLogout,
    user,
    className,
}: AppHeaderProps): React.ReactElement {
    const [searchFocused, setSearchFocused] = React.useState(false);
    const [localSearchValue, setLocalSearchValue] = React.useState(searchValue);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocalSearchValue(value);
        onSearchChange?.(value);
    };

    // Determine zone content: slot props take priority over prop-based API
    const leftZoneContent = logo ?? leftContent;
    const hasSlotSearch = search != null;
    const hasSlotActions = actions != null;

    return (
        <header
            id={id}
            className={cn(styles.header, className)}
            data-sticky={sticky || undefined}
        >
            <div className={styles.container}>
                {/* Left Zone */}
                <div className={styles.leftZone}>
                    {leftZoneContent}
                </div>

                {/* Center Zone - Search (slot or built-in) */}
                {hasSlotSearch ? (
                    <div className={styles.centerZone}>
                        {search}
                    </div>
                ) : showSearch ? (
                    <div className={styles.centerZone}>
                        <div className={styles.searchContainer}>
                            <div className={styles.searchIcon}>
                                <SearchIcon />
                            </div>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder={searchPlaceholder}
                                value={localSearchValue}
                                onChange={handleSearchChange}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                            />
                            {searchFocused && searchResults.length > 0 && (
                                <div className={styles.searchResults}>
                                    {searchResults.map((result) => (
                                        <button
                                            key={result.id}
                                            type="button"
                                            className={styles.searchResult}
                                            onClick={() => {
                                                onSearchResultSelect?.(result);
                                                setSearchFocused(false);
                                            }}
                                        >
                                            {result.icon && <div className={styles.resultIcon}>{result.icon}</div>}
                                            <div className={styles.resultContent}>
                                                <div className={styles.resultLabel}>{result.label}</div>
                                                {result.description && (
                                                    <div className={styles.resultDescription}>{result.description}</div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}

                {/* Right Zone - Actions (slot or built-in) */}
                {hasSlotActions ? (
                    <div className={styles.rightZone}>
                        {actions}
                    </div>
                ) : (
                    <div className={styles.rightZone}>
                        {showThemeToggle && (
                            <button
                                type="button"
                                className={styles.iconButton}
                                onClick={onThemeToggle}
                                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                                title={isDark ? 'Light mode' : 'Dark mode'}
                            >
                                {isDark ? <SunIcon /> : <MoonIcon />}
                            </button>
                        )}

                        {showNotifications && (
                            <button
                                type="button"
                                className={cn(styles.iconButton, notificationCount > 0 && styles.hasNotifications)}
                                onClick={onNotificationClick}
                                aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
                                title="Notifications"
                            >
                                <BellIcon />
                                {notificationCount > 0 && (
                                    <span className={styles.notificationBadge}>{notificationCount}</span>
                                )}
                            </button>
                        )}

                        {showSettings && (
                            <button
                                type="button"
                                className={styles.iconButton}
                                onClick={onSettingsClick}
                                aria-label="Settings"
                                title="Settings"
                            >
                                <SettingsIcon />
                            </button>
                        )}

                        {(showLogout || user) && <div className={styles.divider} />}

                        {showLogout && (
                            <button
                                type="button"
                                className={styles.logoutButton}
                                onClick={onLogout}
                                aria-label="Log out"
                            >
                                <LogOutIcon />
                                <span>Log out</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}

AppHeader.displayName = 'AppHeader';
