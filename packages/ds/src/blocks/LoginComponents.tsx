/**
 * Login Components
 *
 * Reusable components for authentication pages including
 * SSO provider buttons, feature items, and layout components.
 */
import * as React from 'react';
import { Button, Heading, Paragraph } from '@digdir/designsystemet-react';
import { cn } from '../utils';
import styles from './LoginComponents.module.css';

// =============================================================================
// LoginOption - SSO Provider Button
// =============================================================================

export interface LoginOptionProps {
  /** Icon element (typically an auth provider icon) */
  icon: React.ReactNode;
  /** Provider title (e.g., "ID-porten", "Microsoft") */
  title: string;
  /** Provider description (e.g., "Personlig innlogging med BankID") */
  description: string;
  /** Click handler for login action */
  onClick: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

export function LoginOption({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  className,
}: LoginOptionProps): React.ReactElement {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      className={cn(styles.loginOption, className)}
    >
      <div className={styles.loginOptionIcon}>{icon}</div>
      <div>
        <div className={styles.loginOptionTitle}>{title}</div>
        <div className={styles.loginOptionDescription}>{description}</div>
      </div>
    </Button>
  );
}

// =============================================================================
// FeatureItem - Marketing Feature Display
// =============================================================================

export interface FeatureItemProps {
  /** Icon element */
  icon: React.ReactNode;
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
  /** Text color variant */
  variant?: 'light' | 'dark';
  /** Custom class name */
  className?: string;
}

export function FeatureItem({
  icon,
  title,
  description,
  variant = 'light',
  className,
}: FeatureItemProps): React.ReactElement {
  const isLight = variant === 'light';
  return (
    <div className={cn(styles.featureItem, className)}>
      <div className={cn(styles.featureItemIcon, isLight ? styles.featureItemIconLight : styles.featureItemIconDark)}>
        {icon}
      </div>
      <div>
        <Paragraph
          data-size="sm"
          className={cn(styles.featureItemTitle, isLight ? styles.featureItemTitleLight : styles.featureItemTitleDark)}
        >
          {title}
        </Paragraph>
        <Paragraph
          data-size="xs"
          className={cn(styles.featureItemDescription, styles.featureItemDescriptionSize, isLight ? styles.featureItemDescriptionLight : styles.featureItemDescriptionDark)}
        >
          {description}
        </Paragraph>
      </div>
    </div>
  );
}

// =============================================================================
// IntegrationBadge - Integration/Certification Pills
// =============================================================================

export interface IntegrationBadgeProps {
  /** Integration/certification name */
  label: string;
  /** Badge variant */
  variant?: 'light' | 'dark';
  /** Custom class name */
  className?: string;
}

export function IntegrationBadge({
  label,
  variant = 'light',
  className,
}: IntegrationBadgeProps): React.ReactElement {
  const isLight = variant === 'light';
  return (
    <span
      className={cn(styles.integrationBadge, isLight ? styles.integrationBadgeLight : styles.integrationBadgeDark, className)}
    >
      {label}
    </span>
  );
}

// =============================================================================
// LoginFooterLink - Footer Navigation Link
// =============================================================================

export interface LoginFooterLinkProps {
  /** Link URL */
  href: string;
  /** Link text */
  children: React.ReactNode;
  /** Open in new tab */
  external?: boolean;
  /** Custom class name */
  className?: string;
}

export function LoginFooterLink({
  href,
  children,
  external = true,
  className,
}: LoginFooterLinkProps): React.ReactElement {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={cn(styles.loginFooterLink, className)}
    >
      {children}
    </a>
  );
}

// =============================================================================
// DemoLoginGrid - Grid of demo user login cards
// =============================================================================

export interface DemoUser {
  /** Unique key for the demo user */
  key: string;
  /** Display name */
  name: string;
  /** Role label */
  role: string;
  /** Avatar initials (1-2 chars) */
  initials: string;
  /** Avatar background color (CSS value) */
  color: string;
}

export interface DemoLoginGridProps {
  /** Demo users to display */
  users: DemoUser[];
  /** Called when a demo user card is clicked */
  onSelect: (key: string) => void;
  /** Custom class name */
  className?: string;
}

