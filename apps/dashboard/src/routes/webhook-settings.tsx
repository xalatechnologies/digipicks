/**
 * WebhookSettingsPage — Admin webhook subscription management.
 *
 * Create, test, toggle, and delete outbound webhook subscriptions
 * for CRM / Make integration.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Spinner,
  Stack,
  Field,
  Label,
  Textfield,
  Alert,
  EmptyState,
  DashboardPageHeader,
  PageContentLayout,
  DataTable,
  Badge,
  Switch,
  Checkbox,
  SettingsIcon,
  PlusIcon,
  TrashIcon,
} from '@digipicks/ds';
import type { DataTableColumn } from '@digipicks/ds';
import {
  useWebhookSubscriptions,
  useCreateWebhookSubscription,
  useDeleteWebhookSubscription,
  useToggleWebhookSubscription,
  formatDateTime,
} from '@digipicks/sdk';
import type { WebhookSubscription } from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';
import { useAuthBridge, useSetPageTitle, useTenantContext } from '@digipicks/app-shell';

// =============================================================================
// Constants
// =============================================================================

const EVENT_TOPICS = [
  'ticketing.*',
  'ticketing.ticket.created',
  'ticketing.ticket.cancelled',
  'ticketing.order.completed',
  'ticketing.check_in.scanned',
  'giftcards.giftcard.created',
  'giftcards.giftcard.redeemed',
  'reminders.reminder.scheduled',
  'platform.user.gdpr_purged',
  'integrations.yesplan.imported',
];

// =============================================================================
// Page
// =============================================================================

export function WebhookSettingsPage() {
  const t = useT();
  const { user } = useAuthBridge();
  const { tenantId } = useTenantContext();
  useSetPageTitle(t('webhooks.title', 'Webhook-innstillinger'));

  const { subscriptions, isLoading } = useWebhookSubscriptions(tenantId as any);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['ticketing.*']);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { mutateAsync: createSub } = useCreateWebhookSubscription();
  const { mutateAsync: deleteSub } = useDeleteWebhookSubscription();
  const { mutateAsync: toggleSub } = useToggleWebhookSubscription();

  const handleCreate = useCallback(async () => {
    if (!tenantId || !user?.id || !url) return;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await createSub({
        tenantId: tenantId as any,
        url,
        events: selectedEvents,
        description: description || undefined,
        createdBy: user.id as any,
      });
      setFeedback({
        type: 'success',
        message: `Webhook opprettet. Secret: ${(result as any).secret}`,
      });
      setUrl('');
      setDescription('');
      setShowCreate(false);
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err?.message || 'Kunne ikke opprette webhook' });
    } finally {
      setSaving(false);
    }
  }, [tenantId, user?.id, url, description, selectedEvents, createSub]);

  const handleDelete = useCallback(
    async (subId: string) => {
      if (!tenantId || !user?.id) return;
      try {
        await deleteSub({
          tenantId: tenantId as any,
          subscriptionId: subId as any,
          deletedBy: user.id as any,
        });
        setFeedback({ type: 'success', message: 'Webhook slettet' });
      } catch (err: any) {
        setFeedback({ type: 'danger', message: err?.message || 'Kunne ikke slette webhook' });
      }
    },
    [tenantId, user?.id, deleteSub],
  );

  const handleToggle = useCallback(
    async (subId: string, isActive: boolean) => {
      if (!tenantId || !user?.id) return;
      try {
        await toggleSub({
          tenantId: tenantId as any,
          subscriptionId: subId as any,
          isActive: !isActive,
          updatedBy: user.id as any,
        });
      } catch (err: any) {
        setFeedback({ type: 'danger', message: err?.message || 'Kunne ikke endre status' });
      }
    },
    [tenantId, user?.id, toggleSub],
  );

  const toggleEvent = useCallback((topic: string) => {
    setSelectedEvents((prev) => (prev.includes(topic) ? prev.filter((e) => e !== topic) : [...prev, topic]));
  }, []);

  // Table columns
  const columns: DataTableColumn<WebhookSubscription>[] = useMemo(
    () => [
      {
        id: 'url',
        header: 'URL',
        accessorKey: 'url',
        cell: (row: WebhookSubscription) => (
          <Paragraph
            data-size="xs"
            style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {row.url}
          </Paragraph>
        ),
      },
      {
        id: 'events',
        header: 'Events',
        cell: (row: WebhookSubscription) => row.events.join(', '),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row: WebhookSubscription) => (
          <Badge data-color={row.isActive ? 'success' : 'neutral'} data-size="sm">
            {row.isActive ? 'Aktiv' : 'Inaktiv'}
          </Badge>
        ),
      },
      {
        id: 'failures',
        header: 'Feil',
        cell: (row: WebhookSubscription) => (
          <Badge data-color={row.failureCount > 0 ? 'danger' : 'neutral'} data-size="sm">
            {row.failureCount}
          </Badge>
        ),
      },
      {
        id: 'lastDelivery',
        header: 'Siste levering',
        cell: (row: WebhookSubscription) => (row.lastDeliveredAt ? formatDateTime(row.lastDeliveredAt) : '—'),
      },
      {
        id: 'actions',
        header: '',
        cell: (row: WebhookSubscription) => (
          <Stack direction="horizontal" spacing="var(--ds-size-1)">
            <Switch
              checked={row.isActive}
              onChange={() => handleToggle(row._id, row.isActive)}
              aria-label="Aktiver/deaktiver"
            />
            <Button
              type="button"
              variant="tertiary"
              data-size="sm"
              data-color="danger"
              onClick={() => handleDelete(row._id)}
            >
              <TrashIcon />
            </Button>
          </Stack>
        ),
      },
    ],
    [handleToggle, handleDelete],
  );

  return (
    <PageContentLayout>
      <DashboardPageHeader
        subtitle={t('webhooks.subtitle', 'Administrer utgaaende webhooks for CRM-integrasjon (Make, Zapier)')}
        actions={
          <Button type="button" variant="primary" data-size="sm" onClick={() => setShowCreate(!showCreate)}>
            <PlusIcon />
            {showCreate ? 'Avbryt' : 'Ny webhook'}
          </Button>
        }
      />

      <Stack direction="vertical" spacing="var(--ds-size-5)">
        {/* Feedback */}
        {feedback && <Alert data-color={feedback.type}>{feedback.message}</Alert>}

        {/* Create form */}
        {showCreate && (
          <Card>
            <Stack direction="vertical" spacing="var(--ds-size-4)">
              <Heading level={2} data-size="xs">
                Ny webhook
              </Heading>

              <Field>
                <Label>Endpoint URL</Label>
                <Textfield
                  aria-label="Endpoint URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://hook.eu1.make.com/abc123"
                />
              </Field>

              <Field>
                <Label>Beskrivelse (valgfritt)</Label>
                <Textfield
                  aria-label="Beskrivelse"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Make — synkroniser billettdata til CRM"
                />
              </Field>

              <div>
                <Label>Events</Label>
                <Paragraph data-size="xs" style={{ marginBottom: 'var(--ds-size-2)' }}>
                  Velg hvilke hendelser som skal sendes til denne endpointen.
                </Paragraph>
                <Stack direction="vertical" spacing="var(--ds-size-1)">
                  {EVENT_TOPICS.map((topic) => (
                    <Checkbox
                      key={topic}
                      checked={selectedEvents.includes(topic)}
                      onChange={() => toggleEvent(topic)}
                      data-size="sm"
                      aria-label={topic}
                    >
                      <code style={{ fontSize: '0.85em' }}>{topic}</code>
                    </Checkbox>
                  ))}
                </Stack>
              </div>

              <Stack direction="horizontal" justify="end">
                <Button type="button" variant="primary" onClick={handleCreate} disabled={!url || saving}>
                  {saving ? <Spinner aria-label="Oppretter..." data-size="sm" /> : 'Opprett webhook'}
                </Button>
              </Stack>
            </Stack>
          </Card>
        )}

        {/* Subscriptions table */}
        {isLoading ? (
          <Stack direction="horizontal" justify="center">
            <Spinner aria-label="Laster webhooks..." data-size="md" />
          </Stack>
        ) : subscriptions.length === 0 && !showCreate ? (
          <EmptyState
            icon={<SettingsIcon />}
            title="Ingen webhooks konfigurert"
            description="Legg til en webhook for aa sende hendelser til CRM-systemet ditt."
          />
        ) : subscriptions.length > 0 ? (
          <Card>
            <DataTable
              columns={columns as any}
              data={subscriptions}
              getRowKey={(row: WebhookSubscription) => row._id}
            />
          </Card>
        ) : null}
      </Stack>
    </PageContentLayout>
  );
}
