/**
 * CheckoutCancelledPage — Web App
 *
 * Shown when a user cancels Stripe checkout or payment fails.
 * Provides clear messaging and a path back to retry.
 */

import { useSearchParams, useNavigate } from 'react-router-dom';
import { Heading, Paragraph, Button } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import s from './checkout-cancelled.module.css';

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function CheckoutCancelledPage() {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const creatorId = searchParams.get('creatorId') || undefined;

  return (
    <div className={s.pageContainer}>
      <div className={s.icon}>
        <XIcon />
      </div>

      <Heading level={1} data-size="lg" className={s.heading}>
        {t('checkout.cancelledTitle', 'Checkout cancelled')}
      </Heading>
      <Paragraph data-size="md" className={s.subtitle}>
        {t('checkout.cancelledSubtitle', 'Your payment was not processed. No charges were made to your account.')}
      </Paragraph>

      <div className={s.actions}>
        {creatorId && (
          <Button variant="primary" data-size="md" onClick={() => navigate(`/creator/${creatorId}`)}>
            {t('checkout.tryAgain', 'Try Again')}
          </Button>
        )}
        <Button variant="secondary" data-size="md" onClick={() => navigate('/creators')}>
          {t('checkout.browseCreators', 'Browse Creators')}
        </Button>
      </div>
    </div>
  );
}
