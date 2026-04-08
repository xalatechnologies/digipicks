import type { Meta, StoryObj } from '@storybook/react';
import { InfoGrid } from './InfoGrid';

const meta: Meta<typeof InfoGrid> = {
    title: 'Patterns/InfoGrid',
    component: InfoGrid,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InfoGrid>;

const sampleItems = [
    { label: 'Navn', value: 'Konferanserom Oslo' },
    { label: 'Kapasitet', value: '50 personer' },
    { label: 'Pris', value: '2 500 kr/dag' },
    { label: 'Lokasjon', value: 'Oslo Sentrum' },
];

export const Default: Story = {
    args: {
        items: sampleItems,
    },
};

export const SingleColumn: Story = {
    args: {
        items: sampleItems,
        columns: 1,
    },
};

export const ThreeColumns: Story = {
    args: {
        items: sampleItems,
        columns: 3,
    },
};

export const Bordered: Story = {
    args: {
        items: sampleItems,
        variant: 'bordered',
    },
};

export const Striped: Story = {
    args: {
        items: sampleItems,
        variant: 'striped',
    },
};

export const WithHighlight: Story = {
    args: {
        items: [
            { label: 'Navn', value: 'Konferanserom Oslo' },
            { label: 'Kapasitet', value: '50 personer', highlight: true },
            { label: 'Pris', value: '2 500 kr/dag' },
            { label: 'Lokasjon', value: 'Oslo Sentrum' },
        ],
    },
};
