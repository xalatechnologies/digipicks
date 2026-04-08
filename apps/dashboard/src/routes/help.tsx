/**
 * HelpPage
 *
 * User portal help and support page
 * - FAQ sections with expandable answers
 * - Quick link topic cards
 * - Contact support form
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Textfield,
  Textarea,
  Stack,
  Grid,
  FormField,
  IconBox,
  CalendarIcon,
  CreditCardIcon,
  UsersIcon,
  BuildingIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  useToast,
  useIsMobile,
  DashboardPageHeader,
  PageContentLayout,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useAuth, useTenantContext } from '@digilist-saas/app-shell';
import { useCreateSupportTicket } from '@digilist-saas/sdk';
import type { Id } from '@digilist-saas/sdk';
import s from './Help.module.css';

// FAQ section keys — labels resolved inside the component via t()
const FAQ_SECTION_KEYS = [
  {
    titleKey: 'help.faqBookingTitle',
    items: [
      { questionKey: 'help.faqBookingQ1', answerKey: 'help.faqBookingA1' },
      { questionKey: 'help.faqBookingQ2', answerKey: 'help.faqBookingA2' },
      { questionKey: 'help.faqBookingQ3', answerKey: 'help.faqBookingA3' },
    ],
  },
  {
    titleKey: 'help.faqAccountTitle',
    items: [
      { questionKey: 'help.faqAccountQ1', answerKey: 'help.faqAccountA1' },
      { questionKey: 'help.faqAccountQ2', answerKey: 'help.faqAccountA2' },
    ],
  },
  {
    titleKey: 'help.faqOrgTitle',
    items: [
      { questionKey: 'help.faqOrgQ1', answerKey: 'help.faqOrgA1' },
      { questionKey: 'help.faqOrgQ2', answerKey: 'help.faqOrgA2' },
    ],
  },
];

const QUICK_LINKS = [
  { icon: <CalendarIcon />, labelKey: 'help.bookingTopic', variant: 'accent' as const },
  { icon: <CreditCardIcon />, labelKey: 'help.paymentTopic', variant: 'warning' as const },
  { icon: <UsersIcon />, labelKey: 'help.accountTopic', variant: 'neutral' as const },
  { icon: <BuildingIcon />, labelKey: 'help.organizationTopic', variant: 'success' as const },
];

export function HelpPage() {
  const t = useT();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();
  const createTicket = useCreateSupportTicket();

  const { tenantId } = useTenantContext();
  const userId = (user?.id ?? '') as Id<'users'>;

  const faqSections = FAQ_SECTION_KEYS.map(section => ({
    title: t(section.titleKey),
    items: section.items.map(item => ({
      question: t(item.questionKey),
      answer: t(item.answerKey),
    })),
  }));

  const filteredSections = searchQuery
    ? faqSections.map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(section => section.items.length > 0)
    : faqSections;

  const handleSubmit = async () => {
    if (!contactForm.subject || !contactForm.message || !tenantId || !userId) return;
    setIsSubmitting(true);
    try {
      await createTicket.mutateAsync({
        tenantId: tenantId as Id<'tenants'>,
        subject: contactForm.subject.trim(),
        description: contactForm.message.trim(),
        priority: 'normal',
        category: 'general',
        reporterUserId: userId,
      });
      setContactForm({ subject: '', message: '' });
      showToast({ title: t('help.inquirySent'), variant: 'success' });
      navigate('/support');
    } catch {
      // handled by hook error state
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('help.title')}
        subtitle={t('help.description')}
      />

      {/* Search */}
      <Card className={s.searchCard}>
        <Textfield
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('help.searchPlaceholder')}
          aria-label={t('help.searchPlaceholder')}
          className={s.searchInput}
        />
      </Card>

      {/* Quick Links */}
      <Grid columns={isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'}>
        {QUICK_LINKS.map((link) => (
          <Card key={link.labelKey} className={s.quickLinkCard}>
            <Stack direction="vertical" align="center" spacing="var(--ds-size-2)">
              <IconBox variant={link.variant} size="lg" icon={link.icon} />
              <Paragraph data-size="sm" className={s.quickLinkLabel}>{t(link.labelKey)}</Paragraph>
            </Stack>
          </Card>
        ))}
      </Grid>

      {/* FAQ Sections */}
      {filteredSections.map((section) => (
        <Card key={section.title} className={s.faqCard}>
          <Heading level={2} data-size="sm" className={s.faqTitle}>
            {section.title}
          </Heading>
          <Stack direction="vertical" spacing="var(--ds-size-2)">
            {section.items.map((item) => {
              const faqId = `${section.title}-${item.question}`;
              const isExpanded = expandedFaq === faqId;
              return (
                <div key={faqId}>
                  <Button
                    type="button"
                    variant="tertiary"
                    onClick={() => toggleFaq(faqId)}
                    className={isExpanded ? s.faqButtonExpanded : s.faqButtonCollapsed}
                    aria-expanded={isExpanded}
                  >
                    <Stack direction="horizontal" justify="between" align="center" className={s.fullWidth}>
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
      ))}

      {/* Contact Form */}
      <Card className={s.contactCard}>
        <Heading level={2} data-size="sm" className={s.contactTitle}>
          {t('help.contactUs')}
        </Heading>
        <Stack direction="vertical" spacing="var(--ds-size-4)">
          <FormField label={t('help.subject')}>
            <Textfield
              value={contactForm.subject}
              onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
              placeholder={t('help.subjectPlaceholder')}
              aria-label={t('help.subject')}
            />
          </FormField>
          <FormField label={t('help.message')}>
            <Textarea
              value={contactForm.message}
              onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder={t('help.messagePlaceholder')}
              rows={4}
              aria-label={t('help.message')}
            />
          </FormField>
          <Button
            type="button"
            variant="primary"
            data-size="md"
            onClick={handleSubmit}
            disabled={isSubmitting || !contactForm.subject || !contactForm.message}
            className={s.submitButton}
          >
            {isSubmitting ? t('common.sending') : t('help.sendInquiry')}
          </Button>
        </Stack>
      </Card>
    </PageContentLayout>
  );
}
