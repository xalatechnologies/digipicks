# Accessibility Testing Guide - apps/web/

**Framework:** Vitest + jest-axe + @testing-library/react
**Coverage:** WCAG 2.1 Level AAA compliance testing
**Last Updated:** 2026-01-14

This guide explains how to test accessibility compliance using the testing infrastructure.

---

## 🧪 Quick Start

### Run All Tests
```bash
# Run all tests in watch mode
pnpm test

# Run tests once (CI mode)
pnpm vitest --run

# Run specific test file
pnpm vitest apps/web/src/components/SkipLinks.test.tsx

# Run with coverage
pnpm test:coverage
```

### Run Specific Test Suites
```bash
# Run only accessibility tests
pnpm vitest -- --grep "Accessibility"

# Run specific component tests
pnpm vitest apps/web/src/components/SkipLinks.test.tsx --run
```

---

## 📚 Testing Utilities

### Using jest-axe (Current)

Accessibility tests use `jest-axe` directly. Example:

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

expect.extend(toHaveNoViolations);

it('should not have accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Planned Test Utilities (Not Yet Implemented)

The following convenience helpers are **planned** but not yet implemented:

- `testAccessibility(component)` — Run axe and assert no violations
- `testWCAGCompliance(component, level)` — Check against specific WCAG level (A/AA/AAA)
- `testKeyboardNavigation(component)` — Keyboard navigation helpers (tabForward, pressEnter, etc.)
- `testScreenReaderAnnouncements(container)` — Find live regions, alerts, status
- `testFocusManagement()` — Focus and focus-indicator checks

To add these, create `src/test-utils/accessibility.ts` and implement the helpers. For now, use `jest-axe` and `@testing-library/react` directly. See existing tests in `SkipLinks.test.tsx` and `RealtimeToast.test.tsx` for patterns.

---

## 📝 Example Test Patterns

### Pattern 1: Complete Component Test
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MyComponent } from './MyComponent';

expect.extend(toHaveNoViolations);

