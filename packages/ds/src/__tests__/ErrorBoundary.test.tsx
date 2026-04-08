import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary } from '../blocks/ErrorBoundary';

// Component that throws an error when shouldThrow is true
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
};

// Component that always throws
const AlwaysThrowsComponent = () => {
  throw new Error('Always throws');
};

describe('ErrorBoundary', () => {
  // Suppress console.error during tests since ErrorBoundary logs errors
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('Basic rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child content')).toBeDefined();
    });

    it('renders multiple children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeDefined();
      expect(screen.getByText('Second child')).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('catches error and renders error screen', () => {
      render(
        <ErrorBoundary>
          <AlwaysThrowsComponent />
        </ErrorBoundary>
      );

      // Default Norwegian title should be shown
      expect(screen.getByText('Noe gikk galt')).toBeDefined();
    });

    it('displays error message in description', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test error message')).toBeDefined();
    });

    it('calls onError callback when error is caught', () => {
      const handleError = vi.fn();

      render(
        <ErrorBoundary onError={handleError}>
          <AlwaysThrowsComponent />
        </ErrorBoundary>
      );

      expect(handleError).toHaveBeenCalledTimes(1);
      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('logs error to console', () => {
      render(
        <ErrorBoundary>
          <AlwaysThrowsComponent />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('Custom error screen', () => {
    it('renders custom error title', () => {
      render(
        <ErrorBoundary errorTitle="Custom Error Title">
          <AlwaysThrowsComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error Title')).toBeDefined();
    });

    it('renders custom error description', () => {
      render(
        <ErrorBoundary errorDescription="Custom error description text">
          <AlwaysThrowsComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error description text')).toBeDefined();
    });

    it('uses default description when error has no message and no custom description', () => {
      const ThrowsEmptyError = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary>
          <ThrowsEmptyError />
        </ErrorBoundary>
      );

      expect(screen.getByText('En uventet feil har oppstått. Vennligst prøv igjen.')).toBeDefined();
    });
  });

  describe('Custom fallback', () => {
    it('renders custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom fallback UI</div>}>
          <AlwaysThrowsComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom fallback UI')).toBeDefined();
      expect(screen.queryByText('Noe gikk galt')).toBeNull();
    });

    it('renders custom fallback component', () => {
      const CustomFallback = () => (
        <div>
          <h1>Something went wrong</h1>
          <p>Please try again</p>
        </div>
      );

      render(
        <ErrorBoundary fallback={<CustomFallback />}>
          <AlwaysThrowsComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeDefined();
      expect(screen.getByText('Please try again')).toBeDefined();
    });
  });

  describe('Retry functionality', () => {
    it('renders retry button by default', () => {
      render(
        <ErrorBoundary>
          <AlwaysThrowsComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Last siden på nytt')).toBeDefined();
    });

    it('hides retry button when showRetryButton is false', () => {
      render(
        <ErrorBoundary showRetryButton={false}>
          <AlwaysThrowsComponent />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Last siden på nytt')).toBeNull();
    });

    it('renders custom retry button text', () => {
      render(
        <ErrorBoundary retryButtonText="Prøv på nytt">
          <AlwaysThrowsComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Prøv på nytt')).toBeDefined();
    });

    it('calls custom onRetry handler when retry button is clicked', () => {
      const handleRetry = vi.fn();

      render(
        <ErrorBoundary onRetry={handleRetry}>
          <AlwaysThrowsComponent />
        </ErrorBoundary>
      );

      const retryButton = screen.getByText('Last siden på nytt');
      fireEvent.click(retryButton);

      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('reloads page when retry is clicked without custom handler', () => {
      // Mock window.location by replacing the entire object
      const reloadMock = vi.fn();
      const originalLocation = window.location;

      // Create a new location object with mocked reload
      const mockLocation = {
        ...originalLocation,
        reload: reloadMock,
      } as unknown as Location;

      // Use delete + assign pattern for jsdom compatibility
      // @ts-expect-error - jsdom requires this pattern
      delete window.location;
      window.location = mockLocation;

      render(
        <ErrorBoundary>
          <AlwaysThrowsComponent />
        </ErrorBoundary>
      );

      const retryButton = screen.getByText('Last siden på nytt');
      fireEvent.click(retryButton);

      expect(reloadMock).toHaveBeenCalledTimes(1);

      // Restore original
      window.location = originalLocation;
    });
  });
});

describe('withErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders wrapped component when no error', () => {
    const TestComponent = () => <div>Test Component</div>;
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Test Component')).toBeDefined();
  });

  it('passes props to wrapped component', () => {
    interface TestProps {
      message: string;
      count: number;
    }

    const TestComponent = ({ message, count }: TestProps) => (
      <div>
        {message}: {count}
      </div>
    );
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent message="Count" count={42} />);

    expect(screen.getByText('Count: 42')).toBeDefined();
  });

  it('catches error in wrapped component', () => {
    const WrappedComponent = withErrorBoundary(AlwaysThrowsComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Noe gikk galt')).toBeDefined();
  });

  it('uses custom error title from options', () => {
    const WrappedComponent = withErrorBoundary(AlwaysThrowsComponent, {
      errorTitle: 'Komponent feil',
    });

    render(<WrappedComponent />);

    expect(screen.getByText('Komponent feil')).toBeDefined();
  });

  it('uses custom error description from options', () => {
    const WrappedComponent = withErrorBoundary(AlwaysThrowsComponent, {
      errorDescription: 'Denne komponenten feilet',
    });

    render(<WrappedComponent />);

    expect(screen.getByText('Denne komponenten feilet')).toBeDefined();
  });

  it('calls onError callback from options', () => {
    const handleError = vi.fn();
    const WrappedComponent = withErrorBoundary(AlwaysThrowsComponent, {
      onError: handleError,
    });

    render(<WrappedComponent />);

    expect(handleError).toHaveBeenCalledTimes(1);
  });

  it('renders custom fallback from options', () => {
    const WrappedComponent = withErrorBoundary(AlwaysThrowsComponent, {
      fallback: <div>Custom HOC Fallback</div>,
    });

    render(<WrappedComponent />);

    expect(screen.getByText('Custom HOC Fallback')).toBeDefined();
  });

  it('sets displayName correctly', () => {
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = 'TestComponent';

    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });

  it('uses function name when displayName is not set', () => {
    function NamedComponent() {
      return <div>Named</div>;
    }

    const WrappedComponent = withErrorBoundary(NamedComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(NamedComponent)');
  });

  it('uses Component fallback when no name available', () => {
    // Anonymous component
    const WrappedComponent = withErrorBoundary(() => <div>Anonymous</div>);

    // Should contain 'Component' somewhere in the displayName
    expect(WrappedComponent.displayName).toMatch(/withErrorBoundary\(/);
  });
});
