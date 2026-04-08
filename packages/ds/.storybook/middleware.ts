import type { Plugin } from 'vite';

/**
 * Vite plugin to add Content Security Policy headers to Storybook dev server
 *
 * This CSP configuration is for development only and includes permissive directives
 * to support Storybook's hot reload and development features.
 *
 * For production static builds, refer to docs/security/CSP_CONFIGURATION.md
 */
export const cspPlugin = (): Plugin => {
  return {
    name: 'csp-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Content Security Policy for Storybook development
        // Note: 'unsafe-inline' and 'unsafe-eval' are necessary for Storybook dev mode
        const cspDirectives = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' data:",
          "img-src 'self' data: blob:",
          "connect-src 'self' ws: wss:",
          "frame-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
        ].join('; ');

        res.setHeader('Content-Security-Policy', cspDirectives);

        next();
      });
    },
  };
};
