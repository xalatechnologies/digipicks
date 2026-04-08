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
    SendIcon,
    CheckCircleIcon,
    MailIcon,
    ChartIcon,

    Dropdown,
    EmptyState,
    ErrorState,
    LoadingState,
    StatusTag,
    IconBox,
    formatTimeAgo,
    useToast,
} from '@digilist-saas/ds';
import type { DataTableColumn } from '@digilist-saas/ds';
import { useEmailTemplates as useEmailTemplatesQuery, useCreateEmailTemplate, useDeleteEmailTemplate, useSendTestEmail } from '@digilist-saas/sdk';
import { useAuthBridge } from '@digilist-saas/app-shell';

// ─────────────────────────── Constants ───────────────────────────

type BadgeColor = 'success' | 'warning' | 'info' | 'neutral';

// ─────────────────────────── Types ───────────────────────────

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    category: string;
    isActive: boolean;
    isDefault: boolean;
    lastModified: string; // ISO string for formatTimeAgo
    modifiedBy?: string;
    sendCount?: number;
}

type ActiveView = 'all' | 'booking' | 'notification' | 'reminder' | 'invoice' | 'welcome' | 'system';

// ─────────────────────────── Component ───────────────────────────

export function EmailTemplatesPage() {
    const t = useT();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const { user } = useAuthBridge();

    // i18n-aware category options and meta
    const categoryOptions = useMemo(() => [
        { id: 'all', label: t('emailTemplates.allTemplates') },
        { id: 'booking', label: t('emailTemplates.categoryBooking') },
        { id: 'notification', label: t('emailTemplates.categoryNotification') },
        { id: 'reminder', label: t('emailTemplates.categoryReminder') },
        { id: 'invoice', label: t('emailTemplates.categoryInvoice') },
        { id: 'welcome', label: t('emailTemplates.categoryWelcome') },
        { id: 'system', label: t('emailTemplates.categorySystem') },
    ], [t]);

    const categoryMeta = useMemo((): Record<string, { label: string; statusColor: BadgeColor }> => ({
        booking: { label: t('emailTemplates.categoryBooking'), statusColor: 'info' },
        notification: { label: t('emailTemplates.categoryNotification'), statusColor: 'warning' },
        reminder: { label: t('emailTemplates.categoryReminder'), statusColor: 'neutral' },
        invoice: { label: t('emailTemplates.categoryInvoice'), statusColor: 'success' },
        welcome: { label: t('emailTemplates.categoryWelcome'), statusColor: 'info' },
        system: { label: t('emailTemplates.categorySystem'), statusColor: 'neutral' },
    }), [t]);

    // View state
    const [activeView, setActiveView] = useState<ActiveView>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Fetch from Convex via SDK hook (tenantId resolved from session)
    const { templates: rawTemplates, isLoading, error } = useEmailTemplatesQuery();
    const templates: EmailTemplate[] = useMemo(() =>
        rawTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            subject: t.subject ?? '',
            body: t.body,
            category: t.category,
            isActive: t.isActive,
            isDefault: t.isDefault ?? false,
            lastModified: t.lastModified ? new Date(t.lastModified).toISOString() : t.createdAt,
            modifiedBy: t.modifiedBy,
            sendCount: t.sendCount,
        })),
        [rawTemplates]
    );

    // ─── Filtering ───
    const filteredTemplates = useMemo(() => {
        let result = templates;
        if (activeView !== 'all') {
            result = result.filter((tmpl) => tmpl.category === activeView);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (tmpl) =>
                    tmpl.name.toLowerCase().includes(q) ||
                    tmpl.subject.toLowerCase().includes(q)
            );
        }
        return result;
    }, [templates, activeView, searchQuery]);

    // ─── Stats ───
    const stats = useMemo(() => {
        const active = templates.filter((tp) => tp.isActive).length;
        const totalSent = templates.reduce((sum, tp) => sum + (tp.sendCount ?? 0), 0);
        const categories = new Set(templates.map((tp) => tp.category)).size;
        return { total: templates.length, active, totalSent, categories };
    }, [templates]);

    // ─── Category counts (for tab badges) ───
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        templates.forEach((tp) => {
            counts[tp.category] = (counts[tp.category] ?? 0) + 1;
        });
        return counts;
    }, [templates]);

    const categoryTabs = useMemo(() =>
        categoryOptions.map((opt) => ({
            id: opt.id,
            label: opt.id === 'all'
                ? `${opt.label} (${templates.length})`
                : `${opt.label} (${categoryCounts[opt.id] ?? 0})`,
        })),
        [categoryOptions, templates.length, categoryCounts]
    );

    // ─── Handlers — navigate to wizard routes ───
    const handleNewTemplate = useCallback(() => {
        navigate('/email-templates/new');
    }, [navigate]);

    const handleEditTemplate = useCallback((template: EmailTemplate) => {
        navigate(`/email-templates/${template.id}`);
    }, [navigate]);

    const { createEmailTemplate } = useCreateEmailTemplate();
    const { deleteEmailTemplate } = useDeleteEmailTemplate();

    const handleDuplicateTemplate = useCallback(async (template: EmailTemplate) => {
        const tenantId = user?.tenantId;
        if (!tenantId) return;
        try {
            const result = await createEmailTemplate({
                tenantId,
                name: `${template.name} ${t('emailTemplates.duplicateSuffix')}`,
                subject: template.subject,
                body: template.body,
                category: template.category,
                isActive: false,
                modifiedBy: user?.name ?? user?.email ?? undefined,
            });
            navigate(`/email-templates/${result.id}`);
        } catch (err) {
            showToast({ title: t('common.duplicateError'), variant: 'error' });
        }
    }, [user, createEmailTemplate, navigate, showToast, t]);

    const handleDelete = useCallback(async (id: string) => {
        try {
            await deleteEmailTemplate(id);
        } catch (err) {
            showToast({ title: t('common.deleteError'), variant: 'error' });
        }
    }, [deleteEmailTemplate, showToast, t]);

    const { sendTestEmail } = useSendTestEmail();

    const handleSendTest = useCallback(async (templateId: string) => {
        if (!user?.email) return;
        try {
            const result = await sendTestEmail({ templateId, recipientEmail: user.email });
            if (result.success) {
                showToast({ title: t('emailTemplates.testEmailSent'), variant: 'success' });
            }
        } catch (err) {
            showToast({ title: t('emailTemplates.testEmailError'), variant: 'error' });
        }
    }, [user, sendTestEmail, showToast, t]);

    // ─── Table columns ───
    const columns: DataTableColumn<EmailTemplate>[] = useMemo(
        () => [
            {
                id: 'name',
                header: t('emailTemplates.columnName'),
                render: (row) => (
                    <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
                        <IconBox
                            icon={<MailIcon />}
                            variant={row.isActive ? 'accent' : 'neutral'}
                            size="sm"
                        />
                        <Stack direction="vertical" spacing="0">
                            <Paragraph data-size="sm" style={{ fontWeight: 600, margin: 0 }}>
                                {row.name}
                            </Paragraph>
                            <Paragraph data-size="xs" style={{ color: 'var(--ds-color-neutral-text-subtle)', margin: 0 }}>
                                {row.subject}
                            </Paragraph>
                        </Stack>
                    </Stack>
                ),
                align: 'left',
            },
            {
                id: 'category',
                header: t('emailTemplates.columnCategory'),
                render: (row) => {
                    const meta = categoryMeta[row.category];
                    return meta ? (
                        <StatusTag color={meta.statusColor} size="sm">{meta.label}</StatusTag>
                    ) : (
                        <StatusTag color="neutral" size="sm">{row.category}</StatusTag>
                    );
                },
                align: 'left',
            },
            {
                id: 'status',
                header: t('emailTemplates.columnStatus'),
                render: (row) => (
                    <StatusTag color={row.isActive ? 'success' : 'neutral'} size="sm">
                        {row.isActive ? t('emailTemplates.active') : t('emailTemplates.inactive')}
                    </StatusTag>
                ),
                align: 'center',
            },
            {
                id: 'sendCount',
                header: t('emailTemplates.columnSent'),
                render: (row) => (
                    <Paragraph data-size="sm" style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {(row.sendCount ?? 0).toLocaleString('nb-NO')}
                    </Paragraph>
                ),
                align: 'right',
            },
            {
                id: 'lastModified',
                header: t('emailTemplates.columnLastModified'),
                render: (row) => (
                    <Stack direction="vertical" spacing="0">
                        <Paragraph data-size="xs" style={{ color: 'var(--ds-color-neutral-text-subtle)', margin: 0 }}>
                            {formatTimeAgo(row.lastModified)}
                        </Paragraph>
                        {row.modifiedBy && (
                            <Paragraph data-size="xs" style={{ color: 'var(--ds-color-neutral-text-subtle)', margin: 0, opacity: 0.7 }}>
                                {row.modifiedBy}
                            </Paragraph>
                        )}
                    </Stack>
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
                                    <Dropdown.Button onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditTemplate(row); }}>
                                        <EditIcon /> {t('emailTemplates.actionEdit')}
                                    </Dropdown.Button>
                                </Dropdown.Item>
                                <Dropdown.Item>
                                    <Dropdown.Button onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDuplicateTemplate(row); }}>
                                        <CopyIcon /> {t('emailTemplates.actionDuplicate')}
                                    </Dropdown.Button>
                                </Dropdown.Item>
                                <Dropdown.Item>
                                    <Dropdown.Button onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleSendTest(row.id); }}>
                                        <SendIcon /> {t('emailTemplates.actionSendTest')}
                                    </Dropdown.Button>
                                </Dropdown.Item>
                                {!row.isDefault && (
                                    <Dropdown.Item>
                                        <Dropdown.Button onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDelete(row.id); }}>
                                            <TrashIcon /> {t('emailTemplates.actionDelete')}
                                        </Dropdown.Button>
                                    </Dropdown.Item>
                                )}
                            </Dropdown.List>
                        </Dropdown>
                    </Dropdown.TriggerContext>
                ),
                align: 'right',
            },
        ],
        [t, categoryMeta, handleEditTemplate, handleDuplicateTemplate, handleSendTest, handleDelete]
    );

    // ─────────────────────────── Render ───────────────────────────

    return (
        <PageContentLayout>
            <DashboardPageHeader
                title={t('emailTemplates.title')}
                subtitle={t('emailTemplates.subtitle')}
                actions={
                    <Button data-size="sm" onClick={handleNewTemplate}>
                        <PlusIcon />
                        {t('emailTemplates.newTemplate')}
                    </Button>
                }
            />

            {/* ─── KPI Stats Row ─── */}
            <Grid columns="repeat(4, 1fr)" gap="var(--ds-size-4)">
                {[
                    { icon: <MailIcon />, label: t('emailTemplates.totalTemplates'), value: stats.total, variant: 'accent' as const },
                    { icon: <CheckCircleIcon />, label: t('emailTemplates.activeTemplates'), value: stats.active, variant: 'success' as const },
                    { icon: <SendIcon />, label: t('emailTemplates.totalSent'), value: stats.totalSent, variant: 'warning' as const },
                    { icon: <ChartIcon />, label: t('emailTemplates.categories'), value: stats.categories, variant: 'neutral' as const },
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

            {/* ─── Category Tabs ─── */}
            <PillTabs
                tabs={categoryTabs}
                activeTab={activeView}
                onTabChange={(id) => setActiveView(id as ActiveView)}
            />

            {/* ─── Search ─── */}
            <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
                <HeaderSearch
                    placeholder={t('emailTemplates.searchPlaceholder')}
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

            {/* ─── Template List ─── */}
            {error ? (
                <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
            ) : isLoading ? (
                <Card data-color="neutral" style={{ padding: 'var(--ds-size-12)' }}>
                    <LoadingState message={t('emailTemplates.loading')} size="lg" />
                </Card>
            ) : filteredTemplates.length === 0 ? (
                <Card data-color="neutral" style={{ padding: 'var(--ds-size-12)' }}>
                    <EmptyState
                        icon={<MailIcon />}
                        title={searchQuery ? t('common.noResults') : t('emailTemplates.noTemplates')}
                        description={
                            searchQuery
                                ? t('emailTemplates.noResultsDesc')
                                : t('emailTemplates.noTemplatesDesc')
                        }
                        action={
                            !searchQuery ? (
                                <Button data-size="sm" onClick={handleNewTemplate}>
                                    <PlusIcon />
                                    {t('emailTemplates.createFirst')}
                                </Button>
                            ) : undefined
                        }
                    />
                </Card>
            ) : (
                <Card data-color="neutral" style={{ padding: 0 }}>
                    <DataTable
                        columns={columns}
                        data={filteredTemplates}
                        getRowKey={(row) => row.id}
                        style={{ width: '100%' }}
                        emptyMessage={t('emailTemplates.noTemplates')}
                        selectable
                        selectedRows={selectedIds}
                        onSelectionChange={setSelectedIds}
                        onRowClick={(row) => handleEditTemplate(row)}
                    />
                </Card>
            )}
        </PageContentLayout>
    );
}
