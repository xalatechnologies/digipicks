import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Drawer, DrawerSection, DrawerItem, DrawerEmptyState } from '../composed/Drawer';

describe('Drawer', () => {
  beforeEach(() => {
    // Reset body overflow style before each test
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Clean up body overflow after each test
    document.body.style.overflow = '';
  });

  describe('Basic rendering', () => {
    it('renders children when open', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}}>
          <div>Drawer content</div>
        </Drawer>
      );

      expect(screen.getByText('Drawer content')).toBeInTheDocument();
    });

    it('renders title when provided', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}} title="Filter Options">
          <div>Content</div>
        </Drawer>
      );

      expect(screen.getByText('Filter Options')).toBeInTheDocument();
    });

    it('renders close button when title is provided', () => {
      const handleClose = vi.fn();
      render(
        <Drawer isOpen={true} onClose={handleClose} title="Options">
          <div>Content</div>
        </Drawer>
      );

      const closeButton = screen.getByLabelText('Lukk');
      expect(closeButton).toBeInTheDocument();
    });

    it('renders badge count when provided', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}} title="Cart" badge={5}>
          <div>Content</div>
        </Drawer>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows 99+ when badge count exceeds 99', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}} title="Notifications" badge={150}>
          <div>Content</div>
        </Drawer>
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('renders footer when provided', () => {
      render(
        <Drawer
          isOpen={true}
          onClose={() => {}}
          footer={<button type="button">Submit</button>}
        >
          <div>Content</div>
        </Drawer>
      );

      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Drawer isOpen={true} onClose={handleClose} title="Options">
          <div>Content</div>
        </Drawer>
      );

      const closeButton = screen.getByLabelText('Lukk');
      fireEvent.click(closeButton);

      expect(handleClose).toHaveBeenCalled();
    });

    it('calls onClose when overlay is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Drawer isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Drawer>
      );

      // Find the overlay by its style/position
      const overlay = document.querySelector('[aria-hidden="true"]');
      if (overlay) fireEvent.click(overlay);

      expect(handleClose).toHaveBeenCalled();
    });

    it('does not call onClose when overlay is clicked with closeOnOverlayClick=false', () => {
      const handleClose = vi.fn();
      render(
        <Drawer isOpen={true} onClose={handleClose} closeOnOverlayClick={false}>
          <div>Content</div>
        </Drawer>
      );

      const overlay = document.querySelector('[aria-hidden="true"]');
      if (overlay) fireEvent.click(overlay);

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <Drawer isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Drawer>
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(handleClose).toHaveBeenCalled();
    });

    it('does not call onClose on Escape when closeOnEscape=false', () => {
      const handleClose = vi.fn();
      render(
        <Drawer isOpen={true} onClose={handleClose} closeOnEscape={false}>
          <div>Content</div>
        </Drawer>
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}} aria-label="Filter panel">
          <div>Content</div>
        </Drawer>
      );

      const drawer = screen.getByRole('dialog');
      expect(drawer).toHaveAttribute('aria-modal', 'true');
      expect(drawer).toHaveAttribute('aria-label', 'Filter panel');
    });

    it('uses title as aria-label when no explicit aria-label', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}} title="Filters">
          <div>Content</div>
        </Drawer>
      );

      const drawer = screen.getByRole('dialog');
      expect(drawer).toHaveAttribute('aria-label', 'Filters');
    });

    it('locks body scroll when open', () => {
      render(
        <Drawer isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Drawer>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });
  });
});

describe('DrawerSection', () => {
  it('renders title', () => {
    render(
      <DrawerSection title="Section Title">
        <div>Content</div>
      </DrawerSection>
    );

    expect(screen.getByText('Section Title')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(
      <DrawerSection title="Title" description="Section description">
        <div>Content</div>
      </DrawerSection>
    );

    expect(screen.getByText('Section description')).toBeInTheDocument();
  });

  it('toggles collapsed state when collapsible', () => {
    render(
      <DrawerSection title="Collapsible Section" collapsible>
        <div>Hidden content</div>
      </DrawerSection>
    );

    expect(screen.getByText('Hidden content')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByText('Collapsible Section'));

    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('starts collapsed when defaultCollapsed is true', () => {
    render(
      <DrawerSection title="Section" collapsible defaultCollapsed>
        <div>Hidden content</div>
      </DrawerSection>
    );

    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });
});

describe('DrawerItem', () => {
  it('renders children', () => {
    render(<DrawerItem>Item text</DrawerItem>);
    expect(screen.getByText('Item text')).toBeInTheDocument();
  });

  it('renders left slot content', () => {
    render(
      <DrawerItem left={<span>Icon</span>}>
        Item text
      </DrawerItem>
    );

    expect(screen.getByText('Icon')).toBeInTheDocument();
  });

  it('renders right slot content', () => {
    render(
      <DrawerItem right={<span>Count: 5</span>}>
        Item text
      </DrawerItem>
    );

    expect(screen.getByText('Count: 5')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<DrawerItem onClick={handleClick}>Clickable</DrawerItem>);

    fireEvent.click(screen.getByText('Clickable'));

    expect(handleClick).toHaveBeenCalled();
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <DrawerItem onClick={handleClick} disabled>
        Disabled
      </DrawerItem>
    );

    fireEvent.click(screen.getByText('Disabled'));

    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe('DrawerEmptyState', () => {
  it('renders title', () => {
    render(<DrawerEmptyState title="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(
      <DrawerEmptyState
        title="No items"
        description="Start adding items to see them here"
      />
    );

    expect(screen.getByText('Start adding items to see them here')).toBeInTheDocument();
  });

  it('renders action button', () => {
    render(
      <DrawerEmptyState
        title="No items"
        action={<button type="button">Add item</button>}
      />
    );

    expect(screen.getByText('Add item')).toBeInTheDocument();
  });
});
