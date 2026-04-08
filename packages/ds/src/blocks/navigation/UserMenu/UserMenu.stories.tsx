import type { Meta, StoryObj } from '@storybook/react';
import { UserMenu } from './UserMenu';

// Sample icons for menu items
const SettingsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
    </svg>
);

const BellIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const HelpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const meta = {
    title: 'Blocks/Navigation/UserMenu',
    component: UserMenu,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof UserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic
export const Basic: Story = {
    args: {
        user: {
            name: 'John Doe',
            email: 'john.doe@example.com',
        },
        onLogout: () => console.log('Logout clicked'),
    },
};

export const WithAvatar: Story = {
    args: {
        user: {
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            avatar: 'https://i.pravatar.cc/150?img=5',
        },
        onLogout: () => console.log('Logout clicked'),
    },
};

// With Account Switching
export const WithAccounts: Story = {
    args: {
        user: {
            name: 'John Doe',
            email: 'john.doe@example.com',
        },
        accounts: [
            { id: '1', name: 'Personal Account', type: 'personal' },
            { id: '2', name: 'Acme Corporation', type: 'organization' },
            { id: '3', name: 'Tech Startup Inc', type: 'organization' },
        ],
        currentAccountId: '1',
        onAccountSwitch: (id) => console.log('Switch to account:', id),
        onLogout: () => console.log('Logout clicked'),
    },
};

export const OrganizationAccount: Story = {
    args: {
        user: {
            name: 'John Doe',
            email: 'john.doe@acme.com',
        },
        accounts: [
            { id: '1', name: 'Personal Account', type: 'personal' },
            { id: '2', name: 'Acme Corporation', type: 'organization' },
        ],
        currentAccountId: '2',
        onAccountSwitch: (id) => console.log('Switch to account:', id),
        onLogout: () => console.log('Logout clicked'),
    },
};

// With Menu Items
export const WithMenuItems: Story = {
    args: {
        user: {
            name: 'John Doe',
            email: 'john.doe@example.com',
        },
        menuItems: [
            { label: 'Settings', icon: <SettingsIcon />, onClick: () => console.log('Settings') },
            { label: 'Notifications', icon: <BellIcon />, onClick: () => console.log('Notifications') },
            { label: 'Help & Support', icon: <HelpIcon />, onClick: () => console.log('Help') },
        ],
        onLogout: () => console.log('Logout clicked'),
    },
};

// Complete Example
export const Complete: Story = {
    args: {
        user: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            avatar: 'https://i.pravatar.cc/150?img=12',
        },
        accounts: [
            { id: '1', name: 'Personal Account', type: 'personal' },
            { id: '2', name: 'Acme Corporation', type: 'organization' },
            { id: '3', name: 'Tech Startup Inc', type: 'organization' },
        ],
        currentAccountId: '1',
        onAccountSwitch: (id) => console.log('Switch to account:', id),
        menuItems: [
            { label: 'Profile Settings', icon: <SettingsIcon />, onClick: () => console.log('Settings') },
            { label: 'Notifications', icon: <BellIcon />, onClick: () => console.log('Notifications') },
            { label: 'Help & Support', icon: <HelpIcon />, onClick: () => console.log('Help') },
        ],
        onLogout: () => console.log('Logout clicked'),
    },
};

// Long Names
export const LongNames: Story = {
    args: {
        user: {
            name: 'Christopher Alexander Montgomery',
            email: 'christopher.montgomery@verylongdomainname.com',
        },
        accounts: [
            { id: '1', name: 'Personal Account', type: 'personal' },
            { id: '2', name: 'Very Long Organization Name That Should Truncate', type: 'organization' },
        ],
        currentAccountId: '1',
        onAccountSwitch: (id) => console.log('Switch to account:', id),
        onLogout: () => console.log('Logout clicked'),
    },
};

// Minimal
export const MinimalMenu: Story = {
    args: {
        user: {
            name: 'John Doe',
            email: 'john@example.com',
        },
    },
};
