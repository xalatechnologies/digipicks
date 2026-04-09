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
  GoogleIcon,
  FacebookIcon,
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
      setLoginError(err instanceof Error ? err.message : 'Could not send code');
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
      setLoginError(err instanceof Error ? err.message : 'Could not resend code');
    }
  };

  const handleDemoSelect = async (roleKey: string) => {
    setLoginError(null);
    try {
      await signInAsDemo({ role: roleKey, tenantId: env.tenantId || undefined });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Demo login failed');
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
                {t('web.login.recentEmails', 'Recent emails')}
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
            icon={<GoogleIcon />}
            title={t('web.login.googleTitle', 'Continue with Google')}
            description={t('web.login.googleDesc', 'Sign in with your Google account')}
            onClick={() => signInWithOAuth('google')}
          />
          <LoginOption
            icon={<FacebookIcon />}
            title={t('web.login.facebookTitle', 'Continue with Facebook')}
            description={t('web.login.facebookDesc', 'Sign in with your Facebook account')}
            onClick={() => signInWithOAuth('facebook')}
          />
          <LoginOption
            icon={<DiscordIcon />}
            title={t('web.login.discordTitle', 'Continue with Discord')}
            description={t('web.login.discordDesc', 'Sign in with your Discord account')}
            onClick={() => signInWithOAuth('discord')}
          />

          {/* Email login option — opens the email form */}
          <LoginDivider text={t('common.or', 'or')} />
          <LoginOption
            icon={<MailIcon size={20} />}
            title={t('web.login.emailTitle', 'Sign in with email')}
            description={t('web.login.emailDesc', 'We send a one-time code to your email address')}
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
              {t('web.login.emailFormTitle', 'Sign in with email')}
            </Heading>
            <Paragraph
              data-size="sm"
              style={{ color: 'var(--ds-color-neutral-text-subtle)', margin: '0 0 var(--ds-size-4)' }}
            >
              {t('web.login.emailFormDesc', 'We send a one-time code to your email address.')}
            </Paragraph>
            <form onSubmit={handleEmailSubmit}>
              <Stack direction="vertical" spacing="var(--ds-size-4)">
                <Textfield
                  type="email"
                  label={t('web.login.emailLabel', 'Email address')}
                  placeholder={t('web.login.emailPlaceholder', 'Enter your email address')}
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
                  {isRequesting ? t('web.login.sendingCode', 'Sending code...') : t('web.login.continue', 'Continue')}
                </Button>
              </Stack>
            </form>
          </Card>
          <Button
            variant="tertiary"
            data-size="sm"
            onClick={() => setShowEmailForm(false)}
            style={{ display: 'block', margin: '0 auto' }}
          >
            ← {t('web.login.backToOptions', 'Back to all sign-in options')}
          </Button>
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
            {t('web.login.codeSent', 'Check your email')}
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
            {t('web.login.codeInstructions', 'Enter the code we sent to')}{' '}
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
              {t('web.login.verifying', 'Verifying...')}
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
              {t('web.login.noCode', "Didn't get a code?")}
            </Paragraph>
            <Paragraph
              data-size="sm"
              style={{
                color: 'var(--ds-color-neutral-text-subtle)',
                margin: '0 0 14px',
                lineHeight: '1.5',
              }}
            >
              {t('web.login.noCodeHelp', 'It should arrive within 20 seconds. Check your spam folder.')}
            </Paragraph>
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
                {t('web.login.resendCode', 'Resend code')}
              </Button>
              <Button
                variant="tertiary"
                data-size="sm"
                onClick={() => {
                  goBack();
                  clearError();
                  setLoginError(null);
                  setShowEmailForm(false);
                }}
              >
                {t('web.login.backToLogin', 'Back to sign in')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* DEV: Demo Login */}
      {DEV_AUTH && step === 'email' && (
        <>
          <LoginDivider text={t('web.login.demoLogin', 'Demo login')} />
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
