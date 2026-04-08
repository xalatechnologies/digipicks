import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '@digilist-saas/i18n';
import {
    Card,
    Heading,
    Paragraph,
    Button,
    Stack,
    Grid,
    DataTable,
    DashboardPageHeader,
    PageContentLayout,
    PillTabs,
    HeaderSearch,
    PlusIcon,
    EditIcon,
    CopyIcon,
    TrashIcon,
    CheckCircleIcon,
    ExternalLinkIcon,
    SettingsIcon,
    CalendarIcon,

    Dropdown,
    EmptyState,
    LoadingState,
    StatusTag,
    IconBox,
    formatTimeAgo,
    useToast,
} from '@digilist-saas/ds';
import type { DataTableColumn } from '@digilist-saas/ds';
import {
    useIntegrationConfigs,
    useCreateIntegrationConfig,
    useRemoveIntegrationConfig,
} from '@digilist-saas/sdk';
import type { IntegrationConfigRecord } from '@digilist-saas/sdk';
import { useAuthBridge } from '@digilist-saas/app-shell';

// ─────────────────────────── Constants ───────────────────────────

type BadgeColor = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type ActiveView = 'all' | 'payment' | 'accounting' | 'calendar' | 'email' | 'crm' | 'webhook';

// ─────────────────────────── Component ───────────────────────────

