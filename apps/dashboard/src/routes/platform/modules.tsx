/**
 * Modules Page — SaaS Admin
 *
 * Component registry showing all platform modules with status.
 * Grid layout with module cards, status badges, and version info.
 */

import {
  Card,
  Heading,
  Paragraph,
  Tag,
  Grid,
  Stack,
  DashboardPageHeader,
  PageContentLayout,
  useIsMobile,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import styles from './modules.module.css';

interface ModuleInfo {
  id: string;
  name: string;
  category: 'platform' | 'domain';
  status: 'active' | 'disabled';
  version: string;
  tables: number;
  exports: number;
}

// Real component data from the architecture
const MODULES: ModuleInfo[] = [
  // Platform Layer
  { id: 'auth', name: 'Auth', category: 'platform', status: 'active', version: '1.0.0', tables: 4, exports: 18 },
  { id: 'rbac', name: 'RBAC', category: 'platform', status: 'active', version: '1.0.0', tables: 2, exports: 12 },
  { id: 'audit', name: 'Audit', category: 'platform', status: 'active', version: '1.0.0', tables: 1, exports: 8 },
  { id: 'compliance', name: 'Compliance', category: 'platform', status: 'active', version: '1.0.0', tables: 3, exports: 14 },
  { id: 'tenant-config', name: 'Tenant Config', category: 'platform', status: 'active', version: '1.0.0', tables: 3, exports: 16 },
  { id: 'notifications', name: 'Notifications', category: 'platform', status: 'active', version: '1.0.0', tables: 4, exports: 22 },
  { id: 'user-prefs', name: 'User Prefs', category: 'platform', status: 'active', version: '1.0.0', tables: 2, exports: 8 },
  { id: 'integrations', name: 'Integrations', category: 'platform', status: 'active', version: '1.0.0', tables: 3, exports: 18 },
  { id: 'guides', name: 'Guides', category: 'platform', status: 'active', version: '1.0.0', tables: 4, exports: 16 },
  { id: 'support', name: 'Support', category: 'platform', status: 'active', version: '1.0.0', tables: 2, exports: 12 },
  // Domain Layer
  { id: 'resources', name: 'Resources', category: 'domain', status: 'active', version: '1.0.0', tables: 1, exports: 24 },
  { id: 'bookings', name: 'Bookings', category: 'domain', status: 'active', version: '1.0.0', tables: 5, exports: 32 },
  { id: 'ticketing', name: 'Ticketing', category: 'domain', status: 'active', version: '1.0.0', tables: 6, exports: 38 },
  { id: 'pricing', name: 'Pricing', category: 'domain', status: 'active', version: '1.0.0', tables: 5, exports: 28 },
  { id: 'billing', name: 'Billing', category: 'domain', status: 'active', version: '1.0.0', tables: 4, exports: 22 },
  { id: 'giftcards', name: 'Gift Cards', category: 'domain', status: 'active', version: '1.0.0', tables: 4, exports: 18 },
  { id: 'subscriptions', name: 'Subscriptions', category: 'domain', status: 'active', version: '1.0.0', tables: 3, exports: 16 },
  { id: 'resale', name: 'Resale', category: 'domain', status: 'active', version: '1.0.0', tables: 4, exports: 20 },
  { id: 'reviews', name: 'Reviews', category: 'domain', status: 'active', version: '1.0.0', tables: 2, exports: 14 },
  { id: 'catalog', name: 'Catalog', category: 'domain', status: 'active', version: '1.0.0', tables: 4, exports: 18 },
  { id: 'seasons', name: 'Seasons', category: 'domain', status: 'active', version: '1.0.0', tables: 4, exports: 22 },
  { id: 'addons', name: 'Addons', category: 'domain', status: 'active', version: '1.0.0', tables: 3, exports: 14 },
  { id: 'analytics', name: 'Analytics', category: 'domain', status: 'active', version: '1.0.0', tables: 4, exports: 18 },
  { id: 'messaging', name: 'Messaging', category: 'domain', status: 'active', version: '1.0.0', tables: 3, exports: 16 },
];

import { useQuery, useMutation } from 'convex/react';
import { api } from '@digilist-saas/sdk';
import { SettingsToggle } from '@digilist-saas/ds/blocks';

export function ModulesPage() {
  const t = useT();
  const isMobile = useIsMobile();

  // Platform-level feature flags
  const catalog = useQuery(api.modules.index.catalog);
  const platformConfig = useQuery(api.ops.platformConfig.get);
  const setFeatureFlag = useMutation(api.ops.platformConfig.setFeatureFlag);

  const platformModules = MODULES.filter((m) => m.category === 'platform');
  const domainModules = MODULES.filter((m) => m.category === 'domain');
  const activeCount = MODULES.filter((m) => m.status === 'active').length;
  const totalTables = MODULES.reduce((sum, m) => sum + m.tables, 0);
  const totalExports = MODULES.reduce((sum, m) => sum + m.exports, 0);

  const handleTogglePlatformFlag = async (moduleId: string, enabled: boolean) => {
    try {
      await setFeatureFlag({ moduleId, enabled });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PageContentLayout>
      <DashboardPageHeader
        subtitle={t('saasAdmin.modulesPage.subtitle')}
        actions={
          <Stack direction="horizontal" spacing="var(--ds-size-4)">
            <Tag data-size="sm" data-color="success">
              {t('saasAdmin.modulesPage.activeCount', { count: activeCount })}
            </Tag>
            <Tag data-size="sm" data-color="neutral">
              {t('saasAdmin.modulesPage.tableCount', { count: totalTables })}
            </Tag>
            <Tag data-size="sm" data-color="neutral">
              {t('saasAdmin.modulesPage.exportCount', { count: totalExports })}
            </Tag>
          </Stack>
        }
      />

      {/* Platform Defaults (Global Feature Flags) */}
      <Stack direction="vertical" spacing="var(--ds-size-3)">
        <Heading level={2} data-size="sm">
          Platform Defaults (Global Feature Flags)
        </Heading>
        <Paragraph data-size="sm" data-color="subtle">
          Toggle features on or off globally across all tenants. If a feature is disabled here, it overrides any tenant-specific settings.
        </Paragraph>
        <Card data-color="neutral">
          <Stack direction="vertical" spacing="0">
            {catalog === undefined || platformConfig === undefined ? (
              <Paragraph data-size="sm">Loading...</Paragraph>
            ) : catalog.length === 0 ? (
              <Paragraph data-size="sm">No platform modules currently registered.</Paragraph>
            ) : (
              catalog.map((mod, index) => {
                const isEnabledGlobally = platformConfig.featureFlags?.[mod.id] !== false;
                return (
                  <div
                    key={mod.id}
                    style={{
                      padding: 'var(--ds-size-3) 0',
                      borderBottom: index < catalog.length - 1 ? '1px solid var(--ds-border-subtle)' : 'none',
                    }}
                  >
                    <SettingsToggle
                      label={`${mod.name} ${mod.isCore ? '(Core)' : ''}`}
                      description={mod.description}
                      checked={isEnabledGlobally}
                      onChange={(checked) => handleTogglePlatformFlag(mod.id, checked)}
                    />
                  </div>
                );
              })
            )}
          </Stack>
        </Card>
      </Stack>

      {/* Platform Layer */}
      <Stack direction="vertical" spacing="var(--ds-size-3)" style={{ marginTop: 'var(--ds-size-8)' }}>
        <Heading level={2} data-size="sm">
          {t('saasAdmin.modulesPage.platformLayer')}
        </Heading>
        <Grid columns={isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))'} gap="var(--ds-size-3)">
          {platformModules.map((mod) => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </Grid>
      </Stack>

      {/* Domain Layer */}
      <Stack direction="vertical" spacing="var(--ds-size-3)" style={{ marginTop: 'var(--ds-size-6)' }}>
        <Heading level={2} data-size="sm">
          {t('saasAdmin.modulesPage.domainLayer')}
        </Heading>
        <Grid columns={isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))'} gap="var(--ds-size-3)">
          {domainModules.map((mod) => (
            <ModuleCard key={mod.id} module={mod} />
          ))}
        </Grid>
      </Stack>
    </PageContentLayout>
  );
}

function ModuleCard({ module }: { module: ModuleInfo }) {
  const t = useT();

  return (
    <Card data-color="neutral" className={styles.moduleCard}>
      <Stack direction="vertical" spacing="var(--ds-size-3)">
        <Stack direction="horizontal" justify="between" align="center">
          <Heading data-size="xs" style={{ margin: 0 }}>
            {module.name}
          </Heading>
          <Tag
            data-size="sm"
            data-color={module.status === 'active' ? 'success' : 'neutral'}
          >
            {module.status === 'active' ? t('saasAdmin.modules.active') : t('saasAdmin.modules.disabled')}
          </Tag>
        </Stack>
        <Stack direction="horizontal" spacing="var(--ds-size-3)">
          <Paragraph data-size="xs" data-color="subtle">
            {t('saasAdmin.modules.version', { version: module.version })}
          </Paragraph>
          <Paragraph data-size="xs" data-color="subtle">
            {t('saasAdmin.modulesPage.tables', { count: module.tables })}
          </Paragraph>
          <Paragraph data-size="xs" data-color="subtle">
            {t('saasAdmin.modulesPage.exports', { count: module.exports })}
          </Paragraph>
        </Stack>
      </Stack>
    </Card>
  );
}
