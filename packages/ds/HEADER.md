# Header Components

The header system provides a flexible, accessible application header following the Xala SDK architecture.

## Components

### AppHeader
Main header container with three sections:
- **Left**: Logo
- **Middle**: Search (optional)
- **Right**: Actions

```tsx
<AppHeader
  logo={<HeaderLogo src="/logo.svg" title="My App" />}
  search={<HeaderSearch onSearch={handleSearch} />}
  actions={
    <HeaderActions>
      <HeaderThemeToggle onToggle={handleTheme} />
      <HeaderLanguageSwitch language="en" onSwitch={setLang} />
      <HeaderLoginButton isLoggedIn onLogout={handleLogout} />
    </HeaderActions>
  }
/>
```

### HeaderLogo
Displays logo image and/or text:

```tsx
<HeaderLogo
  src="/logo.svg"        // Optional image
  title="My App"         // Optional text
  height="32px"          // Logo height
/>
```

### HeaderSearch
Search input with callback:

```tsx
<HeaderSearch
  placeholder="Search..."
  onSearch={(value) => console.log(value)}
/>
```

### HeaderActions
Container for action buttons:

```tsx
<HeaderActions spacing={8}>
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</HeaderActions>
```

### HeaderActionButton
Styled button for header actions:

```tsx
<HeaderActionButton onClick={handleClick}>
  Icon
</HeaderActionButton>
```

### HeaderThemeToggle
Theme switching button (cycles through themes):

```tsx
<HeaderThemeToggle onToggle={() => setTheme(nextTheme)} />
```

### HeaderLanguageSwitch
Language switcher with flag icons:

```tsx
<HeaderLanguageSwitch
  language="en"
  onSwitch={(lang) => setLanguage(lang)}
/>
```

### HeaderLoginButton
Login/logout button with state:

```tsx
<HeaderLoginButton
  isLoggedIn={true}
  userName="John Doe"
  onLogin={handleLogin}
  onLogout={handleLogout}
/>
```

## Styling

The header uses Digdir Designsystemet tokens:
- Height: 64px (default)
- Background: `var(--ds-colors-surface-default)`
- Border: Optional bottom border
- Sticky positioning with z-index: 100

## Accessibility

- Semantic `<header>` element
- Proper ARIA labels on interactive elements
- Keyboard navigation support
- Focus management

## Integration with AppShell

```tsx
<AppShell
  header={
    <AppHeader>
      {/* Header content */}
    </AppHeader>
  }
>
  {/* Page content */}
</AppShell>
```
