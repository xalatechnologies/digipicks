/**
 * Creator Applications Page — Admin Review Queue
 *
 * Lists pending creator applications with approve/reject/request-info actions.
 * Admin-only route in the dashboard app.
 */

import { useState, useMemo, useCallback } from 'react';
import {
    Button,
    Heading,
    Paragraph,
    Card,
    Textarea,
    Spinner,
    Stack,
    Tag,
    EmptyState,
    PillTabs,
    DashboardPageHeader,
    PageContentLayout,
    CrudStatGrid,
    CrudListItem,
    ClockIcon,
    CheckIcon,
} from '@digilist-saas/ds';
import type { Action, PillTab } from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useAuth, env, VerificationBadge } from '@digilist-saas/app-shell';
import {
    useCreatorApplications,
    useCreatorApplication,
    useApproveCreatorApplication,
    useRejectCreatorApplication,
    useRequestMoreInfoCreatorApplication,
} from '@digilist-saas/sdk';
import type { Id, CreatorApplication, ApplicationStatus } from '@digilist-saas/sdk';
import styles from './creator-applications.module.css';

// =============================================================================
// Types
// =============================================================================

type TabFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'more_info_requested';

// =============================================================================
// Status helpers
// =============================================================================

function getStatusColor(status: ApplicationStatus): 'warning' | 'success' | 'danger' | 'info' | 'neutral' {
    switch (status) {
        case 'pending': return 'warning';
        case 'approved': return 'success';
        case 'rejected': return 'danger';
        case 'more_info_requested': return 'info';
        default: return 'neutral';
    }
}

function getStatusLabel(status: ApplicationStatus, t: (key: string, fallback: string) => string): string {
    switch (status) {
        case 'pending': return t('creatorApps.status.pending', 'Pending');
        case 'approved': return t('creatorApps.status.approved', 'Approved');
        case 'rejected': return t('creatorApps.status.rejected', 'Rejected');
        case 'more_info_requested': return t('creatorApps.status.moreInfo', 'More info requested');
        default: return status;
    }
}

// =============================================================================
// Application Detail Dialog
// =============================================================================

function ApplicationDetail({
    applicationId,
    onClose,
    t,
}: {
    applicationId: string;
    onClose: () => void;
    t: (key: string, fallback: string) => string;
}) {
    const { application, isLoading } = useCreatorApplication(applicationId);

    if (isLoading || !application) {
        return (
            <div className={styles.loadingWrap}>
                <Spinner aria-label={t('common.loading', 'Loading...')} />
            </div>
        );
    }

    return (
        <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Heading level={3} data-size="sm">
                {application.displayName}
                <VerificationBadge
                    verified={application.status === 'approved'}
                    verifiedAt={application.reviewedAt}
                    size="md"
                />
            </Heading>

            {application.user && (
                <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                    {application.user.email}
                </Paragraph>
            )}

            <Tag data-color={getStatusColor(application.status)} data-size="sm">
                {getStatusLabel(application.status, t)}
            </Tag>

            <div className={styles.detailGrid}>
                <Paragraph data-size="sm" className={styles.detailLabel}>
                    {t('creatorApps.detail.niche', 'Niche')}
                </Paragraph>
                <Paragraph data-size="sm">{application.niche}</Paragraph>

                <Paragraph data-size="sm" className={styles.detailLabel}>
                    {t('creatorApps.detail.bio', 'Bio')}
                </Paragraph>
                <Paragraph data-size="sm">{application.bio}</Paragraph>

                {application.specialties && application.specialties.length > 0 && (
                    <>
                        <Paragraph data-size="sm" className={styles.detailLabel}>
                            {t('creatorApps.detail.specialties', 'Specialties')}
                        </Paragraph>
                        <Paragraph data-size="sm">{application.specialties.join(', ')}</Paragraph>
                    </>
                )}

                {application.performanceProof && (
                    <>
                        <Paragraph data-size="sm" className={styles.detailLabel}>
                            {t('creatorApps.detail.performance', 'Performance proof')}
                        </Paragraph>
                        <Paragraph data-size="sm">{application.performanceProof}</Paragraph>
                    </>
                )}

                {application.trackRecordUrl && (
                    <>
                        <Paragraph data-size="sm" className={styles.detailLabel}>
                            {t('creatorApps.detail.trackRecord', 'Track record URL')}
                        </Paragraph>
                        <Paragraph data-size="sm">{application.trackRecordUrl}</Paragraph>
                    </>
                )}

                <Paragraph data-size="sm" className={styles.detailLabel}>
                    {t('creatorApps.detail.submitted', 'Submitted')}
                </Paragraph>
                <Paragraph data-size="sm">
                    {new Date(application.submittedAt).toLocaleDateString()}
                </Paragraph>

                {application.resubmittedAt && (
                    <>
                        <Paragraph data-size="sm" className={styles.detailLabel}>
                            {t('creatorApps.detail.resubmitted', 'Resubmitted')}
                        </Paragraph>
                        <Paragraph data-size="sm">
                            {new Date(application.resubmittedAt).toLocaleDateString()}
                        </Paragraph>
                    </>
                )}
            </div>

            {application.socialLinks && Object.keys(application.socialLinks).length > 0 && (
                <>
                    <Paragraph data-size="sm" className={styles.detailLabel}>
                        {t('creatorApps.detail.social', 'Social links')}
                    </Paragraph>
                    <div className={styles.socialLinksList}>
                        {Object.entries(application.socialLinks)
                            .filter(([, val]) => val)
                            .map(([platform, handle]) => (
                                <Tag key={platform} data-size="sm">
                                    {platform}: {handle}
                                </Tag>
                            ))}
                    </div>
                </>
            )}

            {application.reviewNote && (
                <>
                    <Paragraph data-size="sm" className={styles.detailLabel}>
                        {t('creatorApps.detail.reviewNote', 'Review note')}
                    </Paragraph>
                    <Paragraph data-size="sm">{application.reviewNote}</Paragraph>
                </>
            )}

            <Button variant="secondary" onClick={onClose}>
                {t('common.close', 'Close')}
            </Button>
        </Stack>
    );
}

