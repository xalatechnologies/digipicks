/**
 * PushNotificationOptIn
 *
 * Handles the push notification opt-in flow for DigiPicks.
 * Shows a prompt after the user's first login or first pick view,
 * using the PushNotificationPrompt from the DS and SDK subscription hooks.
 */
import { useState, useEffect, useCallback } from 'react';
import { PushNotificationPrompt } from '@digilist-saas/ds';
import { usePushPermission, usePushSubscriptionFlow } from '@digilist-saas/sdk';
import { useAuth } from '@digilist-saas/app-shell';
import { env } from '@digilist-saas/app-shell';

const DISMISSED_KEY = 'digipicks_push_prompt_dismissed';
const PROMPT_DELAY_MS = 5000; // Show after 5 seconds of engagement

interface PushNotificationOptInProps {
  /** Context hint for the prompt copy */
  context?: 'picks' | 'results' | 'subscription' | 'general';
}

export function PushNotificationOptIn({ context = 'picks' }: PushNotificationOptInProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: permissionData } = usePushPermission();
  const permission = permissionData.data;
  const subscriptionFlow = usePushSubscriptionFlow();
  const auth = useAuth();

  // Only show if user is logged in, permission not yet decided, and not previously dismissed
  useEffect(() => {
    if (!auth.isAuthenticated) return;
    if (permission !== 'default') return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [auth.isAuthenticated, permission]);

  const handleEnable = useCallback(async () => {
    const tenantId = env.tenantId || '';
    const userId = auth.user?.id || '';
    if (!userId) return;

    await subscriptionFlow.mutateAsync({ tenantId, userId });
    setIsOpen(false);
  }, [auth.user?.id, subscriptionFlow]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setIsOpen(false);
  }, []);

  // Don't render if permission already granted or denied
  if (permission !== 'default') return null;

  return (
    <PushNotificationPrompt
      isOpen={isOpen}
      onClose={handleDismiss}
      onEnable={handleEnable}
      onDismiss={handleDismiss}
      context={context}
    />
  );
}
