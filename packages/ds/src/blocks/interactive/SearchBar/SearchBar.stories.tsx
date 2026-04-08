import type { Meta, StoryObj } from '@storybook/react';
import { SearchBar } from './SearchBar';
import type { SearchSuggestion } from './SearchBar';

const meta: Meta<typeof SearchBar> = {
    title: 'Interactive/SearchBar',
    component: SearchBar,
    tags: ['autodocs'],
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        variant: {
            control: 'select',
            options: ['default', 'filled', 'outlined'],
        },
        debounceMs: {
            control: 'number',
        },
    },
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

// Sample suggestions
const sampleSuggestions: SearchSuggestion[] = [
    {
        id: '1',
        label: 'Konferanserom Oslo',
        value: 'Konferanserom Oslo',
        metadata: '5 resultater',
    },
    {
        id: '2',
        label: 'Møterom Bergen',
        value: 'Møterom Bergen',
        metadata: '12 resultater',
    },
    {
        id: '3',
        label: 'Auditorium Trondheim',
        value: 'Auditorium Trondheim',
        metadata: '3 resultater',
    },
    {
        id: '4',
        label: 'Klasserom Stavanger',
        value: 'Klasserom Stavanger',
        metadata: '8 resultater',
    },
];

/**
 * Default SearchBar with basic functionality
 */
export const Default: Story = {
    args: {
        placeholder: 'Søk etter lokaler...',
        onSearch: (value: string) => console.log('Search:', value),
    },
};

/**
 * SearchBar with autocomplete suggestions
 */
export const WithSuggestions: Story = {
    args: {
        placeholder: 'Søk etter lokaler...',
        suggestions: sampleSuggestions,
        onSearch: (value: string) => console.log('Search:', value),
        onSuggestionSelect: (suggestion: SearchSuggestion) => console.log('Selected:', suggestion),
    },
};

/**
 * SearchBar in loading state
 */
export const Loading: Story = {
    args: {
        placeholder: 'Søk etter lokaler...',
        isLoading: true,
        value: 'Konferanserom',
    },
};

/**
 * Small size variant
 */
export const Small: Story = {
    args: {
        size: 'sm',
        placeholder: 'Søk...',
        suggestions: sampleSuggestions,
    },
};

/**
 * Large size variant
 */
export const Large: Story = {
    args: {
        size: 'lg',
        placeholder: 'Søk etter lokaler...',
        suggestions: sampleSuggestions,
    },
};

/**
 * Filled variant
 */
export const Filled: Story = {
    args: {
        variant: 'filled',
        placeholder: 'Søk etter lokaler...',
        suggestions: sampleSuggestions,
    },
};

/**
 * Outlined variant
 */
export const Outlined: Story = {
    args: {
        variant: 'outlined',
        placeholder: 'Søk etter lokaler...',
        suggestions: sampleSuggestions,
    },
};

/**
 * Disabled state
 */
export const Disabled: Story = {
    args: {
        placeholder: 'Søk etter lokaler...',
        disabled: true,
        value: 'Disabled search',
    },
};

/**
 * Without clear button
 */
export const NoClearButton: Story = {
    args: {
        placeholder: 'Søk etter lokaler...',
        clearable: false,
        value: 'Cannot clear this',
    },
};

/**
 * With auto-focus
 */
export const AutoFocus: Story = {
    args: {
        placeholder: 'Søk etter lokaler...',
        autoFocus: true,
        suggestions: sampleSuggestions,
    },
};

/**
 * Custom debounce time
 */
export const CustomDebounce: Story = {
    args: {
        placeholder: 'Søk etter lokaler...',
        debounceMs: 1000,
        onSearch: (value: string) => console.log('Search (1s delay):', value),
    },
    parameters: {
        docs: {
            description: {
                story: 'SearchBar with 1 second debounce delay instead of the default 300ms.',
            },
        },
    },
};
