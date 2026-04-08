import { useState, useRef, useEffect } from 'react';
import styles from './ActionMenu.module.css';

export interface Action {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
    disabled?: boolean;
}

export interface ActionMenuProps {
    actions: Action[];
    trigger?: React.ReactNode;
}

/**
 * ActionMenu - Dropdown action menu component
 * 
 * Provides a dropdown menu with common actions (View, Edit, Delete).
 * Uses only design tokens - no custom styling allowed.
 * 
 * @example
 * ```tsx
 * <ActionMenu
 *   actions={[
 *     { label: 'View', icon: <EyeIcon />, onClick: () => view() },
 *     { label: 'Edit', icon: <EditIcon />, onClick: () => edit() },
 *     { label: 'Delete', icon: <TrashIcon />, onClick: () => del(), variant: 'danger' }
 *   ]}
 * />
 * ```
 */
export function ActionMenu({ actions, trigger }: ActionMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
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

    const handleActionClick = (action: Action) => {
        if (!action.disabled) {
            action.onClick();
            setIsOpen(false);
        }
    };

    return (
        <div className={styles.container} ref={menuRef}>
            <button
                type="button"
                className={styles.trigger}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {trigger || (
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <circle cx="8" cy="3" r="1.5" />
                        <circle cx="8" cy="8" r="1.5" />
                        <circle cx="8" cy="13" r="1.5" />
                    </svg>
                )}
            </button>

            {isOpen && (
                <div className={styles.menu}>
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            type="button"
                            className={styles.menuItem}
                            data-variant={action.variant || 'default'}
                            onClick={() => handleActionClick(action)}
                            disabled={action.disabled}
                        >
                            {action.icon && <span className={styles.icon}>{action.icon}</span>}
                            <span className={styles.label}>{action.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
