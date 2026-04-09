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
  IdPortenIcon,
  VippsIcon,
  PhoneIcon,
  MailIcon,
} from '@digipicks/ds';
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

  const labels = ['Svakt', 'Svakt', 'OK', 'Sterkt', 'Veldig sterkt', 'Utmerket'];
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
  const [showPhone, setShowPhone] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Magic link state
  const [magicLinkEmail, setMagicLinkEmail] = useState('');

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneSent, setPhoneSent] = useState(false);

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
      setError(err instanceof Error ? err.message : 'Kunne ikke sende lenke. Prøv igjen.');
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Stub — SMS auth not yet implemented on backend
    setPhoneSent(true);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Navn er påkrevd');
      return;
    }
    if (!email.includes('@')) {
      setError('Ugyldig e-postadresse');
      return;
    }
    if (password.length < 8) {
      setError('Passordet må være minst 8 tegn');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passordene stemmer ikke overens');
      return;
    }
    if (emailCheck && !emailCheck.available) {
      setError('Denne e-postadressen er allerede registrert');
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
        setError(result.error || 'Registrering feilet. Prøv igjen.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.');
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

  const integrations = ['BankID', 'Vipps', 'Visma', 'RCO', 'ISO 27001 / 27701'];

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
      brandName={import.meta.env.VITE_PLATFORM_NAME || 'Xala Foundation'}
      brandTagline="OPPRETT KONTO"
      logoHref="/"
      title={t('web.register.title', 'Opprett konto')}
      panelTitle={
        isOwnerIntent
          ? t('web.register.ownerPanelTitle', 'Bli utleier på plattformen')
          : t('web.register.panelTitle', 'Bli med på plattformen')
      }
      panelSubtitle={
        isOwnerIntent
          ? t('web.register.ownerPanelSubtitle', 'Start å leie ut i dag')
          : t('web.register.panelSubtitle', 'Opprett din gratis konto')
      }
      panelDescription={
        isOwnerIntent
          ? t(
              'web.register.ownerPanelDescription',
              'Registrer deg for å legge ut lokaler, utstyr og arrangementer. Nå tusenvis av potensielle kunder.',
            )
          : t(
              'web.register.panelDescription',
              'Registrer deg for å utforske lokaler, arrangementer og tjenester. Bli eier og publiser dine egne annonser.',
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
            icon={<IdPortenIcon />}
            title={t('web.register.bankidTitle', 'Registrer med BankID')}
            description={t('web.register.bankidDesc', 'Verifiser deg med norsk eID — trygt og raskt')}
            onClick={() => signInWithOAuth('idporten')}
          />
          <LoginOption
            icon={<VippsIcon />}
            title={t('web.register.vippsTitle', 'Registrer med Vipps')}
            description={t('web.register.vippsDesc', 'Bruk Vipps-kontoen din for rask opprettelse')}
            onClick={() => signInWithOAuth('vipps')}
          />
          <LoginOption
            icon={<PhoneIcon />}
            title={t('web.register.phoneTitle', 'Registrer med telefon')}
            description={t('web.register.phoneDesc', 'Motta en engangskode på SMS')}
            onClick={() => {
              setShowPhone(true);
              setShowMagicLink(false);
            }}
          />
          <LoginOption
            icon={<MailIcon />}
            title={t('web.register.magicLinkTitle', 'Magic link (e-post)')}
            description={t('web.register.magicLinkDesc', 'Få en innloggingslenke rett i innboksen — uten passord')}
            onClick={() => {
              setShowMagicLink(true);
              setShowPhone(false);
            }}
          />

          {/* ── Phone Inline Form ── */}
          {showPhone && !phoneSent && (
            <Card className={regStyles.inlineFormCard}>
              <Heading level={3} data-size="xs">
                {t('web.register.phoneFormTitle', 'Skriv inn telefonnummer')}
              </Heading>
              <Paragraph data-size="sm" className={regStyles.formParagraphSubtle}>
                {t('web.register.phoneFormDesc', 'Vi sender en engangskode via SMS for å bekrefte nummeret ditt.')}
              </Paragraph>
              <form onSubmit={handlePhoneSubmit}>
                <Stack direction="vertical" spacing="0.75rem">
                  <Textfield
                    type="tel"
                    placeholder={t('web.register.phonePlaceholder', '+47 000 00 000')}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    autoFocus
                    aria-label={t('web.register.phoneAriaLabel', 'Telefonnummer')}
                  />
                  <Stack direction="horizontal" spacing="0.5rem">
                    <Button
                      variant="secondary"
                      type="button"
                      className={regStyles.flexButton1}
                      onClick={() => setShowPhone(false)}
                    >
                      {t('common.cancel', 'Avbryt')}
                    </Button>
                    <Button variant="primary" type="submit" className={regStyles.flexButton2}>
                      {t('web.register.sendCode', 'Send kode')}
                    </Button>
                  </Stack>
                </Stack>
              </form>
            </Card>
          )}

          {phoneSent && (
            <Alert data-color="info" className={regStyles.inlineAlert}>
              <Heading level={3} data-size="xs">
                {t('web.register.phoneSentTitle', 'Kommer snart')}
              </Heading>
              <Paragraph data-size="sm">
                {t(
                  'web.register.phoneSentDesc',
                  'SMS-registrering er under utvikling. Bruk en av de andre metodene for å komme i gang.',
                )}
              </Paragraph>
              <Button
                variant="secondary"
                data-size="sm"
                onClick={() => {
                  setShowPhone(false);
                  setPhoneSent(false);
                }}
              >
                {t('common.back', 'Tilbake')}
              </Button>
            </Alert>
          )}

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
