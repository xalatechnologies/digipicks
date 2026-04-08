/**
 * Billing Display Types
 *
 * Types for invoice/billing UI display.
 */

/** Invoice lifecycle status */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

/** Invoice row for table/card display */
export interface InvoiceRow {
    id: string;
    reference: string;
    createdAt: string;
    amount: number;
    currency: string;
    status: string;
    description?: string;
}
