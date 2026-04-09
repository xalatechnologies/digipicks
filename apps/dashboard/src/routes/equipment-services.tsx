/**
 * EquipmentServicesPage
 *
 * Admin page for managing equipment (addons) and additional services.
 * Two tabs: Utstyr (addons from addons component) and Tilleggstjenester (from pricing component).
 * Addons tab has full CRUD via modal. Services tab is read-only (no SDK create hook yet).
 */

import { useState, useMemo, type FormEvent } from 'react';
import { useT, useLocale } from '@digipicks/i18n';
import { getIntlLocale } from '@digipicks/shared/constants';
import { useTenantContext } from '@digipicks/app-shell';
import {
  useAddons,
  useCreateAddon,
  useUpdateAddon,
  useDeleteAddon,
  useAdditionalServicesByTenant,
  useCreateAdditionalService,
  useUpdateAdditionalService,
  useDeleteAdditionalService,
} from '@digipicks/sdk';
import type { Addon } from '@digipicks/sdk';
import type { AdditionalService } from '@digipicks/sdk';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  DataTable,
  Badge,
  Spinner,
  PillTabs,
  Textfield,
  PillDropdown,
  SettingsToggle,
  Drawer,
  DrawerSection,
  useDialog,
  DashboardPageHeader,
  PageContentLayout,
  ErrorState,
  Stack,
  Grid,
  useIsMobile,
  EditIcon,
  PlusIcon,
} from '@digipicks/ds';
import type { DataTableColumn } from '@digipicks/ds';
import styles from './equipment-services.module.css';

