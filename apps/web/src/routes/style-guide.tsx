/**
 * StyleGuidePage — showcases the DigiPicks design system tokens.
 * Public route at /style-guide, rendered inside MainLayout.
 */

import { Button, Card, Container, Heading, Paragraph, Stack } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import s from './style-guide.module.css';

// ---------------------------------------------------------------------------
// Token groups
// ---------------------------------------------------------------------------

const ACCENT_TOKENS = [
  '--ds-color-accent-base-default',
  '--ds-color-accent-base-hover',
  '--ds-color-accent-base-active',
  '--ds-color-accent-base-contrast-default',
  '--ds-color-accent-text-default',
  '--ds-color-accent-border-default',
];

const NEUTRAL_TOKENS = [
  '--ds-color-neutral-background-default',
  '--ds-color-neutral-background-tinted',
  '--ds-color-neutral-surface-default',
  '--ds-color-neutral-surface-tinted',
  '--ds-color-neutral-text-default',
  '--ds-color-neutral-text-subtle',
  '--ds-color-neutral-border-default',
  '--ds-color-neutral-border-strong',
];

const BRAND2_TOKENS = [
  '--ds-color-brand2-base-default',
  '--ds-color-brand2-text-default',
  '--ds-color-brand2-border-default',
];

const STATUS_TOKENS = [
  '--ds-color-success-base-default',
  '--ds-color-warning-base-default',
  '--ds-color-danger-base-default',
  '--ds-color-info-base-default',
];

const HEADING_SIZES = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl'] as const;
const PARAGRAPH_SIZES = ['xs', 'sm', 'md', 'lg'] as const;

const SPACING_TOKENS = Array.from({ length: 12 }, (_, i) => `--ds-size-${i + 1}`);

// ---------------------------------------------------------------------------
// Runtime computed-style reader
// ---------------------------------------------------------------------------

function useCssVars(tokens: string[]): Record<string, string> {
  // Read on every render so token edits via Vite HMR show up immediately.
  // Cheap: <50 string lookups per render.
  if (typeof window === 'undefined') return {};
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const t of tokens) {
    out[t] = cs.getPropertyValue(t).trim();
  }
  return out;
}

// ---------------------------------------------------------------------------
// Swatch grid
// ---------------------------------------------------------------------------

