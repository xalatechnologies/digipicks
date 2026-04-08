/**
 * Broadcasts Page
 *
 * Creator view: list of sent broadcasts with compose button.
 * Subscriber view: inbox of received broadcasts.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '@digilist-saas/i18n';
import {
    Button,
    Heading,
    Paragraph,
    Card,
    Spinner,
    Tag,
    EmptyState,
    PageContentLayout,
    PlusIcon,
} from '@digilist-saas/ds';
import {
    useCreatorBroadcasts,
    useSubscriberBroadcasts,
    useDeleteBroadcast,
    useMarkBroadcastRead,
} from '@digilist-saas/sdk';
import { useAuthBridge } from '@digilist-saas/app-shell';
import styles from './broadcasts.module.css';

// ─────────────────────────── Helpers ───────────────────────────

function typeLabel(type: string): string {
    switch (type) {
        case 'text_update': return 'Update';
        case 'pick_alert': return 'Pick Alert';
        case 'announcement': return 'Announcement';
        default: return type;
    }
}

function typeColor(type: string): 'info' | 'success' | 'warning' | 'neutral' {
    switch (type) {
        case 'pick_alert': return 'success';
        case 'announcement': return 'warning';
        default: return 'info';
    }
}

function formatDate(ts: number | undefined): string {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ─────────────────────────── Creator Sent View ───────────────────────────

function CreatorBroadcastsView() {
    const { t } = useT();
    const navigate = useNavigate();
    const { tenantId, userId } = useAuthBridge();
    const { broadcasts, isLoading } = useCreatorBroadcasts(tenantId, userId);
    const { mutateAsync: deleteBroadcast } = useDeleteBroadcast();

    if (isLoading) {
        return <Spinner aria-label={t('common.loading')} />;
    }

    return (
        <PageContentLayout>
            <div className={styles.page}>
                <div className={styles.header}>
                    <Heading data-size="md">{t('broadcasts.title', 'Broadcasts')}</Heading>
                    <Button
                        data-size="sm"
                        onClick={() => navigate('/broadcasts/compose')}
                    >
                        <PlusIcon aria-hidden />
                        {t('broadcasts.compose', 'New Broadcast')}
                    </Button>
                </div>

                {broadcasts.length === 0 ? (
                    <div className={styles.emptyState}>
                        <EmptyState
                            title={t('broadcasts.empty', 'No broadcasts yet')}
                            description={t('broadcasts.emptyDesc', 'Send your first broadcast to your subscribers.')}
                        />
                    </div>
                ) : (
                    broadcasts.map((b) => (
                        <Card key={b.id} className={styles.broadcastCard}>
                            <Heading data-size="xs">{b.title}</Heading>
                            <Paragraph data-size="sm">{b.body}</Paragraph>
                            <div className={styles.broadcastMeta}>
                                <Tag data-size="sm" data-color={typeColor(b.messageType)}>
                                    {typeLabel(b.messageType)}
                                </Tag>
                                <Paragraph data-size="sm">
                                    {b.recipientCount} {t('broadcasts.recipients', 'recipients')}
                                </Paragraph>
                                <Paragraph data-size="sm">
                                    {formatDate(b.sentAt)}
                                </Paragraph>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </PageContentLayout>
    );
}

// ─────────────────────────── Subscriber Inbox View ───────────────────────────

function SubscriberBroadcastsView() {
    const { t } = useT();
    const { tenantId, userId } = useAuthBridge();
    const [unreadOnly, setUnreadOnly] = useState(false);
    const { broadcasts, isLoading } = useSubscriberBroadcasts(tenantId, userId, { unreadOnly });
    const { mutateAsync: markRead } = useMarkBroadcastRead();

    if (isLoading) {
        return <Spinner aria-label={t('common.loading')} />;
    }

    return (
        <PageContentLayout>
            <div className={styles.page}>
                <div className={styles.header}>
                    <Heading data-size="md">{t('broadcasts.inbox', 'Messages')}</Heading>
                    <Button
                        data-size="sm"
                        variant={unreadOnly ? 'primary' : 'secondary'}
                        onClick={() => setUnreadOnly(!unreadOnly)}
                    >
                        {unreadOnly
                            ? t('broadcasts.showAll', 'Show All')
                            : t('broadcasts.unreadOnly', 'Unread Only')}
                    </Button>
                </div>

                {broadcasts.length === 0 ? (
                    <div className={styles.emptyState}>
                        <EmptyState
                            title={t('broadcasts.inboxEmpty', 'No messages')}
                            description={t('broadcasts.inboxEmptyDesc', 'Broadcasts from creators you follow will appear here.')}
                        />
                    </div>
                ) : (
                    broadcasts.map((b) => (
                        <Card
                            key={b.id}
                            className={`${styles.broadcastCard} ${!b.readAt ? styles.unread : ''}`}
                            onClick={() => {
                                if (!b.readAt && userId) {
                                    markRead({ userId: userId as any, broadcastId: b.id });
                                }
                            }}
                        >
                            <Heading data-size="xs">{b.title}</Heading>
                            {b.creator && (
                                <Paragraph data-size="sm">
                                    {b.creator.displayName ?? b.creator.name}
                                </Paragraph>
                            )}
                            <Paragraph data-size="sm">{b.body}</Paragraph>
                            <div className={styles.broadcastMeta}>
                                <Tag data-size="sm" data-color={typeColor(b.messageType)}>
                                    {typeLabel(b.messageType)}
                                </Tag>
                                <Paragraph data-size="sm">
                                    {formatDate(b.sentAt)}
                                </Paragraph>
                                {!b.readAt && (
                                    <Tag data-size="sm" data-color="info">
                                        {t('broadcasts.unread', 'New')}
                                    </Tag>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </PageContentLayout>
    );
}

// ─────────────────────────── Main Export ───────────────────────────

/**
 * BroadcastsPage shows creator view (sent + compose) by default.
 * The subscriber inbox is a separate route.
 */
export function BroadcastsPage() {
    return <CreatorBroadcastsView />;
}

export function BroadcastInboxPage() {
    return <SubscriberBroadcastsView />;
}
