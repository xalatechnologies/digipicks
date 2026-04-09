import React from 'react';
import { Button } from '@digipicks/ds';

/**
 * Example: Using asChild to render a Button as an anchor element.
 *
 * The asChild prop allows you to render the button's styles and behavior
 * on any valid HTML element or custom component while maintaining
 * accessibility and event handling.
 */
export function ButtonAsLink() {
  return (
    <Button asChild>
      <a href="https://example.com" target="_blank" rel="noopener noreferrer">
        This is a link that looks like a button
      </a>
    </Button>
  );
}

/**
 * Example: Button rendered as a custom router link component.
 *
 * This pattern is useful when integrating with routing libraries
 * like React Router, Next.js, or custom routing solutions.
 */
export function ButtonAsRouterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Button asChild>
      <RouterLink to={to}>{children}</RouterLink>
    </Button>
  );
}

// Dummy RouterLink component for demonstration
function RouterLink({
  to,
  children,
  ...props
}: { to: string; children: React.ReactNode } & React.HTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={to} {...props}>
      {children}
    </a>
  );
}

// ❌ Wrong: Multiple children under asChild
// export function WrongUsage() {
//   return (
//     <Button asChild>
//       <div>
//         <span>Icon</span>
//         <span>Text</span>
//       </div>
//     </Button>
//   );
// }

/**
 * Example: Single child containing complex content.
 *
 * While only one direct child is allowed with asChild, that child
 * can contain complex markup with multiple nested elements.
 */
export function ComplexSingleChild() {
  return (
    <Button asChild>
      <a href="#">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📦</span>
          <span>Complex content in single child</span>
        </span>
      </a>
    </Button>
  );
}

/**
 * Understanding the asChild pattern and Radix Slot behavior.
 *
 * The `asChild` pattern is powered by Radix UI's Slot component:
 *
 * @property {boolean} asChild - When true, merges component props with child
 * @property {ReactElement} child - The element that will be rendered
 *
 * Behavior:
 * - Slot merges props from Button to its child element
 * - The child element becomes the final rendered element
 * - Only ONE direct child is allowed under asChild
 * - Event handlers, classes, and accessibility props are transferred
 * - The child inherits all Button behaviors (onClick, disabled state, etc.)
 *
 * Common use cases:
 * - Render button as link (<a>) for navigation
 * - Render button as custom router link component
 * - Render form controls with semantic HTML elements
 *
 * @example
 * ```tsx
 * // Wrong - multiple children
 * <Button asChild>
 *   <div>
 *     <Icon />
 *     <Text />
 *   </div>
 * </Button>
 *
 * // Correct - single child with nested content
 * <Button asChild>
 *   <a href="#">
 *     <Icon />
 *     <Text />
 *   </a>
 * </Button>
 * ```
 */
