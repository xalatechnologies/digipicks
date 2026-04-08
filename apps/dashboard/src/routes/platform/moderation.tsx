/**
 * Moderation Page — SaaS Admin
 *
 * Super admin moderation queue for listing approvals.
 * Shows pending listings with approve/reject/request-changes actions.
 */

import { useState, useMemo, useCallback } from 'react';
import {
    Button,
    Paragraph,
    Heading,
    PillTabs,
    EmptyState,
    Spinner,
    Stack,
    Card,
    Textarea,
    DashboardPageHeader,
    PageContentLayout,
    CrudStatGrid,
    CrudListItem,
    ClockIcon,
    CheckIcon,
} from '@digilist-saas/ds';
import type { Action, PillTab } from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useAuth } from '@digilist-saas/app-shell';
import {
    usePendingReviewListings,
    useApproveListing,
    useRejectListing,
    useRequestChanges,
} from '@digilist-saas/sdk';
import styles from './moderation.module.css';

// =============================================================================
// Types
// =============================================================================

type TabFilter = 'all' | 'pending_review';

// =============================================================================
// Component
// =============================================================================

export function ModerationPage() {
    const t = useT();
    const { user } = useAuth();
    const moderatorId = user?.id || '';

    // Data
    const { data: pendingListings, isLoading } = usePendingReviewListings();

    // Actions
    const approveMutation = useApproveListing();
    const rejectMutation = useRejectListing();
    const requestChangesMutation = useRequestChanges();

    // UI state
    const [activeTab, setActiveTab] = useState<TabFilter>('all');
    const [actionDialog, setActionDialog] = useState<{
        type: 'reject' | 'changes';
        listing: any;
    } | null>(null);
    const [noteText, setNoteText] = useState('');

    // Stats
    const stats = useMemo(() => {
        const items = pendingListings || [];
        return {
            pending: items.filter((l) => l.listingStatus === 'pending_review').length,
            total: items.length,
        };
    }, [pendingListings]);

    // Filtered listings by tab
    const filteredListings = useMemo(() => {
        const items = pendingListings || [];
        if (activeTab === 'all') return items;
        return items.filter((l) => l.listingStatus === activeTab);
    }, [pendingListings, activeTab]);

    // Handlers
    const handleApprove = useCallback(async (listing: any) => {
        await approveMutation.mutateAsync({
            resourceId: listing._id,
            tenantId: listing.tenantId,
            moderatorId,
        });
    }, [approveMutation, moderatorId]);

    const handleReject = useCallback(async () => {
        if (!actionDialog || !noteText.trim()) return;
        await rejectMutation.mutateAsync({
            resourceId: actionDialog.listing._id,
            tenantId: actionDialog.listing.tenantId,
            moderatorId,
            note: noteText,
        });
        setActionDialog(null);
        setNoteText('');
    }, [actionDialog, noteText, rejectMutation, moderatorId]);

    const handleRequestChanges = useCallback(async () => {
        if (!actionDialog || !noteText.trim()) return;
        await requestChangesMutation.mutateAsync({
            resourceId: actionDialog.listing._id,
            tenantId: actionDialog.listing.tenantId,
            moderatorId,
            note: noteText,
        });
        setActionDialog(null);
        setNoteText('');
    }, [actionDialog, noteText, requestChangesMutation, moderatorId]);

    const getActions = useCallback((listing: any): Action[] => [
        {
            label: t('moderation.approve', 'Godkjenn'),
            onClick: () => handleApprove(listing),
        },
        {
            label: t('moderation.reject', 'Avslå'),
            onClick: () => {
                setActionDialog({ type: 'reject', listing });
                setNoteText('');
            },
        },
        {
            label: t('moderation.requestChanges', 'Be om endringer'),
            onClick: () => {
                setActionDialog({ type: 'changes', listing });
                setNoteText('');
            },
        },
    ], [t, handleApprove]);

    const getRiskColor = (risk?: string): 'success' | 'warning' | 'danger' | 'neutral' => {
        switch (risk) {
            case 'low': return 'success';
            case 'medium': return 'warning';
            case 'high': return 'danger';
            default: return 'neutral';
        }
    };

    const tabs: PillTab[] = [
        { id: 'all', label: t('common.all', 'Alle'), badge: String(pendingListings?.length ?? 0) },
        { id: 'pending_review', label: t('listings.statusPendingReview', 'Til godkjenning'), badge: String(stats.pending) },
    ];

    if (isLoading) {
        return (
            <PageContentLayout>
                <div className={styles.loadingWrap}>
                    <Spinner aria-label={t('common.loading', 'Laster...')} />
                </div>
            </PageContentLayout>
        );
    }

    return (
        <PageContentLayout>
            <DashboardPageHeader
                title={t('moderation.title', 'Moderering')}
                subtitle={t('moderation.description', 'Gjennomgå og godkjenn annonser før publisering.')}
            />

            <CrudStatGrid
                stats={[
                    {
                        icon: <ClockIcon size={20} />,
                        label: t('moderation.pendingCount', 'Venter på godkjenning'),
                        value: stats.pending,
                        variant: stats.pending > 0 ? 'warning' : 'neutral',
                    },
                    {
                        icon: <CheckIcon size={20} />,
                        label: t('moderation.totalSubmitted', 'Totalt innsendt'),
                        value: stats.total,
                        variant: 'neutral',
                    },
                ]}
            />

            <PillTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as TabFilter)}
            />

            {filteredListings.length === 0 ? (
                <EmptyState
                    title={t('moderation.noListings', 'Ingen annonser å moderere')}
                    description={t('moderation.noListingsDesc', 'Det er ingen annonser som venter på godkjenning.')}
                />
            ) : (
                <Stack direction="vertical" spacing="var(--ds-size-3)">
                    {filteredListings.map((listing) => (
                        <CrudListItem
                            key={listing._id}
                            title={listing.name}
                            subtitle={listing.tenantName ? `Tenant: ${listing.tenantName}` : listing.tenantId}
                            status={{
                                color: getRiskColor(listing.riskLevel as string),
                                label: (listing.riskLevel as string) || 'ukjent',
                            }}
                            tags={[
                                listing.categoryKey ? { label: listing.categoryKey as string } : null,
                                listing.submittedForReviewAt
                                    ? { label: new Date(listing.submittedForReviewAt as number).toLocaleDateString('nb-NO') }
                                    : null,
                            ].filter(Boolean) as Array<{ label: string }>}
                            actions={getActions(listing)}
                        />
                    ))}
                </Stack>
            )}

            {/* Reject / Request Changes Dialog */}
            {actionDialog && (
                <div className={styles.dialogOverlay} onClick={() => setActionDialog(null)}>
                    <Card
                        className={styles.dialogCard}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <Stack direction="vertical" spacing="var(--ds-size-4)">
                            <Heading level={3} data-size="sm">
                                {actionDialog.type === 'reject'
                                    ? t('moderation.rejectTitle', 'Avslå annonse')
                                    : t('moderation.requestChangesTitle', 'Be om endringer')
                                }
                            </Heading>
                            <Paragraph data-size="sm">
                                {actionDialog.listing.name}
                            </Paragraph>
                            <div>
                                <Paragraph data-size="sm" style={{ marginBottom: 'var(--ds-size-1)', fontWeight: 500 }}>
                                    {t('moderation.rejectReason', 'Begrunnelse')}
                                </Paragraph>
                                <Textarea
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    rows={4}
                                    className={styles.noteTextarea}
                                />
                            </div>
                            <Stack direction="horizontal" spacing="var(--ds-size-3)" style={{ justifyContent: 'flex-end' }}>
                                <Button variant="secondary" onClick={() => setActionDialog(null)}>
                                    {t('common.cancel', 'Avbryt')}
                                </Button>
                                <Button
                                    variant="primary"
                                    data-color={actionDialog.type === 'reject' ? 'danger' : undefined}
                                    onClick={actionDialog.type === 'reject' ? handleReject : handleRequestChanges}
                                    disabled={!noteText.trim()}
                                >
                                    {actionDialog.type === 'reject'
                                        ? t('moderation.reject', 'Avslå')
                                        : t('moderation.requestChanges', 'Be om endringer')
                                    }
                                </Button>
                            </Stack>
                        </Stack>
                    </Card>
                </div>
            )}
        </PageContentLayout>
    );
}
