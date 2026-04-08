import type { Meta, StoryObj } from '@storybook/react';
import { IconBox } from './IconBox';

// Sample icons for stories
const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const AlertIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const meta = {
    title: 'Blocks/Utility/IconBox',
    component: IconBox,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof IconBox>;

export default meta;
type Story = StoryObj<typeof meta>;

// Variants
export const Accent: Story = {
    args: {
        icon: <CalendarIcon />,
        variant: 'accent',
        size: 'md',
    },
};

export const Success: Story = {
    args: {
        icon: <CheckIcon />,
        variant: 'success',
        size: 'md',
    },
};

export const Warning: Story = {
    args: {
        icon: <AlertIcon />,
        variant: 'warning',
        size: 'md',
    },
};

export const Danger: Story = {
    args: {
        icon: <AlertIcon />,
        variant: 'danger',
        size: 'md',
    },
};

export const Neutral: Story = {
    args: {
        icon: <UserIcon />,
        variant: 'neutral',
        size: 'md',
    },
};

// Sizes
export const Small: Story = {
    args: {
        icon: <CalendarIcon />,
        variant: 'accent',
        size: 'sm',
    },
};

export const Medium: Story = {
    args: {
        icon: <CalendarIcon />,
        variant: 'accent',
        size: 'md',
    },
};

export const Large: Story = {
    args: {
        icon: <CalendarIcon />,
        variant: 'accent',
        size: 'lg',
    },
};

// Shapes
export const Rounded: Story = {
    args: {
        icon: <CalendarIcon />,
        variant: 'accent',
        size: 'md',
        shape: 'rounded',
    },
};

export const Square: Story = {
    args: {
        icon: <CalendarIcon />,
        variant: 'accent',
        size: 'md',
        shape: 'square',
    },
};

// With Badge
export const WithBadge: Story = {
    args: {
        icon: <UserIcon />,
        variant: 'accent',
        size: 'md',
        badge: '3',
    },
};

export const WithLargeBadge: Story = {
    args: {
        icon: <UserIcon />,
        variant: 'success',
        size: 'lg',
        badge: '99+',
    },
};

// Showcase
export const AllVariants: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: 'var(--ds-size-4)', flexWrap: 'wrap' }}>
            <IconBox icon={<CalendarIcon />} variant="accent" size="md" />
            <IconBox icon={<CheckIcon />} variant="success" size="md" />
            <IconBox icon={<AlertIcon />} variant="warning" size="md" />
            <IconBox icon={<AlertIcon />} variant="danger" size="md" />
            <IconBox icon={<UserIcon />} variant="neutral" size="md" />
        </div>
    ),
};

export const AllSizes: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: 'var(--ds-size-4)', alignItems: 'center' }}>
            <IconBox icon={<CalendarIcon />} variant="accent" size="sm" />
            <IconBox icon={<CalendarIcon />} variant="accent" size="md" />
            <IconBox icon={<CalendarIcon />} variant="accent" size="lg" />
        </div>
    ),
};
