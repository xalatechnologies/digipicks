import type { Meta, StoryObj } from '@storybook/react';
import { CardHeader } from './CardHeader';
import { Button } from '@/primitives';

// Sample icons for stories
const ArrowLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);

const meta = {
    title: 'Blocks/Utility/CardHeader',
    component: CardHeader,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof CardHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic
export const Basic: Story = {
    args: {
        title: 'User Profile',
    },
};

export const WithSubtitle: Story = {
    args: {
        title: 'User Profile',
        subtitle: 'Manage your account settings and preferences',
    },
};

// With Actions
export const WithActions: Story = {
    args: {
        title: 'Bookings',
        subtitle: 'View and manage your bookings',
        actions: (
            <>
                <Button type="button" variant="secondary" data-size="sm">
                    Export
                </Button>
                <Button type="button" variant="primary" data-size="sm">
                    New Booking
                </Button>
            </>
        ),
    },
};

export const WithSingleAction: Story = {
    args: {
        title: 'Season Applications',
        actions: (
            <Button type="button" variant="primary" data-size="sm">
                New Application
            </Button>
        ),
    },
};

// With Back Button
export const WithBackButton: Story = {
    args: {
        title: 'Booking Details',
        subtitle: 'Booking #12345',
        onBack: () => alert('Navigate back'),
    },
};

export const WithBackButtonAndActions: Story = {
    args: {
        title: 'Edit User',
        subtitle: 'john.doe@example.com',
        onBack: () => alert('Navigate back'),
        actions: (
            <>
                <Button type="button" variant="tertiary" data-size="sm">
                    Cancel
                </Button>
                <Button type="button" variant="primary" data-size="sm">
                    Save Changes
                </Button>
            </>
        ),
    },
};

// With Divider
export const WithDivider: Story = {
    args: {
        title: 'Settings',
        subtitle: 'Configure your application',
        divider: true,
    },
};

export const WithDividerAndActions: Story = {
    args: {
        title: 'Dashboard',
        subtitle: 'Overview of your activity',
        divider: true,
        actions: (
            <Button type="button" variant="secondary" data-size="sm">
                Refresh
            </Button>
        ),
    },
};

// Sizes
export const LongTitle: Story = {
    args: {
        title: 'This is a very long title that might wrap on smaller screens',
        subtitle: 'And this is a subtitle with additional context that provides more information',
        actions: (
            <Button type="button" variant="primary" data-size="sm">
                Action
            </Button>
        ),
    },
};

// Complex Example
export const ComplexExample: Story = {
    args: {
        title: 'User Management',
        subtitle: '1,234 active users',
        onBack: () => alert('Navigate back'),
        divider: true,
        actions: (
            <>
                <Button type="button" variant="tertiary" data-size="sm">
                    Import
                </Button>
                <Button type="button" variant="secondary" data-size="sm">
                    Export
                </Button>
                <Button type="button" variant="primary" data-size="sm">
                    Add User
                </Button>
            </>
        ),
    },
};
