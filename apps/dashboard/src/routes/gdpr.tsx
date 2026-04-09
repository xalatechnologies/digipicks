/**
 * GDPRPage — Admin GDPR data management.
 *
 * User data export (Article 20) and purge (Article 17).
 * Tenant-wide purge for contract termination (super_admin only).
 */

import { useState, useCallback } from 'react';
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
  DashboardPageHeader,
  PageContentLayout,
  ShieldIcon,
  DownloadIcon,
  TrashIcon,
} from '@digipicks/ds';
import { useExportUserData, usePurgeUserData, usePurgeTenantData } from '@digipicks/sdk';
import type { Id } from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';
import { useAuthBridge, useSetPageTitle, useTenantContext } from '@digipicks/app-shell';

// =============================================================================
// Page
// =============================================================================

export function GDPRPage() {
  const t = useT();
  const { user } = useAuthBridge();
  const { tenantId } = useTenantContext();
  useSetPageTitle(t('gdpr.title', 'GDPR / Personvern'));

  // Export state
  const [exportUserId, setExportUserId] = useState('');
  const { data: exportData, isLoading: exportLoading } = useExportUserData(
    tenantId as any,
    exportUserId ? (exportUserId as Id<'users'>) : undefined,
  );

  // Purge state
  const [purgeUserId, setPurgeUserId] = useState('');
  const [purgeReason, setPurgeReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Tenant purge state
  const [confirmCode, setConfirmCode] = useState('');
  const [showTenantPurge, setShowTenantPurge] = useState(false);

  const { mutateAsync: purgeUser } = usePurgeUserData();
  const { mutateAsync: purgeTenant } = usePurgeTenantData();

  const isSuperAdmin = user?.role === 'admin';

  // Download export as JSON
  const handleDownloadExport = useCallback(() => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gdpr-export-${exportUserId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportData, exportUserId]);

  const handlePurgeUser = useCallback(async () => {
    if (!tenantId || !user?.id || !purgeUserId) return;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await purgeUser({
        tenantId: tenantId as any,
        userId: purgeUserId as any,
        requestedBy: user.id as any,
        reason: purgeReason || undefined,
      });
      setFeedback({
        type: 'success',
        message: `Brukerdata anonymisert. Felt: ${(result as any).anonymizedFields?.join(', ')}`,
      });
      setPurgeUserId('');
      setPurgeReason('');
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err?.message || 'Kunne ikke slette brukerdata' });
    } finally {
      setSaving(false);
    }
  }, [tenantId, user?.id, purgeUserId, purgeReason, purgeUser]);

  const handlePurgeTenant = useCallback(async () => {
    if (!tenantId || !user?.id || !confirmCode) return;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await purgeTenant({
        tenantId: tenantId as any,
        requestedBy: user.id as any,
        confirmationCode: confirmCode,
      });
      setFeedback({
        type: 'success',
        message: `Tenant slettet. ${(result as any).purgedUserCount} brukere anonymisert.`,
      });
      setShowTenantPurge(false);
      setConfirmCode('');
    } catch (err: any) {
      setFeedback({ type: 'danger', message: err?.message || 'Kunne ikke slette tenant' });
    } finally {
      setSaving(false);
    }
  }, [tenantId, user?.id, confirmCode, purgeTenant]);

  return (
    <PageContentLayout>
      <DashboardPageHeader subtitle={t('gdpr.subtitle', 'Datautlevering og sletting i henhold til GDPR')} />

      <Stack direction="vertical" spacing="var(--ds-size-5)">
        {/* Feedback */}
        {feedback && <Alert data-color={feedback.type}>{feedback.message}</Alert>}

        {/* Data Export — Article 20 */}
        <Card>
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
              <DownloadIcon />
              <Heading level={2} data-size="xs">
                Datautlevering (Artikkel 20)
              </Heading>
            </Stack>

            <Paragraph data-size="sm">Eksporter alle personopplysninger for en bruker som JSON-fil.</Paragraph>

            <Field>
              <Label>Bruker-ID</Label>
              <Textfield
                aria-label="Bruker-ID for eksport"
                value={exportUserId}
                onChange={(e) => setExportUserId(e.target.value)}
                placeholder="Lim inn bruker-ID"
              />
            </Field>

            {exportLoading && (
              <Stack direction="horizontal" justify="center">
                <Spinner aria-label="Henter data..." data-size="md" />
              </Stack>
            )}

            {exportData && (
              <Stack direction="vertical" spacing="var(--ds-size-3)">
                <Alert data-color="info">Data funnet: {(exportData as any)?.user?.email || 'Ukjent bruker'}</Alert>
                <Button type="button" variant="secondary" onClick={handleDownloadExport}>
                  <DownloadIcon />
                  Last ned JSON
                </Button>
              </Stack>
            )}
          </Stack>
        </Card>

        {/* Data Purge — Article 17 */}
        <Card>
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
              <TrashIcon />
              <Heading level={2} data-size="xs">
                Sletting av brukerdata (Artikkel 17)
              </Heading>
            </Stack>

            <Alert data-color="warning">
              Denne handlingen anonymiserer brukerens personopplysninger. Ordrehistorikk og finansielle data beholdes av
              lovmessige aarsaker.
            </Alert>

            <Field>
              <Label>Bruker-ID</Label>
              <Textfield
                aria-label="Bruker-ID for sletting"
                value={purgeUserId}
                onChange={(e) => setPurgeUserId(e.target.value)}
                placeholder="Lim inn bruker-ID"
              />
            </Field>

            <Field>
              <Label>Begrunnelse (valgfritt)</Label>
              <Textfield
                aria-label="Begrunnelse for sletting"
                value={purgeReason}
                onChange={(e) => setPurgeReason(e.target.value)}
                placeholder="F.eks. Bruker har bedt om sletting"
              />
            </Field>

            <Stack direction="horizontal" justify="end">
              <Button
                type="button"
                variant="primary"
                data-color="danger"
                onClick={handlePurgeUser}
                disabled={!purgeUserId || saving}
              >
                {saving ? <Spinner aria-label="Sletter..." data-size="sm" /> : 'Slett brukerdata'}
              </Button>
            </Stack>
          </Stack>
        </Card>

        {/* Tenant Purge — Contract Termination */}
        {isSuperAdmin && (
          <Card>
            <Stack direction="vertical" spacing="var(--ds-size-4)">
              <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
                <ShieldIcon />
                <Heading level={2} data-size="xs">
                  Sletting av hele tenant (Kontraktsopphør)
                </Heading>
              </Stack>

              <Alert data-color="danger">
                ADVARSEL: Denne handlingen sletter all data for denne tenanten, inkludert alle brukere. Denne handlingen
                kan ikke angres.
              </Alert>

              {!showTenantPurge ? (
                <Button type="button" variant="secondary" data-color="danger" onClick={() => setShowTenantPurge(true)}>
                  Vis slettingsverktøy
                </Button>
              ) : (
                <Stack direction="vertical" spacing="var(--ds-size-3)">
                  <Field>
                    <Label>Bekreftelseskode</Label>
                    <Textfield
                      aria-label="Bekreftelseskode"
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value)}
                      placeholder="DELETE-XXXXXX"
                    />
                    <Paragraph data-size="xs">Kontakt systemadmin for bekreftelseskoden.</Paragraph>
                  </Field>

                  <Stack direction="horizontal" justify="end" spacing="var(--ds-size-3)">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowTenantPurge(false);
                        setConfirmCode('');
                      }}
                    >
                      Avbryt
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      data-color="danger"
                      onClick={handlePurgeTenant}
                      disabled={!confirmCode || saving}
                    >
                      {saving ? <Spinner aria-label="Sletter..." data-size="sm" /> : 'Slett tenant'}
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Card>
        )}
      </Stack>
    </PageContentLayout>
  );
}