export function DemoLoginGrid({
  users,
  onSelect,
  className,
}: DemoLoginGridProps): React.ReactElement {
  return (
    <div className={cn(styles.demoGrid, className)}>
      {users.map((user) => (
        <button
          key={user.key}
          type="button"
          className={styles.demoCard}
          style={{ '--demo-card-color': user.color } as React.CSSProperties}
          onClick={() => onSelect(user.key)}
        >
          <div className={styles.demoAvatar} style={{ background: user.color }}>
            {user.initials}
          </div>
          <div className={styles.demoInfo}>
            <div className={styles.demoName}>{user.name}</div>
            <div className={styles.demoRole}>{user.role}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// LoginDivider - "or" divider between login options
// =============================================================================

export interface LoginDividerProps {
  /** Text to display in the center (default: "eller") */
  text?: string;
  /** Custom class name */
  className?: string;
}

export function LoginDivider({ text = 'eller', className }: LoginDividerProps): React.ReactElement {
  return (
    <div className={cn(styles.loginDivider, className)} role="presentation">
      <div className={styles.loginDividerLine} />
      <span>{text}</span>
      <div className={styles.loginDividerLine} />
    </div>
  );
}

// =============================================================================
// LoginLayout - Split-Screen Login Layout
// =============================================================================

export interface LoginLayoutProps {
  /** Logo element */
  logo?: React.ReactNode;
  /** Brand name */
  brandName?: string;
  /** Brand tagline */
  brandTagline?: string;
  /** URL to navigate to when clicking the logo */
  logoHref?: string;
  /** Login form title */
  title?: string;
  /** Login form subtitle */
  subtitle?: string;
  /** Login options/buttons */
  children: React.ReactNode;
  /** Right panel title */
  panelTitle?: string;
  /** Right panel subtitle */
  panelSubtitle?: string;
  /** Right panel description */
  panelDescription?: string;
  /** Feature items for right panel */
  features?: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
  }>;
  /** Integration/certification badges */
  integrations?: string[];
  /** Footer links */
  footerLinks?: Array<{
    href: string;
    label: string;
  }>;
  /** Copyright text */
  copyright?: string;
  /** Label for integrations section */
  integrationsLabel?: string;
  /** Custom class name */
  className?: string;
}

export function LoginLayout({
  logo,
  brandName = 'Xala Foundation',
  brandTagline = 'Simple SAAS',
  logoHref,
  title = 'Logg inn',
  subtitle = 'Velg innloggingsmetode for å fortsette.',
  children,
  panelTitle = 'Backoffice',
  panelSubtitle = 'En helhetlig bookingløsning',
  panelDescription,
  features = [],
  integrations = [],
  footerLinks = [],
  copyright = `© ${new Date().getFullYear()}. Alle rettigheter reservert.`,
  integrationsLabel = 'Integrasjoner & Sertifiseringer',
  className,
}: LoginLayoutProps): React.ReactElement {
  return (
    <div className={cn(styles.loginLayout, className)}>
      {/* Left side - Login form */}
      <div className={styles.loginLeft}>
        <div className={styles.loginMain}>
          <div className={styles.loginBrandWrap}>
            {logoHref ? (
              <a href={logoHref} className={styles.loginLogoLink}>
                {logo || (
                  <img src="/logo.svg" alt={brandName} className={styles.loginLogoImg} />
                )}
                <div>
                  <div className={styles.loginBrandName}>{brandName}</div>
                  <div className={styles.loginBrandTagline}>{brandTagline}</div>
                </div>
              </a>
            ) : (
              <div className={styles.loginLogoWrap}>
                {logo || (
                  <img src="/logo.svg" alt={brandName} className={styles.loginLogoImg} />
                )}
                <div>
                  <div className={styles.loginBrandName}>{brandName}</div>
                  <div className={styles.loginBrandTagline}>{brandTagline}</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Heading level={1} data-size="xl" className={styles.loginHeading}>
              {title}
            </Heading>
            <Paragraph data-size="md" className={styles.loginSubtitle}>
              {subtitle}
            </Paragraph>
            <div className={styles.loginOptions}>
              {children}
            </div>
          </div>
        </div>

        {(footerLinks.length > 0 || copyright) && (
          <div className={styles.loginFooter}>
            {footerLinks.length > 0 && (
              <div className={styles.loginFooterLinks}>
                {footerLinks.map((link, index) => (
                  <React.Fragment key={link.href}>
                    {index > 0 && <span className={styles.loginFooterSeparator}>·</span>}
                    <LoginFooterLink href={link.href}>{link.label}</LoginFooterLink>
                  </React.Fragment>
                ))}
              </div>
            )}
            {copyright && (
              <Paragraph data-size="xs" className={styles.loginCopyright}>
                {copyright}
              </Paragraph>
            )}
          </div>
        )}
      </div>

      <div className={styles.loginRight}>
        <div className={styles.loginRightInner}>
          <div className={styles.loginPanelHeader}>
            <Paragraph data-size="xs" className={styles.loginPanelEyebrow}>
              {panelTitle}
            </Paragraph>
            <Heading level={2} data-size="2xl" className={styles.loginPanelTitle}>
              {panelSubtitle}
            </Heading>
            {panelDescription && (
              <Paragraph data-size="md" className={styles.loginPanelDescription}>
                {panelDescription}
              </Paragraph>
            )}
          </div>

          {features.length > 0 && (
            <div className={styles.loginFeatures}>
              {features.map((feature) => (
                <FeatureItem
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  variant="light"
                />
              ))}
            </div>
          )}

          {integrations.length > 0 && (
            <div>
              <Paragraph data-size="xs" className={styles.loginIntegrationsLabel}>
                {integrationsLabel}
              </Paragraph>
              <div className={styles.loginIntegrationsWrap}>
                {integrations.map((integration) => (
                  <IntegrationBadge key={integration} label={integration} variant="light" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginLayout;
