import { useState, useRef, useEffect } from 'react';
import { cn } from '../../../utils';
import {
    UserIcon,
    CheckIcon,
    LogOutIcon,
    BuildingIcon,
} from '../../../primitives/icons';
import styles from './UserMenu.module.css';

/**
 * UserMenu Component
 *
 * User dropdown menu with profile, account switching, and navigation.
 * Designed to integrate with AppHeader.
 *
 * @example Basic usage
 * ```tsx
 * <UserMenu
 *   user={{ name: 'John Doe', email: 'john@example.com' }}
 *   onLogout={handleLogout}
 * />
 * ```
 *
 * @example With all features
 * ```tsx
 * <UserMenu
 *   user={{
 *     name: 'John Doe',
 *     email: 'john@example.com',
 *     avatar: '/avatar.jpg',
 *   }}
 *   accounts={[
 *     { id: '1', name: 'Personal', type: 'personal' },
 *     { id: '2', name: 'Acme Corp', type: 'organization' },
 *   ]}
 *   currentAccountId="1"
 *   onAccountSwitch={handleAccountSwitch}
 *   menuItems={[
 *     { label: 'Profile', icon: <UserIcon />, href: '/profile' },
 *     { label: 'Settings', icon: <SettingsIcon />, href: '/settings' },
 *   ]}
 *   onLogout={handleLogout}
 * />
 * ```
 */

export interface UserMenuProps {
    /** User information */
    user: {
        name: string;
        email: string;
        avatar?: string;
    };

    /** Available accounts for switching */
    accounts?: Array<{
        id: string;
        name: string;
        type: 'personal' | 'organization';
        avatar?: string;
    }>;

    /** Current active account ID */
    currentAccountId?: string;

    /** Account switch handler */
    onAccountSwitch?: (accountId: string) => void;

    /** Menu items */
    menuItems?: Array<{
        label: string;
        icon?: React.ReactNode;
        href?: string;
        onClick?: () => void;
    }>;

    /** Logout handler */
    onLogout?: () => void;

    /** Additional CSS class */
    className?: string;
}

// Icons — ChevronDownIcon kept local (no primitive equivalent)
const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

export function UserMenu({
    user,
    accounts = [],
    currentAccountId,
    onAccountSwitch,
    menuItems = [],
    onLogout,
    className,
}: UserMenuProps): React.ReactElement {
    // Defensive: fall back to safe defaults if user is missing
    const safeUser = user ?? { name: 'User', email: '' };
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className={cn(styles.userMenu, className)} ref={menuRef}>
            <button
                type="button"
                className={cn(styles.trigger, isOpen && styles.open)}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <div className={styles.avatar}>
                    {safeUser.avatar ? (
                        <img src={safeUser.avatar} alt={safeUser.name} className={styles.avatarImage} />
                    ) : (
                        <span className={styles.avatarInitials}>{getInitials(safeUser.name)}</span>
                    )}
                </div>
                <div className={styles.userInfo}>
                    <div className={styles.userName}>{safeUser.name}</div>
                    <div className={styles.userEmail}>{safeUser.email}</div>
                </div>
                <ChevronDownIcon />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    {/* User Info Section */}
                    <div className={styles.section}>
                        <div className={styles.userHeader}>
                            <div className={styles.avatar}>
                                {safeUser.avatar ? (
                                    <img src={safeUser.avatar} alt={safeUser.name} className={styles.avatarImage} />
                                ) : (
                                    <span className={styles.avatarInitials}>{getInitials(safeUser.name)}</span>
                                )}
                            </div>
                            <div className={styles.userDetails}>
                                <div className={styles.userName}>{safeUser.name}</div>
                                <div className={styles.userEmail}>{safeUser.email}</div>
                            </div>
                        </div>
                    </div>

                    {/* Account Switcher */}
                    {accounts.length > 0 && (
                        <>
                            <div className={styles.divider} />
                            <div className={styles.section}>
                                <div className={styles.sectionLabel}>Switch Account</div>
                                {accounts.map((account) => (
                                    <button
                                        key={account.id}
                                        type="button"
                                        className={cn(
                                            styles.accountItem,
                                            account.id === currentAccountId && styles.active
                                        )}
                                        onClick={() => {
                                            onAccountSwitch?.(account.id);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <div className={styles.accountIcon}>
                                            {account.type === 'organization' ? <BuildingIcon /> : <UserIcon />}
                                        </div>
                                        <div className={styles.accountName}>{account.name}</div>
                                        {account.id === currentAccountId && (
                                            <div className={styles.checkIcon}>
                                                <CheckIcon />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Menu Items */}
                    {menuItems.length > 0 && (
                        <>
                            <div className={styles.divider} />
                            <div className={styles.section}>
                                {menuItems.map((item, index) =>
                                    item.href ? (
                                        <a
                                            key={index}
                                            href={item.href}
                                            className={styles.menuItem}
                                            onClick={() => setIsOpen(false)}
                                            {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                        >
                                            {item.icon && <div className={styles.menuIcon}>{item.icon}</div>}
                                            <span>{item.label}</span>
                                        </a>
                                    ) : (
                                        <button
                                            key={index}
                                            type="button"
                                            className={styles.menuItem}
                                            onClick={() => {
                                                item.onClick?.();
                                                setIsOpen(false);
                                            }}
                                        >
                                            {item.icon && <div className={styles.menuIcon}>{item.icon}</div>}
                                            <span>{item.label}</span>
                                        </button>
                                    )
                                )}
                            </div>
                        </>
                    )}

                    {/* Logout */}
                    {onLogout && (
                        <>
                            <div className={styles.divider} />
                            <div className={styles.section}>
                                <button
                                    type="button"
                                    className={cn(styles.menuItem, styles.logout)}
                                    onClick={() => {
                                        onLogout();
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className={styles.menuIcon}>
                                        <LogOutIcon />
                                    </div>
                                    <span>Logg ut</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

UserMenu.displayName = 'UserMenu';
