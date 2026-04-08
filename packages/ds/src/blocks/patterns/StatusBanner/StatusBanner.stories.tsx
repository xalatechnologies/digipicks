import type { Meta, StoryObj } from '@storybook/react';
import { StatusBanner } from './StatusBanner';

const meta: Meta<typeof StatusBanner> = {
    title: 'Patterns/StatusBanner',
    component: StatusBanner,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatusBanner>;

export const Info: Story = {
    args: {
        type: 'info',
        title: 'Informasjon',
        message: 'Dette er en informasjonsmelding.',
    },
};

export const Success: Story = {
    args: {
        type: 'success',
        title: 'Suksess!',
        message: 'Handlingen ble fullført.',
    },
};

export const Warning: Story = {
    args: {
        type: 'warning',
        title: 'Advarsel',
        message: 'Vennligst vær oppmerksom på dette.',
    },
};

export const Error: Story = {
    args: {
        type: 'error',
        title: 'Feil',
        message: 'Noe gikk galt. Vennligst prøv igjen.',
    },
};

export const Dismissible: Story = {
    args: {
        type: 'info',
        title: 'Kan lukkes',
        message: 'Klikk på X for å lukke denne meldingen.',
        dismissible: true,
        onDismiss: () => console.log('Dismissed'),
    },
};

export const WithAction: Story = {
    args: {
        type: 'warning',
        title: 'Handling kreves',
        message: 'Du må bekrefte denne handlingen.',
        action: {
            label: 'Bekreft',
            onClick: () => console.log('Action clicked'),
        },
    },
};

export const WithActionAndDismiss: Story = {
    args: {
        type: 'error',
        title: 'Feil oppstod',
        message: 'En feil oppstod under lasting.',
        dismissible: true,
        onDismiss: () => console.log('Dismissed'),
        action: {
            label: 'Prøv igjen',
            onClick: () => console.log('Retry clicked'),
        },
    },
};

export const TitleOnly: Story = {
    args: {
        type: 'success',
        title: 'Lagret!',
    },
};
