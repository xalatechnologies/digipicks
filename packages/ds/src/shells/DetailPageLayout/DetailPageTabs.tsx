import { useState } from 'react';
import styles from './DetailPageTabs.module.css';

export interface Tab {
    id: string;
    label: string;
    content: React.ReactNode;
    badge?: React.ReactNode;
}

export interface DetailPageTabsProps {
    tabs: Tab[];
    defaultTab?: string;
    onChange?: (tabId: string) => void;
}

export function DetailPageTabs({ tabs, defaultTab, onChange }: DetailPageTabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        onChange?.(tabId);
    };

    const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

    return (
        <div className={styles.tabs}>
            <div className={styles.tabList} role="tablist">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        className={styles.tab}
                        data-active={activeTab === tab.id}
                        onClick={() => handleTabChange(tab.id)}
                    >
                        <span className={styles.tabLabel}>{tab.label}</span>
                        {tab.badge && <span className={styles.tabBadge}>{tab.badge}</span>}
                    </button>
                ))}
            </div>

            <div className={styles.tabPanel} role="tabpanel">
                {activeTabContent}
            </div>
        </div>
    );
}
