/**
 * Share Types
 *
 * Share functionality types for listing/resource sharing.
 */

// =============================================================================
// Share Types
// =============================================================================

export type ShareMedium = 'native' | 'copy' | 'email' | 'whatsapp' | 'facebook' | 'twitter' | 'linkedin';

export interface ShareData {
    url: string;
    title: string;
    description?: string;
    image?: string;
}

export interface ShareResult {
    success: boolean;
    medium: ShareMedium;
    error?: string;
}

// =============================================================================
// User Interaction State
// =============================================================================

export interface FavoriteState {
    isFavorited: boolean;
    count?: number;
    lastToggled?: string;
}
