# DS Component Dictionary

This dictionary maps raw HTML elements and common UI patterns to their `@digilist-saas/ds` design system equivalents.
It also includes the Norwegian Bokmal (nb) terminology used across the platform.

Enforced by ESLint rules: `xala/no-raw-html`, `xala/no-inline-svg`, `xala/require-css-modules`.

---

## HTML Element → DS Component Mapping

### Typography

| Raw HTML | DS Component | Norwegian (nb) | Notes |
|----------|-------------|-----------------|-------|
| `<h1>`–`<h6>` | `<Heading level={1..6}>` | Overskrift | Use `data-size` for visual sizing |
| `<p>` | `<Paragraph>` | Avsnitt | Use `data-size="sm"` for smaller text |
| `<strong>`, `<b>` | `<Paragraph data-weight="bold">` | Uthevet tekst | Or use CSS `font-weight` |
| `<em>`, `<i>` | `<Paragraph>` + CSS | Kursiv tekst | Use `font-style: italic` in CSS module |

### Form Elements

| Raw HTML | DS Component | Norwegian (nb) | Notes |
|----------|-------------|-----------------|-------|
| `<input type="text">` | `<Textfield>` | Tekstfelt | Includes label, error, description |
| `<input type="email">` | `<Textfield type="email">` | E-postfelt | |
| `<input type="password">` | `<Textfield type="password">` | Passordfelt | |
| `<input type="number">` | `<Textfield type="number">` | Tallfelt | |
| `<input type="search">` | `<SearchBar>` | Sokefelt | Full search with results |
| `<input type="checkbox">` | `<Checkbox>` | Avkryssingsboks | |
| `<input type="radio">` | `<Radio>` | Radioknapp | Wrap in `<Radio.Group>` |
| `<input type="file">` | `<FileUpload>` | Filopplasting | |
| `<select>` | `<NativeSelect>` or `<Select>` | Nedtrekksliste | `NativeSelect` for simple cases |
| `<textarea>` | `<Textarea>` | Tekstomrade | |
| `<button>` | `<Button>` | Knapp | Variants: `primary`, `secondary`, `tertiary` |
| `<fieldset>` | `<Fieldset>` | Feltsett | |
| `<label>` | `<Label>` | Etikett | Allowed as raw HTML in special cases |
| `<form>` | — | Skjema | No DS wrapper; use native `<form>` |

### Data Display

| Raw HTML | DS Component | Norwegian (nb) | Notes |
|----------|-------------|-----------------|-------|
| `<table>` | `<DataTable>` | Tabell | Full sorting, pagination, actions |
| `<ul>`, `<ol>` | `<List>` | Liste | Digdir `List` component |
| `<details>` | `<Accordion>` | Trekkspill | Digdir `Accordion` component |
| `<dialog>` | `<ConfirmDialog>` / `<AlertDialog>` | Dialog | Use `DialogProvider` |
| `<img>` | — | Bilde | No DS wrapper; use native `<img>` |

### Navigation

| Raw HTML | DS Component | Norwegian (nb) | Notes |
|----------|-------------|-----------------|-------|
| `<nav>` | `<Sidebar>` / `<BottomNavigation>` | Navigasjon | Layout-level components |
| `<a>` | — | Lenke | Allowed as raw; use `<Link>` from router |

### Inline Elements

| Raw HTML | DS Component | Norwegian (nb) | Notes |
|----------|-------------|-----------------|-------|
| `<svg>` | Icon components (`SearchIcon`, etc.) | Ikon | 60+ icons available in DS |
| `<span>` | — | — | Allowed; use sparingly |
| `<div>` | `<Stack>`, `<Grid>`, `<Container>` | — | Prefer layout primitives |

---

## DS Component Vocabulary (Norwegian)

### Layout Components

| Component | Norwegian (nb) | English | Usage |
|-----------|---------------|---------|-------|
| `Container` | Beholder | Container | Max-width wrapper |
| `Grid` | Rutenett | Grid | CSS Grid layout |
| `Stack` | Stabel | Stack | Flex column/row layout |
| `Sidebar` | Sidemeny | Sidebar | Navigation sidebar |
| `BottomNavigation` | Bunnnavigasjon | Bottom navigation | Mobile navigation |
| `Breadcrumb` | Brodsmulesti | Breadcrumb | Navigation trail |
| `BackButton` | Tilbakeknapp | Back button | Go back navigation |

### Interactive Components

