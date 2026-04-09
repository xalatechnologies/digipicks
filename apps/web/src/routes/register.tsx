/**
 * Public Registration Page — Web App
 *
 * Multi-method registration supporting BankID, Vipps, phone, magic link,
 * and traditional email/password. Uses the LoginLayout pattern for visual
 * consistency with the login page.
 */
import { useState, useEffect, useId } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  LoginLayout,
  LoginOption,
  LoginDivider,
  Textfield,
  Button,
  Alert,
  Heading,
  Paragraph,
  Card,
  Stack,
  ProgressBar,
  PlatformIcon,
  AutomationIcon,
  ShieldCheckIcon,
  GoogleIcon,
  FacebookIcon,
  MailIcon,
} from '@digipicks/ds';

function DiscordIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="Discord" role="img">
      <path
        d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.044.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
        fill="#5865F2"
      />
    </svg>
  );
}
import { useAuth } from '@digipicks/app-shell';
import { useMagicLink } from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import regStyles from './register.module.css';

/* ────────────────────────────────────────
   Password Strength Meter
   ──────────────────────────────────────── */

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Weak', 'Weak', 'OK', 'Strong', 'Very strong', 'Excellent'];
  const colors = [
    'var(--ds-color-danger-base-default)',
    'var(--ds-color-danger-base-default)',
    'var(--ds-color-warning-base-default)',
    'var(--ds-color-success-base-default)',
    'var(--ds-color-success-base-default)',
    'var(--ds-color-success-base-default)',
  ];

  return { score, label: labels[score], color: colors[score] };
}

/* ────────────────────────────────────────
   Main Page
   ──────────────────────────────────────── */

