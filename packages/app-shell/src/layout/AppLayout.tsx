import type { ReactNode } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    sidebar?: ReactNode;
    header?: ReactNode;
    footer?: ReactNode;
}

/**
 * Standard app layout wrapper
 * Apps customize by providing their own sidebar, header, footer
 */
export function AppLayout({ children, sidebar, header, footer }: AppLayoutProps) {
    return (
        <div className="app-layout">
            {header && <header className="app-header">{header}</header>}
            <div className="app-body">
                {sidebar && <aside className="app-sidebar">{sidebar}</aside>}
                <main className="app-main">{children}</main>
            </div>
            {footer && <footer className="app-footer">{footer}</footer>}
        </div>
    );
}