function SwatchGrid({ tokens }: { tokens: string[] }) {
  const values = useCssVars(tokens);
  return (
    <div className={s.swatchGrid}>
      {tokens.map((token) => (
        <div key={token} className={s.swatchCard}>
          <div className={s.swatch} style={{ background: `var(${token})` }} />
          <div className={s.swatchMeta}>
            <span className={s.tokenName}>{token}</span>
            <span className={s.tokenValue}>{values[token] || '—'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function StyleGuidePage() {
  const t = useT();
  const spacingValues = useCssVars(SPACING_TOKENS);

  return (
    <main className={s.page}>
      <Container className={s.container}>
        {/* 1. Header */}
        <header className={s.header}>
          <Heading data-size="2xl">{t('styleGuide.title', 'Design System')}</Heading>
          <Paragraph data-size="lg">{t('styleGuide.subtitle', 'DigiPicks — colors, type, components')}</Paragraph>
        </header>

        {/* 2. Color palette */}
        <section className={s.section}>
          <div className={s.sectionHeader}>
            <Heading data-size="lg">{t('styleGuide.colors', 'Color palette')}</Heading>
            <Paragraph data-size="sm">{t('styleGuide.colorsHint', 'Values read live from computed styles.')}</Paragraph>
          </div>

          <Heading data-size="sm">Accent</Heading>
          <SwatchGrid tokens={ACCENT_TOKENS} />

          <Heading data-size="sm">Neutral</Heading>
          <SwatchGrid tokens={NEUTRAL_TOKENS} />

          <Heading data-size="sm">Brand 2 (Purple)</Heading>
          <SwatchGrid tokens={BRAND2_TOKENS} />

          <Heading data-size="sm">Status</Heading>
          <SwatchGrid tokens={STATUS_TOKENS} />
        </section>

        {/* 3. Gradients */}
        <section className={s.section}>
          <Heading data-size="lg">{t('styleGuide.gradients', 'Gradients')}</Heading>
          <div className={s.gradientGrid}>
            <div className={s.gradientCard}>
              <div className={`${s.gradientSwatch} ${s.gradientPrimary}`} />
              <Paragraph data-size="sm">Primary</Paragraph>
              <span className={s.tokenName}>--ds-gradient-primary</span>
            </div>
            <div className={s.gradientCard}>
              <div className={`${s.gradientSwatch} ${s.gradientHero}`} />
              <Paragraph data-size="sm">Hero</Paragraph>
              <span className={s.tokenName}>--ds-gradient-hero</span>
            </div>
            <div className={s.gradientCard}>
              <div className={`${s.gradientSwatch} ${s.gradientCardHover}`} />
              <Paragraph data-size="sm">Card hover</Paragraph>
              <span className={s.tokenName}>--ds-gradient-card-hover</span>
            </div>
          </div>
        </section>

        {/* 4. Typography */}
        <section className={s.section}>
          <Heading data-size="lg">{t('styleGuide.typography', 'Typography')}</Heading>
          <div className={s.typeStack}>
            {HEADING_SIZES.map((sz) => (
              <div key={`h-${sz}`} className={s.typeRow}>
                <Heading data-size={sz}>Heading {sz}</Heading>
                <span className={s.tokenName}>data-size="{sz}"</span>
              </div>
            ))}
            {PARAGRAPH_SIZES.map((sz) => (
              <div key={`p-${sz}`} className={s.typeRow}>
                <Paragraph data-size={sz}>Paragraph {sz} — the quick brown fox jumps over the lazy dog.</Paragraph>
                <span className={s.tokenName}>data-size="{sz}"</span>
              </div>
            ))}
            <div className={s.typeRow}>
              <div className={s.mono}>const picks = await api.getPicks();</div>
              <span className={s.tokenName}>--ds-font-family-mono</span>
            </div>
          </div>
        </section>

        {/* 5. Buttons */}
        <section className={s.section}>
          <Heading data-size="lg">{t('styleGuide.buttons', 'Buttons')}</Heading>
          <div className={s.buttonGrid}>
            <Button data-size="sm" data-color="accent">
              Primary sm
            </Button>
            <Button data-size="md" data-color="accent">
              Primary md
            </Button>
            <Button data-size="lg" data-color="accent">
              Primary lg
            </Button>
            <Button data-size="md" data-color="accent" variant="secondary">
              Secondary
            </Button>
            <Button data-size="md" data-color="accent" variant="tertiary">
              Tertiary
            </Button>
            <Button data-size="md" data-color="accent" className={s.glowButton}>
              Glow
            </Button>
          </div>
        </section>

        {/* 6. Cards */}
        <section className={s.section}>
          <Heading data-size="lg">{t('styleGuide.cards', 'Cards')}</Heading>
          <div className={s.cardGrid}>
            <div className={s.demoCard}>
              <Heading data-size="sm">Default</Heading>
              <Paragraph data-size="sm">Base surface with subtle border.</Paragraph>
            </div>
            <div className={`${s.demoCard} ${s.demoCardMd}`}>
              <Heading data-size="sm">Elevated</Heading>
              <Paragraph data-size="sm">With --ds-shadow-md for depth.</Paragraph>
            </div>
            <div className={`${s.demoCard} ${s.demoCardGlow}`}>
              <Heading data-size="sm">Glow</Heading>
              <Paragraph data-size="sm">Hover to lift. Uses accent glow.</Paragraph>
            </div>
          </div>
        </section>

        {/* 7. Spacing */}
        <section className={s.section}>
          <Heading data-size="lg">{t('styleGuide.spacing', 'Spacing')}</Heading>
          <div className={s.spacingStack}>
            {SPACING_TOKENS.map((token) => (
              <div key={token} className={s.spacingRow}>
                <span className={s.spacingLabel}>
                  {token} · {spacingValues[token] || '—'}
                </span>
                <div className={s.spacingBar} style={{ width: `var(${token})` }} />
              </div>
            ))}
          </div>
        </section>

        {/* 8. Shadows */}
        <section className={s.section}>
          <Heading data-size="lg">{t('styleGuide.shadows', 'Shadows')}</Heading>
          <div className={s.shadowGrid}>
            <div className={`${s.shadowCard} ${s.shadowSm}`}>
              <Paragraph data-size="sm">sm</Paragraph>
              <span className={s.tokenName}>--ds-shadow-sm</span>
            </div>
            <div className={`${s.shadowCard} ${s.shadowMd}`}>
              <Paragraph data-size="sm">md</Paragraph>
              <span className={s.tokenName}>--ds-shadow-md</span>
            </div>
            <div className={`${s.shadowCard} ${s.shadowLg}`}>
              <Paragraph data-size="sm">lg</Paragraph>
              <span className={s.tokenName}>--ds-shadow-lg</span>
            </div>
            <div className={`${s.shadowCard} ${s.shadowXl}`}>
              <Paragraph data-size="sm">xl</Paragraph>
              <span className={s.tokenName}>--ds-shadow-xl</span>
            </div>
          </div>
        </section>
      </Container>
    </main>
  );
}

export default StyleGuidePage;