// =============================================================================
// Main Component
// =============================================================================

export function CreatorApplicationsPage() {
    const t = useT();
    const { user } = useAuth();
    const tenantId = env.tenantId as string | undefined;

    // Data
    const { applications, isLoading } = useCreatorApplications(
        tenantId as Id<"tenants"> | undefined
    );

    // Mutations
    const approveMutation = useApproveCreatorApplication();
    const rejectMutation = useRejectCreatorApplication();
    const requestInfoMutation = useRequestMoreInfoCreatorApplication();

    // UI state
    const [activeTab, setActiveTab] = useState<TabFilter>('all');
    const [actionDialog, setActionDialog] = useState<{
        type: 'reject' | 'moreInfo';
        application: CreatorApplication;
    } | null>(null);
    const [detailId, setDetailId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');

    // Stats
    const stats = useMemo(() => {
        const items = applications || [];
        return {
            pending: items.filter((a) => a.status === 'pending').length,
            approved: items.filter((a) => a.status === 'approved').length,
            total: items.length,
        };
    }, [applications]);

    // Filtered
    const filtered = useMemo(() => {
        const items = applications || [];
        if (activeTab === 'all') return items;
        return items.filter((a) => a.status === activeTab);
    }, [applications, activeTab]);

    // Handlers
    const handleApprove = useCallback(async (app: CreatorApplication) => {
        if (!tenantId || !user?.id) return;
        await approveMutation.mutateAsync({
            tenantId: tenantId as Id<"tenants">,
            id: app.id,
            reviewedBy: user.id as Id<"users">,
        });
    }, [approveMutation, tenantId, user?.id]);

    const handleRejectOrInfo = useCallback(async () => {
        if (!actionDialog || !noteText.trim() || !tenantId || !user?.id) return;

        if (actionDialog.type === 'reject') {
            await rejectMutation.mutateAsync({
                tenantId: tenantId as Id<"tenants">,
                id: actionDialog.application.id,
                reviewedBy: user.id as Id<"users">,
                reviewNote: noteText.trim(),
            });
        } else {
            await requestInfoMutation.mutateAsync({
                tenantId: tenantId as Id<"tenants">,
                id: actionDialog.application.id,
                reviewedBy: user.id as Id<"users">,
                reviewNote: noteText.trim(),
            });
        }

        setActionDialog(null);
        setNoteText('');
    }, [actionDialog, noteText, tenantId, user?.id, rejectMutation, requestInfoMutation]);

    const getActions = useCallback((app: CreatorApplication): Action[] => {
        const actions: Action[] = [];
        if (app.status === 'pending' || app.status === 'more_info_requested') {
            actions.push({
                label: t('creatorApps.approve', 'Approve'),
                onClick: () => handleApprove(app),
            });
            actions.push({
                label: t('creatorApps.reject', 'Reject'),
                onClick: () => {
                    setActionDialog({ type: 'reject', application: app });
                    setNoteText('');
                },
            });
        }
        if (app.status === 'pending') {
            actions.push({
                label: t('creatorApps.requestInfo', 'Request info'),
                onClick: () => {
                    setActionDialog({ type: 'moreInfo', application: app });
                    setNoteText('');
                },
            });
        }
        return actions;
    }, [t, handleApprove]);

    const tabs: PillTab[] = [
        { id: 'all', label: t('common.all', 'All'), badge: String(applications?.length ?? 0) },
        { id: 'pending', label: t('creatorApps.status.pending', 'Pending'), badge: String(stats.pending) },
        { id: 'approved', label: t('creatorApps.status.approved', 'Approved'), badge: String(stats.approved) },
    ];

    if (isLoading) {
        return (
            <PageContentLayout>
                <div className={styles.loadingWrap}>
                    <Spinner aria-label={t('common.loading', 'Loading...')} />
                </div>
            </PageContentLayout>
        );
    }

    return (
        <PageContentLayout>
            <DashboardPageHeader
                title={t('creatorApps.title', 'Creator Applications')}
                subtitle={t('creatorApps.subtitle', 'Review and manage creator applications.')}
            />

            <CrudStatGrid
                stats={[
                    {
                        icon: <ClockIcon size={20} />,
                        label: t('creatorApps.statPending', 'Pending review'),
                        value: stats.pending,
                        variant: stats.pending > 0 ? 'warning' : 'neutral',
                    },
                    {
                        icon: <CheckIcon size={20} />,
                        label: t('creatorApps.statApproved', 'Approved creators'),
                        value: stats.approved,
                        variant: 'success',
                    },
                ]}
            />

            <PillTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as TabFilter)}
            />

            {filtered.length === 0 ? (
                <EmptyState
                    title={t('creatorApps.empty', 'No applications')}
                    description={t('creatorApps.emptyDescription', 'There are no creator applications matching this filter.')}
                />
            ) : (
                <Stack direction="vertical" spacing="var(--ds-size-3)">
                    {filtered.map((app) => (
                        <CrudListItem
                            key={app.id}
                            title={app.displayName}
                            subtitle={app.user?.email || app.userId}
                            status={{
                                color: getStatusColor(app.status),
                                label: getStatusLabel(app.status, t),
                            }}
                            tags={[
                                { label: app.niche },
                                ...(app.specialties?.map((s) => ({ label: s })) ?? []),
                                ...(app.status === 'approved' ? [{ label: t('creatorApps.verified', 'Verified'), color: 'success' }] : []),
                            ]}
                            onClick={() => setDetailId(app.id)}
                            actions={getActions(app)}
                        />
                    ))}
                </Stack>
            )}

            {/* Application Detail Dialog */}
            {detailId && (
                <div className={styles.dialogOverlay} onClick={() => setDetailId(null)}>
                    <Card
                        className={styles.dialogCard}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <ApplicationDetail
                            applicationId={detailId}
                            onClose={() => setDetailId(null)}
                            t={t}
                        />
                    </Card>
                </div>
            )}

            {/* Reject / Request Info Dialog */}
            {actionDialog && (
                <div className={styles.dialogOverlay} onClick={() => setActionDialog(null)}>
                    <Card
                        className={styles.dialogCard}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                        <Stack direction="vertical" spacing="var(--ds-size-4)">
                            <Heading level={3} data-size="sm">
                                {actionDialog.type === 'reject'
                                    ? t('creatorApps.rejectTitle', 'Reject application')
                                    : t('creatorApps.requestInfoTitle', 'Request more information')
                                }
                            </Heading>
                            <Paragraph data-size="sm">
                                {actionDialog.application.displayName}
                            </Paragraph>
                            <div>
                                <Paragraph data-size="sm" style={{ marginBottom: 'var(--ds-size-1)', fontWeight: 500 }}>
                                    {t('creatorApps.noteLabel', 'Note to applicant')}
                                </Paragraph>
                                <Textarea
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    rows={4}
                                    className={styles.noteTextarea}
                                    placeholder={
                                        actionDialog.type === 'reject'
                                            ? t('creatorApps.rejectPlaceholder', 'Explain why the application was rejected...')
                                            : t('creatorApps.infoPlaceholder', 'What additional information do you need?')
                                    }
                                />
                            </div>
                            <Stack direction="horizontal" spacing="var(--ds-size-3)" style={{ justifyContent: 'flex-end' }}>
                                <Button variant="secondary" onClick={() => setActionDialog(null)}>
                                    {t('common.cancel', 'Cancel')}
                                </Button>
                                <Button
                                    variant="primary"
                                    data-color={actionDialog.type === 'reject' ? 'danger' : undefined}
                                    onClick={handleRejectOrInfo}
                                    disabled={!noteText.trim()}
                                >
                                    {actionDialog.type === 'reject'
                                        ? t('creatorApps.reject', 'Reject')
                                        : t('creatorApps.requestInfo', 'Request info')
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