describe('MyComponent', () => {
  describe('Accessibility Compliance', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<MyComponent />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be keyboard accessible', async () => {
      render(<MyComponent />);
      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);

      const user = userEvent.setup();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
```

### Pattern 2: Form Accessibility Test
```tsx
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

describe('Form Accessibility', () => {
  it('should have labels for all inputs', async () => {
    const { container } = render(<MyForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    const emailInput = screen.getByLabelText('E-post');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should announce validation errors', () => {
    const { container } = render(<MyForm />);

    const submitButton = screen.getByRole('button', { name: 'Send' });
    submitButton.click();

    const alerts = container.querySelectorAll('[role="alert"]');
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('should have autocomplete attributes', () => {
    render(<MyForm />);

    const emailInput = screen.getByLabelText('E-post');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
  });
});
```

### Pattern 3: Interactive Component Test
```tsx
import userEvent from '@testing-library/user-event';

describe('Modal Accessibility', () => {
  it('should trap focus within modal', async () => {
    render(<Modal isOpen />);
    const user = userEvent.setup();

    await user.tab();
    const firstButton = document.activeElement;

    await user.tab();
    await user.tab();

    // After last element, focus should cycle back (or stay in modal)
    expect(document.activeElement).toBeDefined();
  });

  it('should close on Escape key', async () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} />);
    const user = userEvent.setup();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
```

### Pattern 4: Dynamic Content Test
```tsx
describe('Toast Notifications', () => {
  it('should announce toasts to screen readers', async () => {
    const { rerender, container } = render(<ToastContainer />);

    rerender(<ToastContainer toast={{ type: 'success', message: 'Lagret!' }} />);

    const region = container.querySelector('[aria-live="polite"]');
    expect(region).toHaveTextContent('Lagret!');
  });

  it('should use assertive for errors', () => {
    const { container } = render(<ToastContainer toast={{ type: 'error', message: 'Feil!' }} />);

    const region = container.querySelector('[aria-live="assertive"]');
    expect(region).toBeInTheDocument();
  });
});
```

---

## 🎯 Common Accessibility Tests

### ✅ Skip Links
```tsx
it('should have skip links', async () => {
  render(<App />);

  const skipLink = screen.getByText('Hopp til hovedinnhold');
  expect(skipLink).toHaveAttribute('href', '#main-content');
});
```

### ✅ Landmark Regions
```tsx
it('should have proper landmarks', () => {
  render(<Page />);

  expect(screen.getByRole('banner')).toBeInTheDocument(); // header
  expect(screen.getByRole('main')).toBeInTheDocument(); // main
  expect(screen.getByRole('navigation')).toBeInTheDocument(); // nav
});
```

### ✅ Heading Hierarchy
```tsx
it('should have proper heading hierarchy', () => {
  render(<Page />);

  const headings = screen.getAllByRole('heading');
  expect(headings[0]).toHaveAttribute('aria-level', '1');
  expect(headings[1]).toHaveAttribute('aria-level', '2');
});
```

### ✅ Button Accessibility
```tsx
it('should have accessible buttons', () => {
  render(<MyComponent />);

  const button = screen.getByRole('button', { name: 'Lukk' });
  expect(button).toHaveAttribute('type', 'button');
  expect(button).toBeEnabled();
});
```

### ✅ Form Labels
```tsx
it('should associate labels with inputs', () => {
  render(<MyForm />);

  const input = screen.getByLabelText('E-post');
  expect(input).toHaveAttribute('id');
  expect(input).toHaveAttribute('type', 'email');
});
```

### ✅ Image Alt Text
```tsx
it('should have alt text for images', () => {
  render(<MyComponent />);

  const img = screen.getByAltText('Logo');
  expect(img).toBeInTheDocument();
});
```

### ✅ Color Contrast
```tsx
it('should use design tokens for colors', async () => {
  const { container } = await testAccessibility(<MyComponent />);
  const element = container.querySelector('.my-element');

  const style = window.getComputedStyle(element!);
  // Verify design tokens are used
  expect(element).toHaveStyle({
    color: expect.stringContaining('var(--ds-color-'),
  });
});
```

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Forgetting to Await
```tsx
// ❌ WRONG - Not awaiting axe()
it('test', () => {
  const results = axe(container); // Missing await!
});

// ✅ CORRECT
it('test', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Pitfall 2: Testing Implementation Details
```tsx
// ❌ WRONG - Testing class names
expect(element).toHaveClass('button-primary');

// ✅ CORRECT - Testing accessibility
expect(element).toHaveRole('button');
expect(element).toHaveAttribute('aria-pressed', 'false');
```

### Pitfall 3: Not Testing Keyboard Navigation
```tsx
// ❌ INCOMPLETE - Only testing mouse clicks
it('should open modal', () => {
  render(<Button onClick={openModal} />);
  fireEvent.click(screen.getByRole('button'));
});

// ✅ COMPLETE - Also testing keyboard
it('should open modal with keyboard', async () => {
  const { tabForward, pressEnter } = await testKeyboardNavigation(<Button />);
  await tabForward();
  await pressEnter();
});
```

### Pitfall 4: Ignoring Screen Reader Announcements
```tsx
// ❌ INCOMPLETE - Not testing announcements
it('should show error', () => {
  render(<Form error="Invalid email" />);
  expect(screen.getByText('Invalid email')).toBeInTheDocument();
});

// ✅ COMPLETE - Testing screen reader announcement
it('should announce error', () => {
  const { container } = render(<Form error="Invalid email" />);
  const alerts = container.querySelectorAll('[role="alert"]');
  expect(alerts[0]).toHaveTextContent('Invalid email');
});
```

---

## 📊 Coverage Goals

- **Overall:** 80%+ code coverage
- **Critical Components:** 100% accessibility test coverage
- **New Components:** Must include accessibility tests before merge

### Check Coverage
```bash
pnpm test:coverage

# View HTML report
open coverage/index.html
```

---

## 🔧 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run accessibility tests
  run: pnpm vitest --run

- name: Check coverage
  run: pnpm test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

---

## 📚 Resources

- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)
- [Testing Library Docs](https://testing-library.com/)
- [Vitest Documentation](https://vitest.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 🎓 Best Practices

1. **Test accessibility first** - Write accessibility tests before implementation tests
2. **Use semantic queries** - Prefer `getByRole` over `getByTestId`
3. **Test keyboard navigation** - All interactive elements must be keyboard accessible
4. **Test screen reader announcements** - Use aria-live regions for dynamic content
5. **Run tests locally** - Fix issues before pushing
6. **Keep tests simple** - One assertion per test when possible
7. **Use descriptive names** - Test names should explain what's being tested

---

**Need help?** Check `ACCESSIBILITY_GUIDE.md` or reach out to the team.

**Last Updated:** 2026-01-14
