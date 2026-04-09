import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { XalaConvexProvider } from '@digipicks/sdk';

// ✅ Single import point for Designsystemet CSS (required)
import '@digipicks/ds/styles';

// ✅ Platform base bundle (tokens + extensions + base styles — no color theme)
// Color theme is loaded dynamically based on tenant settings in App.tsx
import '@digipicks/ds/platform-base';
import { App } from '@/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <XalaConvexProvider>
      <App />
    </XalaConvexProvider>
  </StrictMode>,
);
