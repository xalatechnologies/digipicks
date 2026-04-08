import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { copyBrandAssets } from '../../scripts/vite/copyBrandAssets';

// Theme CSS is bundled via static imports in main.tsx (@digilist-saas/ds-themes/themes/*).
// No copy or symlink needed; Vite resolves from the package.

export default defineConfig({
  plugins: [
    react(),
    copyBrandAssets({ appRoot: __dirname }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['logo.svg'],
      manifest: {
        name: 'DigiPicks',
        short_name: 'DigiPicks',
        description: 'Premium sports betting picks from top creators',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\/.*\/*.json/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Convex API responses for offline feed viewing
            urlPattern: /\.convex\.cloud\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'convex-api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 30, // 30 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache pick/creator images for offline viewing
            urlPattern: /\.(png|jpg|jpeg|webp|gif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        // Prevent stale UI from dev service worker caches.
        enabled: false,
      },
    }),
  ],
  envDir: path.resolve(__dirname, '../..'),
  server: {
    port: 5190,
  },
  preview: {
    port: 5190,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Mapbox GL in separate chunk (large, rarely changes)
          if (id.includes('node_modules/mapbox-gl')) {
            return 'vendor-mapbox';
          }

          // Design system in separate chunk
          if (id.includes('packages/ds/src') || id.includes('@digilist-saas/ds')) {
            return 'vendor-ds';
          }

          // Everything else from node_modules goes together
          // This prevents circular dependencies between chunks
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 800,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@digilist-saas/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@digilist-saas/sdk'],
    include: [
      'mapbox-gl',
      'react-map-gl/mapbox',
    ],
    force: true,
    esbuildOptions: {
      // Mapbox GL requires these Node.js polyfills
      target: 'esnext',
      define: {
        global: 'globalThis',
      },
    },
  },
});
