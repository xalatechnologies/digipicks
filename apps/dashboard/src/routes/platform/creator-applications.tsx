/**
 * Creator Applications Review Page — Platform Admin
 *
 * Admin queue for reviewing creator onboarding applications.
 * Filter by status, see counts, drill into a single application,
 * and approve / reject / request more info.
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
} from '@digipicks/ds';
import type { Action, PillTab } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useAuth } from '@digipicks/app-shell';
import {
  useCreatorApplicationQueue,
  useCreatorApplicationCounts,
  useReviewCreatorApplication,
  type CreatorApplication,
  type CreatorApplicationStatus,
} from '@digipicks/sdk';
import styles from './creator-applications.module.css';

type TabFilter = 'submitted' | 'in_review' | 'needs_more_info' | 'approved' | 'rejected';

const STATUS_TONE: Record<CreatorApplicationStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  draft: 'neutral',
  submitted: 'neutral',
  in_review: 'warning',
  needs_more_info: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export function CreatorApplicationsReviewPage() {
  const t = useT();
  const { user, tenantId } = useAuth();
  const adminId = (user?.id ?? '') as any;
  const tenant = (tenantId ?? '') as any;

  const [activeTab, setActiveTab] = useState<TabFilter>('submitted');
  const [selected, setSelected] = useState<CreatorApplication | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject' | 'needs_more_info' | 'in_review';
    app: CreatorApplication;
  } | null>(null);
  const [noteText, setNoteText] = useState('');

  const counts = useCreatorApplicationCounts(tenant, adminId);
  const apps = useCreatorApplicationQueue(tenant, adminId, activeTab);

  const reviewMutation = useReviewCreatorApplication();

  const handleAct = useCallback(
    async (app: CreatorApplication, status: 'approve' | 'reject' | 'needs_more_info' | 'in_review') => {
      const apiStatus = status === 'approve' ? 'approved' : status;
      if ((apiStatus === 'rejected' || apiStatus === 'needs_more_info') && !noteText.trim()) {
        setActionDialog({ type: status, app });
        return;
      }
      await reviewMutation({
        tenantId: tenant,
        reviewerUserId: adminId,
        id: app._id,
        status: apiStatus as any,
        reviewNote: noteText.trim() || undefined,
      });
      setActionDialog(null);
      setNoteText('');
      setSelected(null);
    },
    [noteText, reviewMutation, tenant, adminId],
  );

  const handleConfirmDialog = useCallback(async () => {
    if (!actionDialog) return;
    const apiStatus = actionDialog.type === 'approve' ? 'approved' : actionDialog.type;
    await reviewMutation({
      tenantId: tenant,
      reviewerUserId: adminId,
      id: actionDialog.app._id,
      status: apiStatus as any,
      reviewNote: noteText.trim() || undefined,
    });
    setActionDialog(null);
    setNoteText('');
    setSelected(null);
  }, [actionDialog, noteText, reviewMutation, tenant, adminId]);

  const getActions = useCallback(
    (app: CreatorApplication): Action[] => {
      const acts: Action[] = [];
      if (app.status === 'submitted') {
        acts.push({ label: 'Start review', onClick: () => handleAct(app, 'in_review') });
      }
      if (app.status === 'submitted' || app.status === 'in_review') {
        acts.push({ label: 'Approve', onClick: () => handleAct(app, 'approve') });
        acts.push({
          label: 'Reject',
          onClick: () => {
            setActionDialog({ type: 'reject', app });
            setNoteText('');
          },
        });
        acts.push({
          label: 'Request more info',
          onClick: () => {
            setActionDialog({ type: 'needs_more_info', app });
            setNoteText('');
          },
        });
      }
      acts.push({ label: 'View details', onClick: () => setSelected(app) });
      return acts;
    },
    [handleAct],
  );

  const tabs: PillTab[] = [
    { id: 'submitted', label: 'Submitted', badge: String(counts?.submitted ?? 0) },
    { id: 'in_review', label: 'In review', badge: String(counts?.in_review ?? 0) },
    { id: 'needs_more_info', label: 'Needs info', badge: String(counts?.needs_more_info ?? 0) },
    { id: 'approved', label: 'Approved', badge: String(counts?.approved ?? 0) },
    { id: 'rejected', label: 'Rejected', badge: String(counts?.rejected ?? 0) },
  ];

  if (!tenant || !adminId) {
    return (
      <PageContentLayout>
        <EmptyState title="Sign in required" description="You must be signed in as an admin." />
      </PageContentLayout>
    );
  }

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title="Creator applications"
        subtitle="Review prospective creators applying to join the DigiPicks marketplace."
      />

      <CrudStatGrid
        stats={[
          {
            icon: <ClockIcon size={20} />,
            label: 'Awaiting first review',
            value: counts?.submitted ?? 0,
            variant: (counts?.submitted ?? 0) > 0 ? 'warning' : 'neutral',
          },
          {
            icon: <ClockIcon size={20} />,
            label: 'In review',
            value: counts?.in_review ?? 0,
            variant: 'neutral',
          },
          {
            icon: <CheckIcon size={20} />,
            label: 'Approved',
            value: counts?.approved ?? 0,
            variant: 'neutral',
          },
        ]}
      />

      <PillTabs tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as TabFilter)} />

      {!apps ? (
        <div className={styles.loadingWrap}>
          <Spinner aria-label="Loading" />
        </div>
      ) : apps.length === 0 ? (
        <EmptyState title="Nothing to review" description="No applications match this filter." />
      ) : (
        <Stack direction="vertical" spacing="var(--ds-size-3)">
          {apps.map((app) => (
            <CrudListItem
              key={app._id}
              title={app.displayName || app.fullName}
              subtitle={`@${app.handle} · ${app.applicant?.email ?? app.applicantUserId}`}
              status={{
                color: STATUS_TONE[app.status],
                label: app.status.replace(/_/g, ' '),
              }}
              tags={
                [
                  ...(app.primarySports ?? []).slice(0, 3).map((s) => ({ label: s })),
                  app.submittedAt ? { label: new Date(app.submittedAt).toLocaleDateString() } : null,
                ].filter(Boolean) as Array<{ label: string }>
              }
              actions={getActions(app)}
            />
          ))}
        </Stack>
      )}

      {/* Detail panel */}
      {selected && (
        <div className={styles.dialogOverlay} onClick={() => setSelected(null)}>
          <Card className={styles.dialogCard} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <Stack direction="vertical" spacing="var(--ds-size-4)">
              <Heading level={3} data-size="sm">
                {selected.displayName || selected.fullName}
              </Heading>
              <div className={styles.detailGrid}>
                <Paragraph data-size="sm">Handle</Paragraph>
                <Paragraph data-size="sm">@{selected.handle}</Paragraph>
                <Paragraph data-size="sm">Email</Paragraph>
                <Paragraph data-size="sm">{selected.applicant?.email ?? '—'}</Paragraph>
                <Paragraph data-size="sm">Country</Paragraph>
                <Paragraph data-size="sm">{selected.country}</Paragraph>
                <Paragraph data-size="sm">Sports</Paragraph>
                <Paragraph data-size="sm">{selected.primarySports.join(', ') || '—'}</Paragraph>
                <Paragraph data-size="sm">Niche</Paragraph>
                <Paragraph data-size="sm">{selected.nicheTags.join(', ') || '—'}</Paragraph>
                <Paragraph data-size="sm">Bio</Paragraph>
                <Paragraph data-size="sm">{selected.bio}</Paragraph>
                <Paragraph data-size="sm">Links</Paragraph>
                <div>
                  {selected.externalLinks.map((l, i) => (
                    <div key={i}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer">
                        {l.label || l.url}
                      </a>
                    </div>
                  ))}
                </div>
                {selected.sampleNotes && (
                  <>
                    <Paragraph data-size="sm">Sample notes</Paragraph>
                    <Paragraph data-size="sm">{selected.sampleNotes}</Paragraph>
                  </>
                )}
                {selected.reviewNote && (
                  <>
                    <Paragraph data-size="sm">Last review note</Paragraph>
                    <Paragraph data-size="sm">{selected.reviewNote}</Paragraph>
                  </>
                )}
              </div>
              <Stack direction="horizontal" spacing="var(--ds-size-3)" style={{ justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => setSelected(null)}>
                  Close
                </Button>
                {(selected.status === 'submitted' || selected.status === 'in_review') && (
                  <Button variant="primary" onClick={() => handleAct(selected, 'approve')}>
                    Approve
                  </Button>
                )}
              </Stack>
            </Stack>
          </Card>
        </div>
      )}

      {/* Reject / Needs-info dialog */}
      {actionDialog && (
        <div className={styles.dialogOverlay} onClick={() => setActionDialog(null)}>
          <Card className={styles.dialogCard} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <Stack direction="vertical" spacing="var(--ds-size-4)">
              <Heading level={3} data-size="sm">
                {actionDialog.type === 'reject' ? 'Reject application' : 'Request more information'}
              </Heading>
              <Paragraph data-size="sm">{actionDialog.app.displayName || actionDialog.app.fullName}</Paragraph>
              <div>
                <Paragraph data-size="sm" style={{ marginBottom: 'var(--ds-size-1)', fontWeight: 500 }}>
                  Note (required)
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
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  data-color={actionDialog.type === 'reject' ? 'danger' : undefined}
                  onClick={handleConfirmDialog}
                  disabled={!noteText.trim()}
                >
                  {actionDialog.type === 'reject' ? 'Reject' : 'Request info'}
                </Button>
              </Stack>
            </Stack>
          </Card>
        </div>
      )}
    </PageContentLayout>
  );
}

export default CreatorApplicationsReviewPage;