| Component | Norwegian (nb) | English | Usage |
|-----------|---------------|---------|-------|
| `Button` | Knapp | Button | Primary action trigger |
| `Tabs` / `PillTabs` | Faner | Tabs | Content switching |
| `Accordion` | Trekkspill | Accordion | Collapsible sections |
| `Dropdown` / `PillDropdown` | Nedtrekksmeny | Dropdown menu | Selection menu |
| `NativeSelect` | Nedtrekksliste | Dropdown list / Select | Form select |
| `Select` | Velger | Select/Picker | Custom select |
| `Checkbox` | Avkryssingsboks | Checkbox | Toggle option |
| `Radio` | Radioknapp | Radio button | Single choice |
| `Switch` | Bryter | Toggle switch | On/off switch |
| `Textfield` | Tekstfelt | Text input | Single-line input |
| `Textarea` | Tekstomrade | Text area | Multi-line input |
| `SearchBar` | Sokefelt | Search bar | Search with results |
| `FilterDropdown` | Filtermeny | Filter dropdown | Filter selection |
| `SlotGrid` | Tidsvelger | Time slot grid | Booking time picker |
| `StarRating` | Stjernevurdering | Star rating | Rating input |
| `FileUpload` | Filopplasting | File upload | File selector |
| `Drawer` | Skuff | Drawer | Side panel |
| `Modal` / `Dialog` | Dialog / Modal | Modal dialog | Overlay dialog |

### Feedback Components

| Component | Norwegian (nb) | English | Usage |
|-----------|---------------|---------|-------|
| `Spinner` | Lasteindikator | Loading spinner | Loading state |
| `LoadingScreen` | Lasteskjerm | Loading screen | Full-page loading |
| `EmptyState` | Tomt innhold | Empty state | No data placeholder |
| `ErrorState` | Feiltilstand | Error state | Error placeholder |
| `LoadingState` | Lastetilstand | Loading state | Loading placeholder |
| `Toast` | Varselbanner | Toast notification | Brief notification |
| `StatusBadge` | Statusmerke | Status badge | Status indicator |
| `StatusDot` | Statusprikk | Status dot | Small status indicator |
| `Badge` | Merke | Badge | Count/label badge |
| `Alert` | Varsel | Alert | Important message |
| `ErrorBoundary` | Feilgrense | Error boundary | Error recovery |

### Data Components

| Component | Norwegian (nb) | English | Usage |
|-----------|---------------|---------|-------|
| `DataTable` | Datatabell | Data table | Sortable data grid |
| `StatCard` | Statistikkort | Stat card | KPI display |
| `ActivityFeed` | Aktivitetslogg | Activity feed | Event timeline |
| `BookingListItem` | Bookingoppforing | Booking list item | Booking entry |
| `ConversationList` | Samtaleliste | Conversation list | Message threads |
| `ChatThread` | Meldingstrad | Chat thread | Message thread |
| `NotificationBell` | Varselbjelle | Notification bell | Notification trigger |

### Page Structure

| Component | Norwegian (nb) | English | Usage |
|-----------|---------------|---------|-------|
| `PageHeader` | Sideoverskrift | Page header | Top-of-page header |
| `ContentLayout` | Innholdslayout | Content layout | Page content wrapper |
| `ContentSection` | Innholdsseksjon | Content section | Section wrapper |
| `FormSection` | Skjemaseksjon | Form section | Grouped form fields |
| `FormActions` | Skjemahandlinger | Form actions | Submit/cancel buttons |
| `SettingsSection` | Innstillingsseksjon | Settings section | Settings group |
| `SettingsToggle` | Innstillingsbryter | Settings toggle | On/off setting |
| `InfoBox` | Informasjonsboks | Info box | Contextual info |

---

## How to Use

### In ESLint Rule Messages

The `xala/no-raw-html` rule provides actionable messages:

```
Use <Button> from @digilist-saas/ds instead of <button>.
Use <Textfield>, <Checkbox>, or <Radio> from @digilist-saas/ds instead of <input>.
Use <Select> or <NativeSelect> from @digilist-saas/ds instead of <select>.
Use <Heading level={N}> from @digilist-saas/ds instead of <hN>.
Use <Paragraph> from @digilist-saas/ds instead of <p>.
Use <DataTable> or DS Table from @digilist-saas/ds instead of <table>.
```

### In Code Reviews

When reviewing code, reference this dictionary to suggest correct DS components:

```tsx
// BAD: Raw HTML
<button onClick={handleClick}>Lagre</button>
<input type="text" placeholder="Sok..." />
<select>
  <option>Valg 1</option>
</select>

// GOOD: DS Components
<Button onClick={handleClick}>{t('common.save')}</Button>
<Textfield placeholder={t('action.search')} />
<NativeSelect>
  <option>{t('option.choice1')}</option>
</NativeSelect>
```

### In i18n Keys

Use the Norwegian terminology from this dictionary when creating translation keys:

```json
{
  "ui": {
    "button": "Knapp",
    "dropdown": "Nedtrekksmeny",
    "tabs": "Faner",
    "checkbox": "Avkryssingsboks",
    "searchField": "Sokefelt",
    "dialog": "Dialog",
    "accordion": "Trekkspill",
    "sidebar": "Sidemeny",
    "breadcrumb": "Brodsmulesti"
  }
}
```
