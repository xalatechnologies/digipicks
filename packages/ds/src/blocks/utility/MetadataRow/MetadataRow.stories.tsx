import type { Meta, StoryObj } from '@storybook/react';
import { MetadataRow } from './MetadataRow';
import { Badge } from '../../../primitives';

// Sample icons
const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const MapPinIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const meta = {
    title: 'Blocks/Utility/MetadataRow',
    component: MetadataRow,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof MetadataRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic
export const Basic: Story = {
    args: {
        label: 'Period',
        value: 'Jan 1 - Dec 31, 2024',
    },
};

export const WithIcon: Story = {
    args: {
        icon: <CalendarIcon />,
        label: 'Period',
        value: 'Jan 1 - Dec 31, 2024',
    },
};

export const WithBadge: Story = {
    args: {
        icon: <UserIcon />,
        label: 'Status',
        value: 'Active',
        badge: <Badge data-color="success" data-size="sm">Verified</Badge>,
    },
};

// Sizes
export const Small: Story = {
    args: {
        icon: <MapPinIcon />,
        label: 'Location',
        value: 'Oslo, Norway',
        size: 'sm',
    },
};

export const Medium: Story = {
    args: {
        icon: <MapPinIcon />,
        label: 'Location',
        value: 'Oslo, Norway',
        size: 'md',
    },
};

// Examples
export const DateRange: Story = {
    args: {
        icon: <CalendarIcon />,
        label: 'Booking Period',
        value: 'March 15 - March 22, 2024',
    },
};

export const UserInfo: Story = {
    args: {
        icon: <UserIcon />,
        label: 'Created By',
        value: 'John Doe',
    },
};

export const LocationInfo: Story = {
    args: {
        icon: <MapPinIcon />,
        label: 'Address',
        value: 'Storgata 1, 0155 Oslo',
    },
};
