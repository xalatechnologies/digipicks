/**
 * Login Page - Web App
 *
 * Vend/FINN-style 2-step login flow:
 *   Step 1: Enter email → send 6-digit code
 *   Step 2: Enter code → verify and log in
 *
 * Features:
 *   - Remembered emails from localStorage
 *   - 6-digit code input with auto-advance
 *   - OAuth (Vipps, ID-porten, Microsoft)
 *   - Demo login (dev mode only)
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LoginLayout,
  LoginOption,
  LoginDivider,
  DemoLoginGrid,
  IdPortenIcon,
  MicrosoftIcon,
  VippsIcon,
  PlatformIcon,
  AutomationIcon,
  ShieldCheckIcon,
  MailIcon,
  Textfield,
  Button,
  Alert,
  Heading,
  Paragraph,
  Card,
  Stack,
} from '@digipicks/ds';
import type { DemoUser } from '@digipicks/ds';
import { useAuth } from '@digipicks/app-shell';
import { useEmailCode } from '@digipicks/sdk';
import { env } from '@digipicks/app-shell';
import { useT } from '@digipicks/i18n';

const DEV_AUTH = env.devAuth;

const DEMO_USERS: DemoUser[] = [
  {
    key: 'superadmin',
    name: 'Platform Admin',
    role: 'Superadmin',
    initials: 'PA',
    color: 'var(--ds-color-danger-base-default, #EF4444)',
  },
  {
    key: 'admin',
    name: 'Tenant Admin',
    role: 'Admin',
    initials: 'TA',
    color: 'var(--ds-color-accent-base-default, #4F6BFF)',
  },
  {
    key: 'user',
    name: 'Tenant Owner',
    role: 'Bruker / Eier',
    initials: 'TO',
    color: 'var(--ds-color-brand-1-base-default, #8B5CF6)',
  },
];

// Synchronous cleanup on logout — runs before React hooks initialize
function cleanupOnLogout() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('logout') === 'true') {
    [
      'digilist_saas_digilist_session_token',
      'digilist_saas_digilist_user',
      'digilist_saas_digilist_tenant_id',
      'digilist_saas_web_session_token',
      'digilist_saas_web_user',
      'digilist_saas_web_tenant_id',
      'digilist_saas_default_session_token',
      'digilist_saas_default_user',
      'digilist_saas_default_tenant_id',
      'digilist_saas_user',
      'digilist_saas_session_token',
      'digilist_saas_tenant_id',
    ].forEach((k) => localStorage.removeItem(k));
    // Clear cross-domain cookie
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length >= 2) {
      const domain = `.${parts.slice(-2).join('.')}`;
      document.cookie = `digilist_saas_session_digilist=; path=/; domain=${domain}; max-age=0`;
    }
    document.cookie = `digilist_saas_session_digilist=; path=/; max-age=0`;
  }
}
cleanupOnLogout();

// =============================================================================
// 6-Digit Code Input Component
// =============================================================================

function CodeInput({
  onComplete,
  disabled,
  error,
}: {
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      // Only allow digits
      const digit = value.replace(/\D/g, '').slice(-1);
      const newDigits = [...digits];
      newDigits[index] = digit;
      setDigits(newDigits);

      // Auto-advance to next
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all 6 digits entered
      if (digit && index === 5) {
        const code = newDigits.join('');
        if (code.length === 6) {
          onComplete(code);
        }
      }
    },
    [digits, onComplete],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
      }
    },
    [digits],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (pasted.length > 0) {
        const newDigits = [...digits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = pasted[i] || '';
        }
        setDigits(newDigits);

        // Focus appropriate input
        const nextEmpty = newDigits.findIndex((d) => !d);
        if (nextEmpty >= 0) {
          inputRefs.current[nextEmpty]?.focus();
        } else {
          inputRefs.current[5]?.focus();
          // All filled — auto-submit
          onComplete(newDigits.join(''));
        }
      }
    },
    [digits, onComplete],
  );

  // Reset on error
  useEffect(() => {
    if (error) {
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  }, [error]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
      }}
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={disabled}
          aria-label={`Siffer ${i + 1} av 6`}
          style={{
            width: '54px',
            height: '72px',
            textAlign: 'center',
            fontSize: '32px',
            fontWeight: 600,
            fontFamily: 'var(--ds-font-family, Inter, system-ui, sans-serif)',
            border: `2px solid ${error ? 'var(--ds-color-danger-border-default, #DC2626)' : digit ? 'var(--ds-color-neutral-text-default, #1C362D)' : 'var(--ds-color-neutral-border-default, #D1D5DB)'}`,
            borderRadius: '16px',
            outline: 'none',
            color: 'var(--ds-color-neutral-text-default, #1C362D)',
            background: 'var(--ds-color-neutral-surface-default, #FFFFFF)',
            transition: 'all 0.2s ease',
            boxShadow: 'none',
            caretColor: 'var(--ds-color-accent-base-default, #4F6BFF)',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--ds-color-neutral-text-default, #1C362D)';
            e.target.style.boxShadow = '0 0 0 4px rgba(28, 54, 45, 0.08)';
            e.target.style.transform = 'scale(1.04)';
          }}
          onBlur={(e) => {
            e.target.style.transform = 'scale(1)';
            if (!digit) {
              e.target.style.borderColor = 'var(--ds-color-neutral-border-default, #D1D5DB)';
              e.target.style.boxShadow = 'none';
            } else {
              e.target.style.boxShadow = 'none';
            }
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Login Page
// =============================================================================

export function LoginPage(): React.ReactElement {
  const { isAuthenticated, isLoading, signInWithOAuth, signInAsDemo, signOut } = useAuth();
  const {
    step,
    email,
    setEmail,
    requestCode,
    isRequesting,
    verifyCode,
    isVerifying,
    resendCode,
    error: codeError,
    clearError,
    goBack,
    rememberedEmails,
  } = useEmailCode({ appId: 'web' });

  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');
  const isLogout = searchParams.get('logout') === 'true';
  const urlError = searchParams.get('error');

  const from = redirectParam
    ? decodeURIComponent(redirectParam)
    : (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const [loginError, setLoginError] = useState<string | null>(urlError);
  const [codeErrorTrigger, setCodeErrorTrigger] = useState(0);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    // If we've been directed here to log out (cross-subdomain SSO logout)
    if (isLogout) {
      signOut().then(() => {
        navigate(location.pathname, { replace: true });
      });
      return;
    }

    // Already authenticated — navigate to the return path on same origin
    if (isAuthenticated && !isLoading) {
      navigate(from, { replace: true });
    }
  }, [isLogout, isAuthenticated, isLoading, navigate, from, signOut, location.pathname]);

  // Redirect on successful code verification — full reload so useAuth re-reads session
  useEffect(() => {
    if (step === 'success') {
      // Full page load so useAuth picks up the new session from localStorage
      window.location.href = from;
    }
  }, [step, from]);

  if (isLoading) {
    return <></>;
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    clearError();
    try {
      await requestCode();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Kunne ikke sende kode');
    }
  };

  const handleCodeComplete = async (code: string) => {
    setLoginError(null);
    try {
      await verifyCode(code);
    } catch (err) {
      setCodeErrorTrigger((prev) => prev + 1);
    }
  };

  const handleResend = async () => {
    setLoginError(null);
    clearError();
    try {
      await resendCode();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Kunne ikke sende ny kode');
    }
  };

  const handleDemoSelect = async (roleKey: string) => {
    setLoginError(null);
    try {
      await signInAsDemo({ role: roleKey, tenantId: env.tenantId || undefined });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Demo-innlogging feilet');
    }
  };

  const features = [
    {
      icon: <PlatformIcon size={20} />,
      title: t('auth.completePlatform'),
      description: t('auth.completePlatformDesc'),
    },
    {
      icon: <AutomationIcon size={20} />,
      title: t('auth.automation'),
      description: t('auth.automationDesc'),
    },
    {
      icon: <ShieldCheckIcon size={20} />,
      title: t('auth.gdprSecure'),
      description: t('auth.gdprSecureDesc'),
    },
  ];

  const integrations = ['Stripe', 'Discord', 'Google', 'PCI DSS'];

  const privacyUrl = import.meta.env.VITE_PRIVACY_URL || '/privacy';
  const termsUrl = import.meta.env.VITE_TERMS_URL || '/terms';
  const contactUrl = import.meta.env.VITE_CONTACT_URL || '/about';

  const footerLinks = [
    { href: privacyUrl, label: t('auth.privacy') },
    { href: termsUrl, label: t('auth.terms') },
    { href: contactUrl, label: t('auth.contactSupport') },
  ];

  // Combined error from the hook or local state
  const displayError = codeError || loginError;

  return (
    <LoginLayout
      brandName={import.meta.env.VITE_PLATFORM_NAME || 'DigiPicks'}
      brandTagline={import.meta.env.VITE_PLATFORM_TAGLINE || 'PREMIUM SPORTS PICKS'}
      logoHref="/"
      title={t('web.login.title')}
      panelTitle={t('web.login.panelTitle')}
      panelSubtitle={t('web.login.panelSubtitle')}
      panelDescription={t('web.login.panelDescription')}
      features={features}
      integrations={integrations}
      footerLinks={footerLinks}
      copyright={t('auth.copyright')}
      integrationsLabel={t('auth.integrationsLabel')}
    >
      {/* ================================================================== */}
      {/* STEP 1: Email Input                                                */}
      {/* ================================================================== */}
      {step === 'email' && !showEmailForm && (
        <>
          {/* Remembered Emails — quick one-tap login */}
          {rememberedEmails.length > 0 && (
            <Card style={{ padding: 'var(--ds-size-4)', marginBottom: 'var(--ds-size-3)' }}>
              <Paragraph
                data-size="sm"
                style={{
                  margin: '0 0 var(--ds-size-2)',
                  color: 'var(--ds-color-neutral-text-subtle)',
                  fontWeight: 500,
                }}
              >
                Tidligere brukte e-poster
              </Paragraph>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {rememberedEmails.map((savedEmail) => (
                  <button
                    key={savedEmail}
                    type="button"
                    onClick={() => {
                      setEmail(savedEmail);
                      requestCode(savedEmail);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      border: '1px solid var(--ds-color-neutral-border-default, #E5E7EB)',
                      borderRadius: '10px',
                      background: 'var(--ds-color-neutral-surface-default, #FFFFFF)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      width: '100%',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--ds-color-neutral-surface-hover, #F9FAFB)';
                      e.currentTarget.style.borderColor = 'var(--ds-color-accent-border-default, #4F6BFF)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--ds-color-neutral-surface-default, #FFFFFF)';
                      e.currentTarget.style.borderColor = 'var(--ds-color-neutral-border-default, #E5E7EB)';
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--ds-color-accent-surface-default, #EEF2FF)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <MailIcon size={16} />
                    </div>
                    <span
                      style={{
                        fontSize: '14px',
                        color: 'var(--ds-color-neutral-text-default)',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {savedEmail}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--ds-color-neutral-text-subtle)' }}>→</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* OAuth Options — primary login methods */}
          <LoginOption
            icon={<VippsIcon />}
            title={t('web.login.vippsTitle')}
            description={t('web.login.vippsDesc')}
            onClick={() => signInWithOAuth('vipps')}
          />
          <LoginOption
            icon={<IdPortenIcon />}
            title={t('auth.idporten')}
            description={t('auth.idportenDesc')}
            onClick={() => signInWithOAuth('idporten')}
          />
          <LoginOption
            icon={<MicrosoftIcon />}
            title={t('auth.microsoft')}
            description={t('auth.microsoftDesc')}
            onClick={() => signInWithOAuth('microsoft')}
          />

          {/* Email login option — opens the email form */}
          <LoginDivider text="eller" />
          <LoginOption
            icon={<MailIcon size={20} />}
            title="Logg inn med e-post"
            description="Vi sender en engangskode til e-postadressen din"
            onClick={() => setShowEmailForm(true)}
          />
        </>
      )}

      {/* ================================================================== */}
      {/* STEP 1b: Email Form (shown after clicking "Logg inn med e-post")   */}
      {/* ================================================================== */}
      {step === 'email' && showEmailForm && (
        <>
          <Card style={{ padding: 'var(--ds-size-5)' }}>
            <Heading level={3} data-size="xs" style={{ margin: '0 0 var(--ds-size-1)' }}>
              Logg inn med e-post
            </Heading>
            <Paragraph
              data-size="sm"
              style={{ color: 'var(--ds-color-neutral-text-subtle)', margin: '0 0 var(--ds-size-4)' }}
            >
              Vi sender en innloggingskode til e-postadressen din.
            </Paragraph>
            <form onSubmit={handleEmailSubmit}>
              <Stack direction="vertical" spacing="var(--ds-size-4)">
                <Textfield
                  type="email"
                  label="E-postadresse"
                  placeholder="Skriv inn e-postadressen din"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isRequesting || !email}
                  loading={isRequesting}
                  style={{ width: '100%' }}
                >
                  {isRequesting ? 'Sender kode...' : 'Fortsett'}
                </Button>
              </Stack>
            </form>
          </Card>
          <button
            type="button"
            onClick={() => setShowEmailForm(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ds-color-neutral-text-default)',
              fontWeight: 600,
              fontSize: '14px',
              padding: '12px 0',
              textDecoration: 'none',
              display: 'block',
              margin: '0 auto',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            ← Tilbake til alle innloggingsmetoder
          </button>
        </>
      )}

      {/* ================================================================== */}
      {/* STEP 2: Code Verification                                          */}
      {/* ================================================================== */}
      {step === 'code' && (
        <Card
          style={{
            padding: '40px 36px 32px',
            borderRadius: '20px',
            boxShadow: '0 2px 16px rgba(0, 0, 0, 0.06)',
            border: '1px solid var(--ds-color-neutral-border-subtle, #F0F0F0)',
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'var(--ds-color-accent-surface-default, #E8F0FE)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <MailIcon size={24} />
          </div>

          {/* Title */}
          <Heading
            level={2}
            data-size="sm"
            style={{
              margin: '0 0 8px',
              textAlign: 'center',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            Innloggingskode sendt
          </Heading>

          {/* Subtitle */}
          <Paragraph
            data-size="sm"
            style={{
              color: 'var(--ds-color-neutral-text-subtle)',
              margin: '0 0 28px',
              textAlign: 'center',
            }}
          >
            Skriv inn koden vi sendte til{' '}
            <strong style={{ color: 'var(--ds-color-neutral-text-default)', fontWeight: 600 }}>{email}</strong>
          </Paragraph>

          {/* Code Input */}
          <div style={{ margin: '0 0 32px' }}>
            <CodeInput
              onComplete={handleCodeComplete}
              disabled={isVerifying}
              error={!!codeError}
              key={codeErrorTrigger}
            />
          </div>

          {/* Verifying state */}
          {isVerifying && (
            <Paragraph
              data-size="sm"
              style={{
                color: 'var(--ds-color-accent-text-default)',
                margin: '0 0 20px',
                textAlign: 'center',
                fontWeight: 500,
              }}
            >
              Verifiserer...
            </Paragraph>
          )}

          {/* Help Section — left aligned like Vend */}
          <div
            style={{
              borderTop: '1px solid var(--ds-color-neutral-border-subtle, #F0F0F0)',
              paddingTop: '20px',
              marginBottom: '20px',
            }}
          >
            <Paragraph
              data-size="sm"
              style={{
                color: 'var(--ds-color-neutral-text-default)',
                margin: '0 0 4px',
                fontWeight: 600,
              }}
            >
              Ikke fått kode?
            </Paragraph>
            <Paragraph
              data-size="sm"
              style={{
                color: 'var(--ds-color-neutral-text-subtle)',
                margin: '0 0 14px',
                lineHeight: '1.5',
              }}
            >
              Du bør ha fått den innen 20 sekunder. Sjekk søppelpostmappen din.
            </Paragraph>
            {/* Actions row — Send ny kode + Tilbake on same line */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Button
                variant="secondary"
                data-size="sm"
                onClick={handleResend}
                disabled={isRequesting}
                loading={isRequesting}
                style={{
                  borderRadius: '100px',
                  padding: '6px 20px',
                }}
              >
                Send ny kode
              </Button>
              <button
                type="button"
                onClick={() => {
                  goBack();
                  clearError();
                  setLoginError(null);
                  setShowEmailForm(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ds-color-neutral-text-default)',
                  fontWeight: 700,
                  fontSize: '14px',
                  padding: '8px 0',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                Tilbake til innlogging
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* DEV: Demo Login */}
      {DEV_AUTH && step === 'email' && (
        <>
          <LoginDivider text="Demo-innlogging" />
          <DemoLoginGrid users={DEMO_USERS} onSelect={handleDemoSelect} />
        </>
      )}

      {/* Error Display */}
      {displayError && (
        <Alert data-color="danger" style={{ marginTop: 'var(--ds-size-4)' }}>
          {displayError}
        </Alert>
      )}

      {/* Register Link */}
      {step === 'email' && (
        <Paragraph
          data-size="sm"
          style={{
            textAlign: 'center',
            marginTop: 'var(--ds-size-4)',
            color: 'var(--ds-color-neutral-text-subtle)',
          }}
        >
          {t('web.login.noAccount', 'Har du ikke en konto?')}{' '}
          <Link
            to="/register"
            style={{
              color: 'var(--ds-color-accent-text-default)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            {t('web.login.createAccount', 'Opprett konto')}
          </Link>
        </Paragraph>
      )}
    </LoginLayout>
  );
}
