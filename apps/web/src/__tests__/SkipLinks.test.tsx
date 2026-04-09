/**
 * SkipLinks Integration Tests
 *
 * SkipLinks from @digipicks/ds. These tests verify integration and basic accessibility.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SkipLinks } from '@digipicks/ds';

expect.extend(toHaveNoViolations);

describe('SkipLinks', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="main-content">Main Content</div>
      <div id="main-navigation">Navigation</div>
    `;
  });

  describe('Accessibility Compliance', () => {
    it('should not have any accessibility violations', async () => {
      const { container } = render(<SkipLinks />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('should meet WCAG 2.4.1 Level A (Bypass Blocks)', async () => {
      const { container } = render(<SkipLinks />);
      expect(await axe(container)).toHaveNoViolations();

      const skipToContent = screen.getByText('Hopp til hovedinnhold');
      const skipToNav = screen.getByText('Hopp til navigasjon');

      expect(skipToContent).toBeInTheDocument();
      expect(skipToNav).toBeInTheDocument();
      expect(skipToContent).toHaveAttribute('href', '#main-content');
      expect(skipToNav).toHaveAttribute('href', '#main-navigation');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be keyboard accessible', async () => {
      render(<SkipLinks />);
      const user = userEvent.setup();
      await user.tab();
      const focused = screen.getByText('Hopp til hovedinnhold');
      expect(focused).toHaveFocus();
    });

    it('should navigate through both skip links with Tab', async () => {
      render(<SkipLinks />);
      const user = userEvent.setup();
      await user.tab();
      expect(screen.getByText('Hopp til hovedinnhold')).toHaveFocus();
      await user.tab();
      expect(screen.getByText('Hopp til navigasjon')).toHaveFocus();
    });
  });

  describe('Semantic HTML', () => {
    it('should use proper anchor elements', () => {
      render(<SkipLinks />);
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);
      links.forEach((link) => {
        expect(link.tagName).toBe('A');
        expect(link.getAttribute('href')).toBeTruthy();
      });
    });

    it('should have descriptive link text', () => {
      render(<SkipLinks />);
      const skipToContent = screen.getByText('Hopp til hovedinnhold');
      const skipToNav = screen.getByText('Hopp til navigasjon');
      expect(skipToContent.textContent).not.toMatch(/klikk|click/i);
      expect(skipToNav.textContent).not.toMatch(/klikk|click/i);
    });
  });

  describe('Norwegian Language', () => {
    it('should use correct Norwegian labels', () => {
      render(<SkipLinks />);
      expect(screen.getByText('Hopp til hovedinnhold')).toBeInTheDocument();
      expect(screen.getByText('Hopp til navigasjon')).toBeInTheDocument();
    });
  });
});