export function IntegrationsPage() {
    const t = useT();
    const navigate = useNavigate();
    const { user } = useAuthBridge();
    const { showToast } = useToast();

    const TYPE_OPTIONS = useMemo(() => [
        { id: 'all', label: t('integrations.typeAll') },
        { id: 'payment', label: t('integrations.typePayment') },
        { id: 'accounting', label: t('integrations.typeAccounting') },
        { id: 'erp', label: t('integrations.typeErp') },
        { id: 'ticketing', label: t('integrations.typeTicketing') },
        { id: 'access', label: t('integrations.typeAccess') },
        { id: 'calendar', label: t('integrations.typeCalendar') },
        { id: 'email', label: t('integrations.typeEmail') },
        { id: 'crm', label: t('integrations.typeCrm') },
        { id: 'webhook', label: t('integrations.typeWebhook') },
    ] as const, [t]);

    const typeMeta: Record<string, { label: string; statusColor: BadgeColor; iconVariant: 'accent' | 'success' | 'warning' | 'danger' | 'neutral' }> = useMemo(() => ({
        payment: { label: t('integrations.typePayment'), statusColor: 'success', iconVariant: 'success' },
        accounting: { label: t('integrations.typeAccounting'), statusColor: 'info', iconVariant: 'accent' },
        erp: { label: t('integrations.typeErp'), statusColor: 'info', iconVariant: 'accent' },
        ticketing: { label: t('integrations.typeTicketing'), statusColor: 'success', iconVariant: 'success' },
        access: { label: t('integrations.typeAccess'), statusColor: 'neutral', iconVariant: 'neutral' },
        calendar: { label: t('integrations.typeCalendar'), statusColor: 'warning', iconVariant: 'warning' },
        email: { label: t('integrations.typeEmail'), statusColor: 'info', iconVariant: 'accent' },
        crm: { label: t('integrations.typeCrm'), statusColor: 'neutral', iconVariant: 'neutral' },
        webhook: { label: t('integrations.typeWebhook'), statusColor: 'warning', iconVariant: 'warning' },
        sms: { label: t('integrations.typeSms'), statusColor: 'info', iconVariant: 'accent' },
    }), [t]);

    const statusMeta: Record<string, { label: string; color: BadgeColor }> = useMemo(() => ({
        active: { label: t('integrations.statusActive'), color: 'success' },
        connected: { label: t('integrations.statusConnected'), color: 'success' },
        error: { label: t('integrations.statusError'), color: 'danger' },
        pending: { label: t('integrations.statusPending'), color: 'warning' },
        inactive: { label: t('integrations.statusInactive'), color: 'neutral' },
        disconnected: { label: t('integrations.statusDisconnected'), color: 'neutral' },
    }), [t]);
    const tenantId = user?.tenantId;

    // View state
    const [activeView, setActiveView] = useState<ActiveView>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Fetch from Convex via SDK hook
    const { configs: rawConfigs, isLoading } = useIntegrationConfigs(tenantId);

    const integrations: IntegrationConfigRecord[] = useMemo(() =>
        rawConfigs ?? [], [rawConfigs]
    );

    // ─── Filtering ───
    const filteredIntegrations = useMemo(() => {
        let result = integrations;
        if (activeView !== 'all') result = result.filter((i) => i.integrationType === activeView);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((i) =>
                i.name.toLowerCase().includes(q) ||
                i.integrationType.toLowerCase().includes(q)
            );
        }
        return result;
    }, [integrations, activeView, searchQuery]);

    // ─── Stats ───
    const stats = useMemo(() => {
        const typeSet = new Set(integrations.map((i) => i.integrationType));
        return {
            total: integrations.length,
            active: integrations.filter((i) => i.isEnabled).length,
            errors: integrations.filter((i) => i.lastSyncStatus === 'error').length,
            types: typeSet.size,
        };
    }, [integrations]);

    // ─── Handlers ───
    const handleNewIntegration = useCallback(() => {
        navigate('/integrations/new');
    }, [navigate]);

    const handleEditIntegration = useCallback((integration: IntegrationConfigRecord) => {
        navigate(`/integrations/${integration.id}`);
    }, [navigate]);

    const { createIntegrationConfig } = useCreateIntegrationConfig();
    const { removeIntegrationConfig } = useRemoveIntegrationConfig();

    const handleDuplicate = useCallback(async (integration: IntegrationConfigRecord) => {
        if (!tenantId) return;
        try {
            const result = await createIntegrationConfig({
                tenantId,
                integrationType: integration.integrationType,
                name: `${integration.name} (${t('backoffice2.copyLabel')})`,
                config: integration.config as Record<string, unknown>,
                environment: integration.environment,
            });
            if (result?.id) {
                navigate(`/integrations/${result.id}`);
            }
        } catch {
            showToast({ title: t('common.duplicateError'), variant: 'error' });
        }
    }, [tenantId, createIntegrationConfig, navigate, showToast, t]);

    const handleDelete = useCallback(async (id: string) => {
        try {
            await removeIntegrationConfig(id);
        } catch {
            showToast({ title: t('common.deleteError'), variant: 'error' });
        }
    }, [removeIntegrationConfig, showToast, t]);

    // ─── Table columns ───
    const columns: DataTableColumn<IntegrationConfigRecord>[] = useMemo(() => [
        {
            id: 'name',
            header: t('integrations.columnName'),
            render: (row) => {
                const meta = typeMeta[row.integrationType];
                return (
                    <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
                        <IconBox
                            icon={<ExternalLinkIcon />}
                            variant={meta?.iconVariant ?? 'neutral'}
                            size="sm"
                        />
                        <Stack direction="vertical" spacing="0">
                            <Paragraph data-size="sm" style={{ fontWeight: 600, margin: 0 }}>
                                {row.name}
                            </Paragraph>
                            <Paragraph data-size="xs" style={{ color: 'var(--ds-color-neutral-text-subtle)', margin: 0 }}>
                                {row.environment === 'sandbox' ? t('integrations.envSandbox') : t('integrations.envProduction')}
                            </Paragraph>
                        </Stack>
                    </Stack>
                );
            },
            align: 'left',
        },
        {
            id: 'type',
            header: t('integrations.columnType'),
            render: (row) => {
                const meta = typeMeta[row.integrationType];
                return meta ? (
                    <StatusTag color={meta.statusColor} size="sm">{meta.label}</StatusTag>
                ) : (
                    <StatusTag color="neutral" size="sm">{row.integrationType}</StatusTag>
                );
            },
            align: 'left',
        },
        {
            id: 'status',
            header: t('integrations.columnStatus'),
            render: (row) => {
                const statusKey = row.isEnabled ? (row.lastSyncStatus === 'error' ? 'error' : 'active') : 'inactive';
                const meta = statusMeta[statusKey] ?? statusMeta.inactive;
                return <StatusTag color={meta.color} size="sm">{meta.label}</StatusTag>;
            },
            align: 'center',
        },
        {
            id: 'lastSync',
            header: t('integrations.columnLastSync'),
            render: (row) => (
                <Paragraph data-size="xs" style={{ color: 'var(--ds-color-neutral-text-subtle)', margin: 0 }}>
                    {row.lastSyncAt ? formatTimeAgo(new Date(row.lastSyncAt).toISOString()) : '—'}
                </Paragraph>
            ),
            align: 'right',
        },
        {
            id: 'actions',
            header: '',
            width: '120px',
            render: (row) => (
                <Dropdown.TriggerContext>
                    <Dropdown.Trigger
                        aria-label={t('common.actions')}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        data-size="sm"
                        variant="secondary"
                    >
                        {t('common.actions')}
                    </Dropdown.Trigger>
                    <Dropdown placement="bottom-end">
                        <Dropdown.List>
                            <Dropdown.Item>
                                <Dropdown.Button onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditIntegration(row); }}>
                                    <EditIcon /> {t('integrations.actionConfigure')}
                                </Dropdown.Button>
                            </Dropdown.Item>
                            <Dropdown.Item>
                                <Dropdown.Button onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDuplicate(row); }}>
                                    <CopyIcon /> {t('integrations.actionDuplicate')}
                                </Dropdown.Button>
                            </Dropdown.Item>
                            <Dropdown.Item>
                                <Dropdown.Button onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDelete(row.id); }}>
                                    <TrashIcon /> {t('integrations.actionRemove')}
                                </Dropdown.Button>
                            </Dropdown.Item>
                        </Dropdown.List>
                    </Dropdown>
                </Dropdown.TriggerContext>
            ),
            align: 'right',
        },
    ], [t, handleEditIntegration, handleDuplicate, handleDelete]);

    // ─────────────────────────── Render ───────────────────────────

    return (
        <PageContentLayout>
            <DashboardPageHeader
                title={t('integrations.title')}
                subtitle={t('integrations.subtitle')}
                actions={
                    <Button data-size="sm" onClick={handleNewIntegration}>
                        <PlusIcon />
                        {t('integrations.newIntegration')}
                    </Button>
                }
            />

            {/* ─── KPI Stats Row ─── */}
            <Grid columns="repeat(4, 1fr)" gap="var(--ds-size-4)">
                {[
                    { icon: <ExternalLinkIcon />, label: t('integrations.totalIntegrations'), value: stats.total, variant: 'accent' as const },
                    { icon: <CheckCircleIcon />, label: t('integrations.activeIntegrations'), value: stats.active, variant: 'success' as const },
                    { icon: <SettingsIcon />, label: t('integrations.errors'), value: stats.errors, variant: 'danger' as const },
                    { icon: <CalendarIcon />, label: t('integrations.types'), value: stats.types, variant: 'warning' as const },
                ].map((stat) => (
                    <Card key={stat.label} data-color="neutral" style={{ padding: 'var(--ds-size-5)' }}>
                        <Stack direction="horizontal" spacing="var(--ds-size-4)" align="center">
                            <IconBox icon={stat.icon} variant={stat.variant} size="md" />
                            <Stack direction="vertical" spacing="var(--ds-size-1)">
                                <Paragraph data-size="xs" style={{ color: 'var(--ds-color-neutral-text-subtle)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
                                    {stat.label}
                                </Paragraph>
                                <Heading level={2} data-size="lg" style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                                    {stat.value.toLocaleString('nb-NO')}
                                </Heading>
                            </Stack>
                        </Stack>
                    </Card>
                ))}
            </Grid>

            {/* ─── Type Tabs ─── */}
            <PillTabs
                tabs={TYPE_OPTIONS.map((opt) => {
                    const count = opt.id === 'all' ? integrations.length : integrations.filter((i: IntegrationConfigRecord) => i.integrationType === opt.id).length;
                    return { id: opt.id, label: opt.label, badge: count > 0 ? count.toString() : undefined };
                })}
                activeTab={activeView}
                onTabChange={(id) => setActiveView(id as ActiveView)}
            />

            {/* ─── Search ─── */}
            <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
                <HeaderSearch
                    placeholder={t('integrations.searchPlaceholder')}
                    value={searchQuery}
                    onSearchChange={setSearchQuery}
                    onSearch={setSearchQuery}
                    width="350px"
                />
            </Stack>

            {/* ─── Bulk Selection Bar ─── */}
            {selectedIds.length > 0 && (
                <Stack direction="horizontal" align="center" spacing="var(--ds-size-3)" style={{
                    padding: 'var(--ds-size-3) var(--ds-size-4)',
                    backgroundColor: 'var(--ds-color-accent-surface-default)',
                    borderRadius: 'var(--ds-border-radius-md)',
                }}>
                    <Paragraph data-size="sm" style={{ margin: 0 }}>{t('common.nSelected', { count: selectedIds.length })}</Paragraph>
                    <Button type="button" variant="secondary" data-size="sm" onClick={() => setSelectedIds([])}>
                        {t('common.clearSelection')}
                    </Button>
                </Stack>
            )}

            {/* ─── Integration List ─── */}
            {isLoading ? (
                <Card data-color="neutral" style={{ padding: 'var(--ds-size-12)' }}>
                    <LoadingState message={t('integrations.loading')} size="lg" />
                </Card>
            ) : filteredIntegrations.length === 0 ? (
                <Card data-color="neutral" style={{ padding: 'var(--ds-size-12)' }}>
                    <EmptyState
                        icon={<ExternalLinkIcon />}
                        title={searchQuery ? t('common.noResults') : t('integrations.noIntegrations')}
                        description={
                            searchQuery
                                ? t('integrations.noResultsDesc')
                                : t('integrations.noIntegrationsDesc')
                        }
                        action={
                            !searchQuery ? (
                                <Button data-size="sm" onClick={handleNewIntegration}>
                                    <PlusIcon />
                                    {t('integrations.addFirst')}
                                </Button>
                            ) : undefined
                        }
                    />
                </Card>
            ) : (
                <Card data-color="neutral" style={{ padding: 0 }}>
                    <DataTable
                        columns={columns}
                        data={filteredIntegrations}
                        getRowKey={(row) => row.id}
                        style={{ width: '100%' }}
                        emptyMessage={t('integrations.noIntegrations')}
                        selectable
                        selectedRows={selectedIds}
                        onSelectionChange={setSelectedIds}
                        onRowClick={(row) => handleEditIntegration(row)}
                    />
                </Card>
            )}
        </PageContentLayout>
    );
}