export function EquipmentServicesPage() {
  const t = useT();
  const { locale } = useLocale();
  const { confirm } = useDialog();
  const isMobile = useIsMobile();
  const { tenantId } = useTenantContext();

  const [activeTab, setActiveTab] = useState<'addons' | 'services'>('addons');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Service modal state ──
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'NOK',
    isRequired: false,
    displayOrder: '',
  });

  // ── Form state ──
  const [addonForm, setAddonForm] = useState({
    name: '',
    slug: '',
    description: '',
    category: '',
    priceType: 'per_booking',
    price: '',
    currency: 'NOK',
    maxQuantity: '',
    requiresApproval: false,
    availabilityType: 'optional' as 'optional' | 'required' | 'included',
  });

  // Fetch addons (equipment)
  const { data: addonsData, isLoading: addonsLoading, error: addonsError } = useAddons(tenantId ?? undefined);
  const addons = addonsData?.data ?? [];
  // Fetch additional services (deduplicate by name — seed may create per-resource entries)
  const { services: rawServices, isLoading: servicesLoading } = useAdditionalServicesByTenant(tenantId ?? undefined);
  const services = rawServices.filter(
    (svc: any, idx: number, arr: any[]) => arr.findIndex((s: any) => s.name === svc.name) === idx,
  );

  // ── Mutations ──
  const { mutate: createAddon } = useCreateAddon();
  const { mutate: updateAddon } = useUpdateAddon();
  const { mutate: deleteAddon } = useDeleteAddon();

  // ── Service mutations ──
  const { mutate: createService } = useCreateAdditionalService();
  const { mutate: updateService } = useUpdateAdditionalService();
  const { mutate: deleteService } = useDeleteAdditionalService();

  const formatPrice = (amount: number, currency: string) => {
    return `${amount.toLocaleString(getIntlLocale(locale))} ${currency}`;
  };

  const handleDeleteAddon = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: t('equipmentServices.deleteTitle'),
      description: t('equipmentServices.deleteConfirm', { name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });
    if (confirmed) {
      await deleteAddon(id);
    }
  };

  // ── Service CRUD handlers ──
  const openCreateService = () => {
    setEditingServiceId(null);
    setServiceForm({ name: '', description: '', price: '', currency: 'NOK', isRequired: false, displayOrder: '' });
    setServiceModalOpen(true);
  };

  const openEditService = (service: AdditionalService) => {
    setEditingServiceId(service.id);
    setServiceForm({
      name: service.name,
      description: service.description || '',
      price: String(service.price),
      currency: service.currency || 'NOK',
      isRequired: service.isRequired,
      displayOrder: service.displayOrder ? String(service.displayOrder) : '',
    });
    setServiceModalOpen(true);
  };

  const closeServiceModal = () => {
    setServiceModalOpen(false);
    setEditingServiceId(null);
    setServiceSubmitting(false);
  };

  const handleSubmitService = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setServiceSubmitting(true);
    try {
      if (editingServiceId) {
        await updateService({
          serviceId: editingServiceId,
          name: serviceForm.name,
          description: serviceForm.description || undefined,
          price: parseFloat(serviceForm.price) || 0,
          currency: serviceForm.currency,
          isRequired: serviceForm.isRequired,
          displayOrder: serviceForm.displayOrder ? parseInt(serviceForm.displayOrder, 10) : undefined,
        });
      } else {
        await createService({
          tenantId,
          resourceId: '_all',
          name: serviceForm.name,
          description: serviceForm.description || undefined,
          price: parseFloat(serviceForm.price) || 0,
          currency: serviceForm.currency,
          isRequired: serviceForm.isRequired,
          displayOrder: serviceForm.displayOrder ? parseInt(serviceForm.displayOrder, 10) : undefined,
        });
      }
      closeServiceModal();
    } finally {
      setServiceSubmitting(false);
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: t('equipmentServices.deleteTitle'),
      description: t('equipmentServices.deleteConfirm', { name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });
    if (confirmed) {
      await deleteService(id);
    }
  };

  const serviceFormRef = { current: null as HTMLFormElement | null };

  const priceTypeLabel = (priceType: string) => {
    switch (priceType) {
      case 'fixed':
        return t('equipmentServices.priceFixed');
      case 'per_hour':
        return t('equipmentServices.pricePerHour');
      case 'per_day':
        return t('equipmentServices.pricePerDay');
      case 'per_unit':
        return t('equipmentServices.pricePerUnit');
      case 'per_booking':
        return t('equipmentServices.pricePerBooking');
      default:
        return priceType;
    }
  };

  // ── Open modal for create ──
  const openCreate = () => {
    setEditingId(null);
    setAddonForm({
      name: '',
      slug: '',
      description: '',
      category: '',
      priceType: 'per_booking',
      price: '',
      currency: 'NOK',
      maxQuantity: '',
      requiresApproval: false,
      availabilityType: 'optional',
    });
    setModalOpen(true);
  };

  // ── Open modal for edit ──
  const openEdit = (addon: Addon) => {
    setEditingId(addon._id);
    setAddonForm({
      name: addon.name,
      slug: addon.slug || '',
      description: addon.description || '',
      category: addon.category || '',
      priceType: addon.priceType,
      price: String(addon.price),
      currency: addon.currency,
      maxQuantity: addon.maxQuantity != null ? String(addon.maxQuantity) : '',
      requiresApproval: addon.requiresApproval ?? false,
      availabilityType: (addon.metadata?.availabilityType as 'optional' | 'required' | 'included') ?? 'optional',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setSubmitting(false);
  };

  // ── Create or update addon ──
  const handleSubmitAddon = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSubmitting(true);
    try {
      const effectivePrice = addonForm.availabilityType === 'included' ? 0 : parseFloat(addonForm.price) || 0;
      const metadata = { availabilityType: addonForm.availabilityType };
      if (editingId) {
        await updateAddon({
          id: editingId,
          name: addonForm.name,
          description: addonForm.description || undefined,
          category: addonForm.category || undefined,
          priceType: addonForm.priceType,
          price: effectivePrice,
          currency: addonForm.currency,
          maxQuantity: addonForm.maxQuantity ? parseInt(addonForm.maxQuantity, 10) : undefined,
          requiresApproval: addonForm.requiresApproval,
          metadata,
        });
      } else {
        const slug =
          addonForm.slug ||
          addonForm.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        await createAddon({
          tenantId: tenantId as any,
          name: addonForm.name,
          slug,
          description: addonForm.description || undefined,
          category: addonForm.category || undefined,
          priceType: addonForm.priceType,
          price: effectivePrice,
          currency: addonForm.currency,
          maxQuantity: addonForm.maxQuantity ? parseInt(addonForm.maxQuantity, 10) : undefined,
          requiresApproval: addonForm.requiresApproval,
          metadata,
        });
      }
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Drawer form ref for footer submit ──
  const formRef = { current: null as HTMLFormElement | null };

  // ── Modal form (using DrawerSection like bookings drawer) ──
  const renderModalForm = () => {
    const isEdit = !!editingId;
    return (
      <form
        ref={(el) => {
          formRef.current = el;
        }}
        onSubmit={handleSubmitAddon}
      >
        <DrawerSection
          title={t('equipmentServices.addonDetails')}
          description={isEdit ? t('equipmentServices.editAddonDesc') : t('equipmentServices.newAddonDesc')}
        >
          <Stack spacing="var(--ds-size-3)">
            <Textfield
              label={t('common.name')}
              value={addonForm.name}
              onChange={(e) => setAddonForm((p) => ({ ...p, name: e.target.value }))}
              required
              data-size="sm"
              placeholder="Projektor og lerret"
            />
            <Textfield
              label={t('equipmentServices.category')}
              value={addonForm.category}
              onChange={(e) => setAddonForm((p) => ({ ...p, category: e.target.value }))}
              data-size="sm"
              placeholder="teknikk"
            />
            <Textfield
              label={t('common.description')}
              value={addonForm.description}
              onChange={(e) => setAddonForm((p) => ({ ...p, description: e.target.value }))}
              data-size="sm"
              placeholder="Portabel projektor med 3m lerret"
            />
          </Stack>
        </DrawerSection>
        <DrawerSection title={t('equipmentServices.pricingSection')} collapsible>
          <Stack spacing="var(--ds-size-3)">
            <Stack spacing="var(--ds-size-1)">
              <Paragraph data-size="sm" className={styles.formLabel}>
                {t('equipmentServices.priceType')}
              </Paragraph>
              <PillDropdown
                label={priceTypeLabel(addonForm.priceType)}
                value={addonForm.priceType}
                onChange={(val) => setAddonForm((p) => ({ ...p, priceType: val }))}
                options={[
                  { value: 'per_booking', label: t('equipmentServices.pricePerBooking') },
                  { value: 'per_unit', label: t('equipmentServices.pricePerUnit') },
                  { value: 'per_hour', label: t('equipmentServices.pricePerHour') },
                  { value: 'per_day', label: t('equipmentServices.pricePerDay') },
                ]}
                ariaLabel={t('equipmentServices.priceType')}
              />
            </Stack>
            <Textfield
              label={t('pricing.amount')}
              type="number"
              value={addonForm.availabilityType === 'included' ? '0' : addonForm.price}
              onChange={(e) => setAddonForm((p) => ({ ...p, price: e.target.value }))}
              required
              data-size="sm"
              placeholder="1200"
              disabled={addonForm.availabilityType === 'included'}
            />
            <Textfield
              label={t('equipmentServices.maxQuantity')}
              type="number"
              value={addonForm.maxQuantity}
              onChange={(e) => setAddonForm((p) => ({ ...p, maxQuantity: e.target.value }))}
              data-size="sm"
              placeholder="1"
            />
          </Stack>
        </DrawerSection>
        <DrawerSection title={t('equipmentServices.settingsSection')} collapsible defaultCollapsed>
          <Stack spacing="var(--ds-size-3)">
            <Stack spacing="var(--ds-size-1)">
              <Paragraph data-size="sm" className={styles.formLabel}>
                {t('equipmentServices.availabilityType')}
              </Paragraph>
              <PillDropdown
                label={
                  addonForm.availabilityType === 'optional'
                    ? t('equipmentServices.availabilityOptional')
                    : addonForm.availabilityType === 'required'
                      ? t('equipmentServices.availabilityRequired')
                      : t('equipmentServices.availabilityIncluded')
                }
                value={addonForm.availabilityType}
                onChange={(val) => {
                  const newType = val as 'optional' | 'required' | 'included';
                  setAddonForm((p) => ({
                    ...p,
                    availabilityType: newType,
                    ...(newType === 'included' ? { price: '0' } : {}),
                  }));
                }}
                options={[
                  { value: 'optional', label: t('equipmentServices.availabilityOptional') },
                  { value: 'required', label: t('equipmentServices.availabilityRequired') },
                  { value: 'included', label: t('equipmentServices.availabilityIncluded') },
                ]}
                ariaLabel={t('equipmentServices.availabilityType')}
              />
            </Stack>
            <SettingsToggle
              label={t('equipmentServices.requiresApproval')}
              description={t('equipmentServices.requiresApprovalDesc')}
              checked={addonForm.requiresApproval}
              onChange={(checked) => setAddonForm((p) => ({ ...p, requiresApproval: checked }))}
            />
          </Stack>
        </DrawerSection>
      </form>
    );
  };

  // Addon columns
  const addonColumns: DataTableColumn<Addon>[] = useMemo(
    () => [
      {
        id: 'name',
        header: t('common.name'),
        render: (addon) => <span className={styles.cellMedium}>{addon.name}</span>,
      },
      {
        id: 'category',
        header: t('equipmentServices.category'),
        render: (addon) => (addon.category ? <Badge>{addon.category}</Badge> : <span>—</span>),
      },
      {
        id: 'price',
        header: t('pricing.amount'),
        render: (addon) => <span className={styles.cellSemibold}>{formatPrice(addon.price, addon.currency)}</span>,
      },
      {
        id: 'priceType',
        header: t('equipmentServices.priceType'),
        render: (addon) => <Badge>{priceTypeLabel(addon.priceType)}</Badge>,
      },
      {
        id: 'availabilityType',
        header: t('equipmentServices.availabilityType'),
        render: (addon) => {
          const type = (addon.metadata?.availabilityType as string) ?? 'optional';
          const label =
            type === 'required'
              ? t('equipmentServices.availabilityRequired')
              : type === 'included'
                ? t('equipmentServices.availabilityIncluded')
                : t('equipmentServices.availabilityOptional');
          const color =
            type === 'required'
              ? 'var(--ds-color-warning-surface-default)'
              : type === 'included'
                ? 'var(--ds-color-success-surface-default)'
                : 'var(--ds-color-neutral-surface-default)';
          const textColor =
            type === 'required'
              ? 'var(--ds-color-warning-text-default)'
              : type === 'included'
                ? 'var(--ds-color-success-text-default)'
                : 'var(--ds-color-neutral-text-default)';
          return <Badge style={{ backgroundColor: color, color: textColor }}>{label}</Badge>;
        },
      },
      {
        id: 'approval',
        header: t('equipmentServices.requiresApproval'),
        render: (addon) => (
          <Badge
            style={{
              backgroundColor: addon.requiresApproval
                ? 'var(--ds-color-warning-surface-default)'
                : 'var(--ds-color-success-surface-default)',
              color: addon.requiresApproval
                ? 'var(--ds-color-warning-text-default)'
                : 'var(--ds-color-success-text-default)',
            }}
          >
            {addon.requiresApproval ? t('equipmentServices.yes') : t('equipmentServices.no')}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: t('common.status'),
        render: (addon) => (
          <Badge
            style={{
              backgroundColor: addon.isActive
                ? 'var(--ds-color-success-surface-default)'
                : 'var(--ds-color-neutral-surface-default)',
              color: addon.isActive ? 'var(--ds-color-success-text-default)' : 'var(--ds-color-neutral-text-default)',
            }}
          >
            {addon.isActive ? t('common.active') : t('common.inactive')}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        width: '140px',
        render: (addon) => (
          <Stack direction="horizontal" spacing="var(--ds-size-2)">
            <Button type="button" variant="tertiary" data-size="sm" onClick={() => openEdit(addon)}>
              {t('common.edit')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              data-size="sm"
              onClick={() => handleDeleteAddon(addon._id, addon.name)}
            >
              {t('common.delete')}
            </Button>
          </Stack>
        ),
      },
    ],
    [locale],
  );

  // Additional services columns
  const serviceColumns: DataTableColumn<AdditionalService>[] = useMemo(
    () => [
      {
        id: 'name',
        header: t('common.name'),
        render: (service) => <span className={styles.cellMedium}>{service.name}</span>,
      },
      {
        id: 'description',
        header: t('common.description'),
        render: (service) => (
          <Paragraph data-size="sm" className={styles.cellSubtle}>
            {service.description || '—'}
          </Paragraph>
        ),
      },
      {
        id: 'price',
        header: t('pricing.amount'),
        render: (service) => (
          <span className={styles.cellSemibold}>{formatPrice(service.price, service.currency)}</span>
        ),
      },
      {
        id: 'required',
        header: t('equipmentServices.requiresApproval'),
        render: (service) => (
          <Badge
            style={{
              backgroundColor: service.isRequired
                ? 'var(--ds-color-warning-surface-default)'
                : 'var(--ds-color-neutral-surface-default)',
              color: service.isRequired
                ? 'var(--ds-color-warning-text-default)'
                : 'var(--ds-color-neutral-text-default)',
            }}
          >
            {service.isRequired ? t('equipmentServices.yes') : t('equipmentServices.no')}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        width: '140px',
        render: (service) => (
          <Stack direction="horizontal" spacing="var(--ds-size-2)">
            <Button type="button" variant="tertiary" data-size="sm" onClick={() => openEditService(service)}>
              {t('common.edit')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              data-size="sm"
              onClick={() => handleDeleteService(service.id, service.name)}
            >
              {t('common.delete')}
            </Button>
          </Stack>
        ),
      },
    ],
    [locale],
  );

  const activeAddons = addons.filter((a) => a.isActive);
  const approvalRequired = addons.filter((a) => a.requiresApproval);

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('equipmentServices.title')}
        subtitle={t('equipmentServices.subtitle')}
        actions={
          activeTab === 'addons' ? (
            <Button
              type="button"
              variant="primary"
              data-size="md"
              onClick={openCreate}
              className={styles.actionButton}
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              {t('equipmentServices.newAddon')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              data-size="md"
              onClick={openCreateService}
              className={styles.actionButton}
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              {t('equipmentServices.newService')}
            </Button>
          )
        }
      />

      {/* Stats */}
      <Grid columns={isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'} gap="var(--ds-size-4)">
        {[
          { label: t('equipmentServices.totalAddons'), count: addons.length },
          { label: t('equipmentServices.totalServices'), count: services.length },
          { label: t('equipmentServices.activeItems'), count: activeAddons.length },
          { label: t('equipmentServices.requiresApprovalCount'), count: approvalRequired.length },
        ].map(({ label, count }, i) => (
          <Card key={i} className={styles.statCard}>
            <Paragraph data-size="sm" className={styles.statLabel}>
              {label}
            </Paragraph>
            <Heading level={2} data-size="xl" className={styles.statValue}>
              {count}
            </Heading>
          </Card>
        ))}
      </Grid>

      {/* Tabs */}
      <PillTabs
        activeTab={activeTab}
        onTabChange={(val) => setActiveTab(val as 'addons' | 'services')}
        tabs={[
          { id: 'addons', label: t('equipmentServices.tabAddons') },
          { id: 'services', label: t('equipmentServices.tabServices') },
        ]}
      />

      {/* Table */}
      <Card className={styles.tableCard}>
        {addonsError ? (
          <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
        ) : activeTab === 'addons' ? (
          addonsLoading ? (
            <Stack direction="horizontal" justify="center" className={styles.loadingWrapper}>
              <Spinner aria-label={t('common.loading')} data-size="lg" />
            </Stack>
          ) : (
            <DataTable<Addon>
              columns={addonColumns}
              data={addons}
              getRowKey={(row) => row._id}
              size="sm"
              className={styles.fullWidthTable}
              emptyMessage={t('equipmentServices.noAddons')}
            />
          )
        ) : servicesLoading ? (
          <Stack direction="horizontal" justify="center" className={styles.loadingWrapper}>
            <Spinner aria-label={t('common.loading')} data-size="lg" />
          </Stack>
        ) : (
          <DataTable<AdditionalService>
            columns={serviceColumns}
            data={services}
            getRowKey={(row) => row.id}
            size="sm"
            className={styles.fullWidthTable}
            emptyMessage={t('equipmentServices.noServices')}
          />
        )}
      </Card>

      {/* Create / Edit Drawer */}
      <Drawer
        isOpen={modalOpen}
        onClose={closeModal}
        position="right"
        size="xl"
        title={editingId ? t('equipmentServices.editAddon') : t('equipmentServices.newAddon')}
        icon={editingId ? <EditIcon size={20} /> : <PlusIcon size={20} />}
        overlay
        footer={
          <Stack direction="horizontal" spacing="var(--ds-size-2)">
            <Button
              type="button"
              variant="secondary"
              className={styles.drawerButton}
              onClick={closeModal}
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              className={styles.drawerButton}
              disabled={submitting}
              onClick={() => formRef.current?.requestSubmit()}
            >
              {submitting ? <Spinner aria-label={t('common.loading')} data-size="sm" /> : t('common.save')}
            </Button>
          </Stack>
        }
      >
        {renderModalForm()}
      </Drawer>

      {/* Create / Edit Service Drawer */}
      <Drawer
        isOpen={serviceModalOpen}
        onClose={closeServiceModal}
        position="right"
        size="xl"
        title={editingServiceId ? t('equipmentServices.editService') : t('equipmentServices.newService')}
        icon={editingServiceId ? <EditIcon size={20} /> : <PlusIcon size={20} />}
        overlay
        footer={
          <Stack direction="horizontal" spacing="var(--ds-size-2)">
            <Button
              type="button"
              variant="secondary"
              className={styles.drawerButton}
              onClick={closeServiceModal}
              disabled={serviceSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              className={styles.drawerButton}
              disabled={serviceSubmitting}
              onClick={() => serviceFormRef.current?.requestSubmit()}
            >
              {serviceSubmitting ? <Spinner aria-label={t('common.loading')} data-size="sm" /> : t('common.save')}
            </Button>
          </Stack>
        }
      >
        <form
          ref={(el) => {
            serviceFormRef.current = el;
          }}
          onSubmit={handleSubmitService}
        >
          <DrawerSection
            title={t('equipmentServices.serviceDetails')}
            description={
              editingServiceId ? t('equipmentServices.editServiceDesc') : t('equipmentServices.newServiceDesc')
            }
          >
            <Stack spacing="var(--ds-size-3)">
              <Textfield
                label={t('common.name')}
                value={serviceForm.name}
                onChange={(e) => setServiceForm((p) => ({ ...p, name: e.target.value }))}
                required
                data-size="sm"
                placeholder={t('equipmentServices.serviceNamePlaceholder')}
              />
              <Textfield
                label={t('common.description')}
                value={serviceForm.description}
                onChange={(e) => setServiceForm((p) => ({ ...p, description: e.target.value }))}
                data-size="sm"
                placeholder={t('equipmentServices.serviceDescPlaceholder')}
              />
            </Stack>
          </DrawerSection>
          <DrawerSection title={t('equipmentServices.pricingSection')} collapsible>
            <Stack spacing="var(--ds-size-3)">
              <Textfield
                label={t('pricing.amount')}
                type="number"
                value={serviceForm.price}
                onChange={(e) => setServiceForm((p) => ({ ...p, price: e.target.value }))}
                required
                data-size="sm"
                placeholder="500"
              />
              <Stack spacing="var(--ds-size-1)">
                <Paragraph data-size="sm" className={styles.formLabel}>
                  {t('equipmentServices.currency')}
                </Paragraph>
                <PillDropdown
                  label={serviceForm.currency}
                  value={serviceForm.currency}
                  onChange={(val) => setServiceForm((p) => ({ ...p, currency: val }))}
                  options={[
                    { value: 'NOK', label: 'NOK' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'USD', label: 'USD' },
                  ]}
                  ariaLabel={t('equipmentServices.currency')}
                />
              </Stack>
            </Stack>
          </DrawerSection>
          <DrawerSection title={t('equipmentServices.settingsSection')} collapsible defaultCollapsed>
            <Stack spacing="var(--ds-size-3)">
              <SettingsToggle
                label={t('equipmentServices.serviceRequired')}
                description={t('equipmentServices.serviceRequiredDesc')}
                checked={serviceForm.isRequired}
                onChange={(checked) => setServiceForm((p) => ({ ...p, isRequired: checked }))}
              />
              <Textfield
                label={t('equipmentServices.displayOrder')}
                type="number"
                value={serviceForm.displayOrder}
                onChange={(e) => setServiceForm((p) => ({ ...p, displayOrder: e.target.value }))}
                data-size="sm"
                placeholder="1"
              />
            </Stack>
          </DrawerSection>
        </form>
      </Drawer>
    </PageContentLayout>
  );
}
