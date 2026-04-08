/**
 * FAQPage — Web App
 *
 * Categorized FAQ page with expandable questions.
 * - Filterable by category (Tickets, Payment, Account, Events, General)
 * - Searchable with text filter
 * - Links to support form on Minside for further help
 */

import { useState, useMemo } from 'react';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Textfield,
  Stack,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { env } from '@digilist-saas/app-shell';
import s from './faq.module.css';

// ---------------------------------------------------------------------------
// FAQ Data Structure
// ---------------------------------------------------------------------------

interface FAQItem {
  questionKey: string;
  answerKey: string;
}

interface FAQCategory {
  id: string;
  labelKey: string;
  items: FAQItem[];
}

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    id: 'tickets',
    labelKey: 'faq.categoryTickets',
    items: [
      { questionKey: 'faq.ticketsQ1', answerKey: 'faq.ticketsA1' },
      { questionKey: 'faq.ticketsQ2', answerKey: 'faq.ticketsA2' },
      { questionKey: 'faq.ticketsQ3', answerKey: 'faq.ticketsA3' },
      { questionKey: 'faq.ticketsQ4', answerKey: 'faq.ticketsA4' },
    ],
  },
  {
    id: 'payment',
    labelKey: 'faq.categoryPayment',
    items: [
      { questionKey: 'faq.paymentQ1', answerKey: 'faq.paymentA1' },
      { questionKey: 'faq.paymentQ2', answerKey: 'faq.paymentA2' },
      { questionKey: 'faq.paymentQ3', answerKey: 'faq.paymentA3' },
    ],
  },
  {
    id: 'account',
    labelKey: 'faq.categoryAccount',
    items: [
      { questionKey: 'faq.accountQ1', answerKey: 'faq.accountA1' },
      { questionKey: 'faq.accountQ2', answerKey: 'faq.accountA2' },
    ],
  },
  {
    id: 'events',
    labelKey: 'faq.categoryEvents',
    items: [
      { questionKey: 'faq.eventsQ1', answerKey: 'faq.eventsA1' },
      { questionKey: 'faq.eventsQ2', answerKey: 'faq.eventsA2' },
    ],
  },
  {
    id: 'general',
    labelKey: 'faq.categoryGeneral',
    items: [
      { questionKey: 'faq.generalQ1', answerKey: 'faq.generalA1' },
      { questionKey: 'faq.generalQ2', answerKey: 'faq.generalA2' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FAQPage() {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Resolve FAQ data via t()
  const resolvedCategories = useMemo(() => {
    return FAQ_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: t(cat.labelKey),
      items: cat.items.map((item) => ({
        id: `${cat.id}-${item.questionKey}`,
        question: t(item.questionKey),
        answer: t(item.answerKey),
      })),
    }));
  }, [t]);

  // Filter by category and search
  const filteredCategories = useMemo(() => {
    let cats = resolvedCategories;

    // Filter by category
    if (activeCategory) {
      cats = cats.filter((cat) => cat.id === activeCategory);
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      cats = cats
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.question.toLowerCase().includes(q) ||
              item.answer.toLowerCase().includes(q)
          ),
        }))
        .filter((cat) => cat.items.length > 0);
    }

    return cats;
  }, [resolvedCategories, activeCategory, searchQuery]);

  const toggleFaq = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const minsideUrl = env.minsideUrl;

  return (
    <div className={s.pageContainer}>
      {/* Header */}
      <Stack direction="vertical" spacing="var(--ds-size-3)" className={s.headerSection}>
        <Heading level={1} data-size="lg" className={s.title}>
          {t('faq.title')}
        </Heading>
        <Paragraph data-size="md" className={s.subtitle}>
          {t('faq.subtitle')}
        </Paragraph>
      </Stack>

      {/* Search */}
      <Card className={s.searchCard}>
        <Textfield
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('faq.searchPlaceholder')}
          aria-label={t('faq.searchPlaceholder')}
          className={s.searchInput}
        />
      </Card>

      {/* Category filter */}
      <Stack
        direction="horizontal"
        spacing="var(--ds-size-2)"
        className={s.categoryBar}
      >
        <Button
          type="button"
          variant={activeCategory === null ? 'primary' : 'secondary'}
          data-size="sm"
          onClick={() => setActiveCategory(null)}
        >
          {t('faq.allCategories')}
        </Button>
        {FAQ_CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            type="button"
            variant={activeCategory === cat.id ? 'primary' : 'secondary'}
            data-size="sm"
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
          >
            {t(cat.labelKey)}
          </Button>
        ))}
      </Stack>

      {/* FAQ Sections */}
      <Stack direction="vertical" spacing="var(--ds-size-4)">
        {filteredCategories.length === 0 ? (
          <div className={s.noResults}>
            <Paragraph className={s.noResultsText}>
              {t('faq.noResults')}
            </Paragraph>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <Card key={category.id} className={s.faqCard}>
              <Heading level={2} data-size="sm" className={s.faqSectionTitle}>
                {category.label}
              </Heading>
              <Stack direction="vertical" spacing="var(--ds-size-2)">
                {category.items.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <div key={item.id}>
                      <Button
                        type="button"
                        variant="tertiary"
                        onClick={() => toggleFaq(item.id)}
                        className={
                          isExpanded ? s.faqButtonExpanded : s.faqButtonCollapsed
                        }
                        aria-expanded={isExpanded}
                      >
                        <Stack
                          direction="horizontal"
                          justify="between"
                          align="center"
                          className={s.fullWidth}
                        >
                          <Paragraph data-size="sm" className={s.faqQuestion}>
                            {item.question}
                          </Paragraph>
                          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                        </Stack>
                      </Button>
                      {isExpanded && (
                        <div className={s.faqAnswer}>
                          <Paragraph data-size="sm" className={s.faqAnswerText}>
                            {item.answer}
                          </Paragraph>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Stack>
            </Card>
          ))
        )}
      </Stack>

      {/* Contact prompt */}
      <Card className={s.contactCard}>
        <Stack direction="vertical" spacing="var(--ds-size-3)" align="center">
          <Paragraph data-size="md" className={s.contactText}>
            {t('faq.contactPrompt')}
          </Paragraph>
          <Button
            type="button"
            variant="primary"
            data-size="md"
            onClick={() => {
              if (minsideUrl) {
                window.location.href = `${minsideUrl}/support`;
              }
            }}
          >
            {t('faq.contactLink')}
          </Button>
        </Stack>
      </Card>
    </div>
  );
}