export function RegisterPage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const t = useT();
  const emailStatusId = useId();
  const passwordStrengthId = useId();
  const { isAuthenticated, isLoading, signInWithOAuth, signIn } = useAuth();
  const { requestMagicLink, isRequesting, requestSuccess } = useMagicLink({ appId: 'web' });
  const isOwnerIntent = searchParams.get('intent') === 'owner';

  // Expanded inline forms
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Magic link state
  const [magicLinkEmail, setMagicLinkEmail] = useState('');

  // Email/password form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Email availability check (debounced)
  const [debouncedEmail, setDebouncedEmail] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedEmail(email), 500);
    return () => clearTimeout(timer);
  }, [email]);

  const emailCheck = useQuery(
    api.auth.signup.checkEmailAvailable,
    debouncedEmail.includes('@') ? { email: debouncedEmail } : 'skip',
  );

  // Signup mutation
  const signUp = useMutation(api.auth.signup.signUp);

  useEffect(() => {
    if (isAuthenticated && !isLoading && !success) {
      if (isOwnerIntent) {
        navigate('/apply-owner', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate, isOwnerIntent, success]);

  const passwordStrength = getPasswordStrength(password);
  const showEmailAvailability = debouncedEmail.includes('@') && emailCheck !== undefined && emailCheck !== null;

  /* ── Handlers ── */

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await requestMagicLink(magicLinkEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send link. Please try again.');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.includes('@')) {
      setError('Invalid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (emailCheck && !emailCheck.available) {
      setError('This email is already registered');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signUp({
        email,
        password,
        name,
        appId: 'web',
      });

      if (result.success) {
        // Sign in via SDK to persist session correctly (right keys + cookie)
        try {
          await signIn(email, password);
        } catch {
          // If sign-in fails, fall back to manual storage
          localStorage.setItem('digilist_saas_digilist_session_token', result.sessionToken!);
          localStorage.setItem('digilist_saas_digilist_user', JSON.stringify(result.user));
        }

        setSuccess(true);
        // Auto-redirect after showing success state
        setTimeout(() => {
          window.location.href = isOwnerIntent ? '/apply-owner' : '/';
        }, 500);
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <></>;
  }

  /* ── Layout Props ── */

  const features = [
    {
      icon: <PlatformIcon size={20} />,
      title: t('auth.completePlatform', 'Komplett plattform'),
      description: t('auth.completePlatformDesc', 'Booking, arrangement og utleie i ett system'),
    },
    {
      icon: <AutomationIcon size={20} />,
      title: t('auth.automation', 'Automatisering'),
      description: t('auth.automationDesc', 'Spar tid med smarte arbeidsflyter'),
    },
    {
      icon: <ShieldCheckIcon size={20} />,
      title: t('auth.gdprSecure', 'GDPR-sikker'),
      description: t('auth.gdprSecureDesc', 'Norsk skylagring med full sikkerhet'),
    },
  ];

  const integrations = ['Stripe', 'Discord', 'Google', 'PCI DSS'];

  const privacyUrl = import.meta.env.VITE_PRIVACY_URL || '/privacy';
  const termsUrl = import.meta.env.VITE_TERMS_URL || '/terms';
  const contactUrl = import.meta.env.VITE_CONTACT_URL || '/about';

  const footerLinks = [
    { href: privacyUrl, label: t('auth.privacy', 'Personvern') },
    { href: termsUrl, label: t('auth.terms', 'Vilkår') },
    { href: contactUrl, label: t('auth.contactSupport', 'Kontakt oss') },
  ];

  return (
    <LoginLayout
      brandName={import.meta.env.VITE_PLATFORM_NAME || 'DigiPicks'}
      brandTagline="CREATE ACCOUNT"
      logoHref="/"
      title=""
      panelTitle={
        isOwnerIntent
          ? t('web.register.ownerPanelTitle', 'Become a DigiPicks creator')
          : t('web.register.panelTitle', 'Join DigiPicks')
      }
      panelSubtitle={
        isOwnerIntent
          ? t('web.register.ownerPanelSubtitle', 'Monetize your picks')
          : t('web.register.panelSubtitle', 'Create your free account')
      }
      panelDescription={
        isOwnerIntent
          ? t(
              'web.register.ownerPanelDescription',
              'Apply to publish picks, build subscribers, and get paid out monthly. We review every creator to keep DigiPicks curated and trust-first.',
            )
          : t(
              'web.register.panelDescription',
              'Find verified sports-picks creators, follow your favorites, and track every pick. Cancel anytime — no lock-in.',
            )
      }
      features={features}
      integrations={integrations}
      footerLinks={footerLinks}
      copyright={t('auth.copyright', '© 2026 Platform. Alle rettigheter forbeholdt.')}
      integrationsLabel={t('auth.integrationsLabel', 'Integrasjoner')}
    >
      {success ? (
        <Card style={{ padding: 'var(--ds-size-6)' }}>
          <Stack direction="vertical" spacing="var(--ds-size-5)" align="center">
            <div className={regStyles.successIcon}>✓</div>
            <Heading level={2} data-size="md" style={{ textAlign: 'center' }}>
              {t('web.register.accountCreated', 'Konto opprettet!')}
            </Heading>
            <Paragraph data-size="md" style={{ textAlign: 'center', color: 'var(--ds-color-neutral-text-subtle)' }}>
              {isOwnerIntent
                ? t(
                    'web.register.ownerNextStep',
                    'Flott! Nå kan du søke om utleiertilgang. Vi sender deg videre til søknadsskjemaet.',
                  )
                : t('web.register.accountCreatedDesc', 'Hva vil du gjøre nå?')}
            </Paragraph>
            {isOwnerIntent ? (
              <>
                <ProgressBar
                  value={100}
                  variant="success"
                  aria-label={t('web.register.redirecting', 'Sender deg videre...')}
                />
                <Paragraph data-size="sm" style={{ textAlign: 'center', color: 'var(--ds-color-neutral-text-subtle)' }}>
                  {t('web.register.redirectingToApplication', 'Tar deg videre til søknadsskjemaet...')}
                </Paragraph>
                <Button
                  variant="primary"
                  data-size="lg"
                  style={{ width: '100%' }}
                  onClick={() => {
                    window.location.href = '/apply-owner';
                  }}
                >
                  {t('web.register.goToApplication', 'Gå til søknaden')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  data-size="lg"
                  style={{ width: '100%' }}
                  onClick={() => navigate('/', { replace: true })}
                >
                  {t('web.register.exploreListing', 'Utforsk annonser')}
                </Button>
                <Button
                  variant="secondary"
                  data-size="lg"
                  style={{ width: '100%' }}
                  onClick={() => navigate('/register')}
                >
                  {t('web.register.becomeOwner', 'Bli utleier')}
                </Button>
              </>
            )}
          </Stack>
        </Card>
      ) : (
        <>
          {/* ── Primary Auth Options ── */}
          <LoginOption
            icon={<GoogleIcon />}
            title={t('web.register.googleTitle', 'Continue with Google')}
            description={t('web.register.googleDesc', 'Sign up instantly with your Google account')}
            onClick={() => signInWithOAuth('google')}
          />
          <LoginOption
            icon={<FacebookIcon />}
            title={t('web.register.facebookTitle', 'Continue with Facebook')}
            description={t('web.register.facebookDesc', 'Sign up with your Facebook account')}
            onClick={() => signInWithOAuth('facebook')}
          />
          <LoginOption
            icon={<DiscordIcon />}
            title={t('web.register.discordTitle', 'Continue with Discord')}
            description={t('web.register.discordDesc', 'Sign up with your Discord account')}
            onClick={() => signInWithOAuth('discord')}
          />
          <LoginOption
            icon={<MailIcon />}
            title={t('web.register.magicLinkTitle', 'Magic link (email)')}
            description={t('web.register.magicLinkDesc', 'Get a login link sent to your inbox — no password needed')}
            onClick={() => {
              setShowMagicLink(true);
              setShowPhone(false);
            }}
          />

          {/* ── Magic Link Inline Form ── */}
          {showMagicLink && !requestSuccess && (
            <Card className={regStyles.inlineFormCard}>
              <Heading level={3} data-size="xs">
                {t('web.register.magicLinkFormTitle', 'Skriv inn e-postadresse')}
              </Heading>
              <Paragraph data-size="sm" className={regStyles.formParagraphSubtle}>
                {t(
                  'web.register.magicLinkFormDesc',
                  'Vi sender deg en lenke du kan bruke til å logge inn — ingen passord nødvendig.',
                )}
              </Paragraph>
              <form onSubmit={handleMagicLinkRequest}>
                <Stack direction="vertical" spacing="0.75rem">
                  <Textfield
                    type="email"
                    placeholder={t('web.register.emailPlaceholder', 'din@epost.no')}
                    value={magicLinkEmail}
                    onChange={(e) => setMagicLinkEmail(e.target.value)}
                    required
                    autoFocus
                    aria-label={t('web.register.emailAriaLabel', 'E-postadresse')}
                  />
                  <Stack direction="horizontal" spacing="0.5rem">
                    <Button
                      variant="secondary"
                      type="button"
                      className={regStyles.flexButton1}
                      onClick={() => setShowMagicLink(false)}
                    >
                      {t('common.cancel', 'Avbryt')}
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={isRequesting}
                      loading={isRequesting}
                      className={regStyles.flexButton2}
                    >
                      {isRequesting
                        ? t('web.register.sending', 'Sender...')
                        : t('web.register.sendMagicLink', 'Send innloggingslenke')}
                    </Button>
                  </Stack>
                </Stack>
              </form>
            </Card>
          )}

          {requestSuccess && (
            <Alert data-color="success" className={regStyles.inlineAlert}>
              <Heading level={3} data-size="xs">
                {t('web.register.checkEmail', 'Sjekk e-posten din')}
              </Heading>
              <Paragraph data-size="sm">
                {t('web.register.magicLinkSent', `Vi har sendt en innloggingslenke til ${magicLinkEmail}.`)}
              </Paragraph>
              <Button
                variant="secondary"
                data-size="sm"
                onClick={() => {
                  setShowMagicLink(false);
                  setMagicLinkEmail('');
                }}
              >
                {t('common.back', 'Tilbake')}
              </Button>
            </Alert>
          )}

          {/* ── Divider ── */}
          <LoginDivider text={t('web.register.orEmail', 'eller registrer med e-post og passord')} />

          {/* ── Collapsed email/password toggle ── */}
          {!showEmailForm ? (
            <Button variant="secondary" className={regStyles.fullWidthButton} onClick={() => setShowEmailForm(true)}>
              {t('web.register.showEmailForm', 'Registrer med e-post og passord')}
            </Button>
          ) : (
            <Card className={regStyles.emailFormCard}>
              <form onSubmit={handleEmailSubmit}>
                <Stack direction="vertical" spacing="var(--ds-size-4)">
                  <Heading level={3} data-size="xs">
                    {t('web.register.formTitle', 'Registrer deg med e-post')}
                  </Heading>

                  <Textfield
                    label={t('web.register.name', 'Fullt navn')}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    autoFocus
                  />

                  <div>
                    <Textfield
                      label={t('web.register.email', 'E-postadresse')}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      aria-describedby={showEmailAvailability ? emailStatusId : undefined}
                    />
                    {showEmailAvailability && emailCheck && (
                      <Paragraph
                        id={emailStatusId}
                        data-size="xs"
                        className={emailCheck.available ? regStyles.emailStatusAvailable : regStyles.emailStatusTaken}
                      >
                        {emailCheck.available
                          ? t('web.register.emailStatusAvailable', '✓ Tilgjengelig')
                          : t('web.register.emailStatusTaken', '✗ Allerede registrert')}
                      </Paragraph>
                    )}
                  </div>

                  <div>
                    <Textfield
                      label={t('web.register.password', 'Passord')}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      aria-describedby={password.length > 0 ? passwordStrengthId : undefined}
                    />
                    {password.length > 0 && (
                      <div className={regStyles.passwordMeterBlock}>
                        <ProgressBar
                          value={(passwordStrength.score / 5) * 100}
                          variant={
                            passwordStrength.score <= 1 ? 'danger' : passwordStrength.score <= 2 ? 'warning' : 'success'
                          }
                          aria-label={t('web.register.passwordStrengthAria', 'Passordstyrke')}
                        />
                        <Paragraph
                          id={passwordStrengthId}
                          data-size="xs"
                          className={
                            passwordStrength.score <= 1
                              ? regStyles.passwordLabelDanger
                              : passwordStrength.score <= 2
                                ? regStyles.passwordLabelWarning
                                : regStyles.passwordLabelSuccess
                          }
                        >
                          {passwordStrength.label}
                        </Paragraph>
                      </div>
                    )}
                  </div>

                  <Textfield
                    label={t('web.register.confirmPassword', 'Bekreft passord')}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    error={
                      confirmPassword.length > 0 && password !== confirmPassword
                        ? 'Passordene stemmer ikke overens'
                        : undefined
                    }
                  />

                  {error && <Alert data-color="danger">{error}</Alert>}

                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isSubmitting || (emailCheck !== undefined && !emailCheck?.available)}
                    loading={isSubmitting}
                    style={{ width: '100%' }}
                  >
                    {isSubmitting
                      ? t('web.register.creating', 'Oppretter konto...')
                      : t('web.register.submit', 'Opprett konto')}
                  </Button>
                </Stack>
              </form>
            </Card>
          )}

          {/* ── Error display (for OAuth errors etc.) ── */}
          {error && !showEmailForm && (
            <Alert data-color="danger" style={{ marginTop: 'var(--ds-size-4)' }}>
              {error}
            </Alert>
          )}

          {/* ── Footer links ── */}
          <Paragraph
            data-size="sm"
            style={{
              textAlign: 'center',
              marginTop: 'var(--ds-size-4)',
              color: 'var(--ds-color-neutral-text-subtle)',
            }}
          >
            {t('web.register.hasAccount', 'Har du allerede en konto?')}{' '}
            <Link
              to="/login"
              style={{
                color: 'var(--ds-color-accent-text-default)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              {t('web.register.loginLink', 'Logg inn')}
            </Link>
          </Paragraph>
        </>
      )}
    </LoginLayout>
  );
}
