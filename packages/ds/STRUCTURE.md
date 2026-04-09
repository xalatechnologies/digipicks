# @digipicks/ds Structure

This package follows the Xala SDK architecture pattern with a clear component hierarchy:

## Directory Structure

```
src/
├── primitives/     # Low-level building blocks
│   ├── container.tsx
│   ├── grid.tsx
│   ├── stack.tsx
│   └── index.ts
├── composed/       # Mid-level components
│   ├── content-layout.tsx
│   ├── content-section.tsx
│   ├── page-header.tsx
│   └── index.ts
├── blocks/         # Business logic components (coming soon)
│   └── index.ts
├── shells/         # Application-level layouts
│   ├── shell.tsx
│   └── index.ts
├── utils.ts        # Utility functions
├── provider.tsx    # Theme provider
└── index.ts        # Main exports
```

## Component Hierarchy

### 1. Primitives (Low-level)

- **Container**: Wrapper with max-width, padding, and fluid options
- **Grid**: CSS Grid layout with gap and spacing controls
- **Stack**: Flexbox stack for vertical/horizontal layouts
- **All Digdir components**: Button, Input, Card, etc. (re-exported)

### 2. Composed (Mid-level)

Built from primitives:

- **ContentLayout**: Page layout with optional grid and header offset
- **ContentSection**: Section wrapper with title, subtitle, and spacing
- **PageHeader**: Page header with actions and breadcrumbs

### 3. Blocks (Business logic)

Coming soon:

- StatsGrid, KPICard, DataCard
- FormBlock, ToolbarBlock
- EmptyState, etc.

### 4. Shells (Application level)

- **AppShell**: Complete application layout with header/footer

## Usage Example

```tsx
import {
  AppShell, // Shell
  ContentLayout, // Composed
  ContentSection, // Composed
  Grid, // Primitive
  Container, // Primitive
} from '@digipicks/ds';

function MyApp() {
  return (
    <AppShell title="My App">
      <ContentLayout>
        <ContentSection title="Dashboard">
          <Grid columns="repeat(3, 1fr)" gap={24}>
            <Card>Content</Card>
          </Grid>
        </ContentSection>
      </ContentLayout>
    </AppShell>
  );
}
```

## Design Principles

1. **Clear separation**: Each layer has a specific responsibility
2. **Composable**: Higher-level components use lower-level ones
3. **Flexible**: All components accept className and style props
4. **TypeScript**: Full type safety with proper interfaces
5. **Forward refs**: All components support ref forwarding

## Industry Standards

- **Max-width**: 1440px default (adjustable)
- **Padding**: 32px default (responsive)
- **Grid gaps**: 24px default
- **Section spacing**: 32px default
