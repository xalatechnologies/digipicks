import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
    title: 'Patterns/StatusBadge',
    component: StatusBadge,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Success: Story = {
    args: {
        status: 'success',
        label: 'Aktiv',
    },
};

export const Warning: Story = {
    args: {
        status: 'warning',
        label: 'Venter',
    },
};

export const Error: Story = {
    args: {
        status: 'error',
        label: 'Avvist',
    },
};

export const Info: Story = {
    args: {
        status: 'info',
        label: 'Info',
    },
};

export const Neutral: Story = {
    args: {
        status: 'neutral',
        label: 'Utkast',
    },
};

export const Small: Story = {
    args: {
        status: 'success',
        label: 'Liten',
        size: 'sm',
    },
};

export const Large: Story = {
    args: {
        status: 'info',
        label: 'Stor',
        size: 'lg',
    },
};

export const Outlined: Story = {
    args: {
        status: 'success',
        label: 'Outlined',
        variant: 'outlined',
    },
};

export const Subtle: Story = {
    args: {
        status: 'warning',
        label: 'Subtle',
        variant: 'subtle',
    },
};
