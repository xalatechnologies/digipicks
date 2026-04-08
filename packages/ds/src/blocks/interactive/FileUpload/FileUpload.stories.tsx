import type { Meta, StoryObj } from '@storybook/react';
import { FileUpload } from './FileUpload';
import { ToastProvider } from '../../feedback/Toast';

const meta: Meta<typeof FileUpload> = {
    title: 'Interactive/FileUpload',
    component: FileUpload,
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <ToastProvider>
                <Story />
            </ToastProvider>
        ),
    ],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'compact', 'minimal'],
        },
        maxSize: {
            control: 'number',
        },
        maxFiles: {
            control: 'number',
        },
    },
};

export default meta;
type Story = StoryObj<typeof FileUpload>;

/**
 * Default FileUpload with all features
 */
export const Default: Story = {
    args: {
        onChange: (files: File[]) => console.log('Files changed:', files),
    },
};

/**
 * FileUpload with image-only validation
 */
export const ImagesOnly: Story = {
    args: {
        accept: 'image/*',
        onChange: (files: File[]) => console.log('Images:', files),
    },
};

/**
 * FileUpload with PDF and documents
 */
export const DocumentsOnly: Story = {
    args: {
        accept: '.pdf,.doc,.docx,.txt',
        onChange: (files: File[]) => console.log('Documents:', files),
    },
};

/**
 * FileUpload with size limit (5MB)
 */
export const WithSizeLimit: Story = {
    args: {
        maxSize: 5 * 1024 * 1024, // 5MB
        onChange: (files: File[]) => console.log('Files:', files),
    },
};

/**
 * FileUpload with max files limit
 */
export const MaxFilesLimit: Story = {
    args: {
        maxFiles: 3,
        onChange: (files: File[]) => console.log('Files:', files),
    },
};

/**
 * Single file upload
 */
export const SingleFile: Story = {
    args: {
        multiple: false,
        onChange: (files: File[]) => console.log('File:', files[0]),
    },
};

/**
 * Compact variant
 */
export const Compact: Story = {
    args: {
        variant: 'compact',
        onChange: (files: File[]) => console.log('Files:', files),
    },
};

/**
 * Minimal variant
 */
export const Minimal: Story = {
    args: {
        variant: 'minimal',
        onChange: (files: File[]) => console.log('Files:', files),
    },
};

/**
 * Without previews
 */
export const NoPreviews: Story = {
    args: {
        showPreviews: false,
        onChange: (files: File[]) => console.log('Files:', files),
    },
};

/**
 * Disabled state
 */
export const Disabled: Story = {
    args: {
        disabled: true,
    },
};

/**
 * Complete example with all restrictions
 */
export const CompleteExample: Story = {
    args: {
        accept: 'image/jpeg,image/png,image/webp',
        maxSize: 2 * 1024 * 1024, // 2MB
        maxFiles: 5,
        multiple: true,
        showPreviews: true,
        showProgress: true,
        onChange: (files: File[]) => console.log('Selected files:', files),
    },
    parameters: {
        docs: {
            description: {
                story: 'Complete example with image validation (JPEG, PNG, WebP), 2MB size limit, and max 5 files.',
            },
        },
    },
};
