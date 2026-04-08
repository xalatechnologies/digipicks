/**
 * Service Worker for DigiPicks Push Notifications & Offline Support
 * Handles push events and notification interactions for the DigiPicks web app
 */

// Service Worker version - increment to force update
const SW_VERSION = '2.0.0';

// =============================================================================
// Installation & Activation
// =============================================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// =============================================================================
// Push Event Handler
// =============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json();
    const { title, body, icon, badge, image, data, actions, tag, requireInteraction } = payload;

    const notificationOptions = {
      body: body || '',
      icon: icon || '/logo.svg',
      badge: badge || '/logo.svg',
      tag: tag || `digipicks-${Date.now()}`,
      requireInteraction: requireInteraction || false,
      data: data || {},
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
    };

    if (image) {
      notificationOptions.image = image;
    }

    if (actions && actions.length > 0) {
      notificationOptions.actions = actions;
    }

    if (data && data.type) {
      enhanceNotificationForType(notificationOptions, data.type);
    }

    event.waitUntil(
      self.registration.showNotification(title || 'DigiPicks', notificationOptions)
    );
  } catch (error) {
    event.waitUntil(
      self.registration.showNotification('DigiPicks', {
        body: 'Du har mottatt en ny varsling',
        icon: '/logo.svg',
        badge: '/logo.svg',
      })
    );
  }
});

// =============================================================================
// Notification Click Handler
// =============================================================================

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;
  let targetUrl = getTargetUrl(data, action);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          return client.focus().then((client) => {
            if (targetUrl && 'navigate' in client) {
              return client.navigate(targetUrl);
            }
            return client;
          });
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// =============================================================================
// Helper Functions
// =============================================================================

function enhanceNotificationForType(options, type) {
  switch (type) {
    case 'new_pick':
      options.requireInteraction = true;
      if (!options.actions) {
        options.actions = [
          { action: 'view', title: 'Se pick' },
          { action: 'dismiss', title: 'OK' },
        ];
      }
      break;

    case 'pick_result':
      options.requireInteraction = true;
      options.vibrate = [200, 100, 200, 100, 200];
      if (!options.actions) {
        options.actions = [
          { action: 'view', title: 'Se resultat' },
          { action: 'tracker', title: 'Tracker' },
        ];
      }
      break;

    case 'daily_summary':
      if (!options.actions) {
        options.actions = [
          { action: 'view', title: 'Se oppsummering' },
        ];
      }
      break;

    case 'subscription_started':
      options.requireInteraction = true;
      if (!options.actions) {
        options.actions = [
          { action: 'view', title: 'Se creator' },
          { action: 'dismiss', title: 'OK' },
        ];
      }
      break;

    case 'subscription_expiring':
      options.requireInteraction = true;
      options.vibrate = [300, 100, 300];
      if (!options.actions) {
        options.actions = [
          { action: 'renew', title: 'Forny' },
          { action: 'dismiss', title: 'Senere' },
        ];
      }
      break;

    case 'subscription_cancelled':
      options.requireInteraction = true;
      if (!options.actions) {
        options.actions = [
          { action: 'view', title: 'Se detaljer' },
          { action: 'dismiss', title: 'OK' },
        ];
      }
      break;

    case 'creator_live':
      if (!options.actions) {
        options.actions = [
          { action: 'view', title: 'Se picks' },
        ];
      }
      break;

    case 'creator_hot_streak':
      if (!options.actions) {
        options.actions = [
          { action: 'view', title: 'Se creator' },
        ];
      }
      break;

    case 'leaderboard_update':
      if (!options.actions) {
        options.actions = [
          { action: 'view', title: 'Se leaderboard' },
        ];
      }
      break;

    default:
      break;
  }
}

function getTargetUrl(data, action) {
  const baseUrl = self.registration.scope;

  if (action === 'dismiss') {
    return baseUrl;
  }

  if (data.pickId) {
    if (action === 'tracker') {
      return `${baseUrl}tracker`;
    }
    return `${baseUrl}picks#pick-${data.pickId}`;
  }

  if (data.creatorId) {
    if (action === 'renew') {
      return `${baseUrl}creator/${data.creatorId}#subscribe`;
    }
    return `${baseUrl}creator/${data.creatorId}`;
  }

  if (data.type === 'leaderboard_update') {
    return `${baseUrl}leaderboard`;
  }

  if (data.type && data.type.startsWith('subscription_')) {
    return `${baseUrl}pricing`;
  }

  return `${baseUrl}picks`;
}

// =============================================================================
// Background Sync
// =============================================================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    // Future: Sync notification read status when back online
  }
});

// =============================================================================
// Service Worker Update
// =============================================================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
