import type { Meta, StoryObj } from '@storybook/react';
import { AppHeader } from './AppHeader';

const meta = {
    title: 'Blocks/Navigation/AppHeader',
    component: AppHeader,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic
export const Basic: Story = {
    args: {
        showSearch: true,
        searchPlaceholder: 'Search...',
    },
};

export const WithAllFeatures: Story = {
    args: {
        leftContent: <div style={{ padding: '8px 12px', backgroundColor: 'var(--ds-color-accent-surface-default)', borderRadius: 'var(--ds-border-radius-md)', fontWeight: 600 }}>Logo</div>,
        showSearch: true,
        searchPlaceholder: 'Search in bookings, users...',
        showThemeToggle: true,
        isDark: false,
        showNotifications: true,
        notificationCount: 5,
        showSettings: true,
        showLogout: true,
        user: {
            name: 'John Doe',
            email: 'john.doe@example.com',
        },
    },
};

// Search Variants
export const WithSearch: Story = {
    args: {
        showSearch: true,
        searchPlaceholder: 'Search in bookings, users...',
        searchResults: [
            {
                id: '1',
                label: 'Booking #12345',
                description: 'Oslo Idrettshall - Jan 15, 2024',
            },
            {
                id: '2',
                label: 'John Doe',
                description: 'john.doe@example.com',
            },
            {
                id: '3',
                label: 'Settings',
                description: 'Configure your application',
            },
        ],
    },
};

export const WithoutSearch: Story = {
    args: {
        showThemeToggle: true,
        showNotifications: true,
        showSettings: true,
        showLogout: true,
    },
};

// Notification Variants
export const WithNotifications: Story = {
    args: {
        showSearch: true,
        showThemeToggle: true,
        showNotifications: true,
        notificationCount: 3,
        showSettings: true,
        showLogout: true,
    },
};

export const WithManyNotifications: Story = {
    args: {
        showSearch: true,
        showThemeToggle: true,
        showNotifications: true,
        notificationCount: 99,
        showSettings: true,
        showLogout: true,
    },
};

export const NoNotifications: Story = {
    args: {
        showSearch: true,
        showThemeToggle: true,
        showNotifications: true,
        notificationCount: 0,
        showSettings: true,
        showLogout: true,
    },
};

// Theme Variants
export const LightMode: Story = {
    args: {
        showSearch: true,
        showThemeToggle: true,
        isDark: false,
        showNotifications: true,
        notificationCount: 2,
        showSettings: true,
        showLogout: true,
    },
};

export const DarkMode: Story = {
    args: {
        showSearch: true,
        showThemeToggle: true,
        isDark: true,
        showNotifications: true,
        notificationCount: 2,
        showSettings: true,
        showLogout: true,
    },
    parameters: {
        backgrounds: { default: 'dark' },
    },
};

// Minimal
export const MinimalHeader: Story = {
    args: {
        showLogout: true,
    },
};

// With Left Content
export const WithAccountSwitcher: Story = {
    args: {
        leftContent: (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--ds-size-2)',
                padding: '8px 12px',
                backgroundColor: 'var(--ds-color-neutral-surface-hover)',
                borderRadius: 'var(--ds-border-radius-md)',
                cursor: 'pointer',
            }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--ds-border-radius-full)',
                    backgroundColor: 'var(--ds-color-accent-surface-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    color: 'var(--ds-color-accent-text-default)',
                }}>
                    JD
                </div>
                <div>
                    <div style={{ fontSize: 'var(--ds-font-size-sm)', fontWeight: 600 }}>John Doe</div>
                    <div style={{ fontSize: 'var(--ds-font-size-xs)', color: 'var(--ds-color-neutral-text-subtle)' }}>Personal Account</div>
                </div>
            </div>
        ),
        showSearch: true,
        searchPlaceholder: 'Search...',
        showThemeToggle: true,
        showNotifications: true,
        notificationCount: 3,
        showSettings: true,
        showLogout: true,
    },
};

// Interactive Example
export const Interactive: Story = {
    args: {
        leftContent: <div style={{ padding: '8px 12px', backgroundColor: 'var(--ds-color-accent-surface-default)', borderRadius: 'var(--ds-border-radius-md)', fontWeight: 600 }}>Digilist</div>,
        showSearch: true,
        searchPlaceholder: 'Search in bookings, users, venues...',
        showThemeToggle: true,
        isDark: false,
        showNotifications: true,
        notificationCount: 5,
        showSettings: true,
        showLogout: true,
        user: {
            name: 'John Doe',
            email: 'john.doe@example.com',
        },
    },
};
