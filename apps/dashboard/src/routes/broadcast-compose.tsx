/**
 * Broadcast Compose Page
 *
 * Form for creators to compose and send a broadcast to all active subscribers.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '@digilist-saas/i18n';
import {
    Button,
    Heading,
    Paragraph,
    Card,
    Textfield,
    Textarea,
    NativeSelect,
    Alert,
    PageContentLayout,
} from '@digilist-saas/ds';
import { useSendBroadcast } from '@digilist-saas/sdk';
import { useAuthBridge } from '@digilist-saas/app-shell';
import styles from './broadcasts.module.css';

const MESSAGE_TYPES = [
    { value: 'text_update', label: 'Text Update' },
    { value: 'pick_alert', label: 'Pick Alert' },
    { value: 'announcement', label: 'Announcement' },
];

export function BroadcastComposePage() {
    const { t } = useT();
    const navigate = useNavigate();
    const { tenantId, userId } = useAuthBridge();
    const { mutateAsync: sendBroadcast } = useSendBroadcast();

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [messageType, setMessageType] = useState('text_update');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ recipientCount: number } | null>(null);

    const canSend = title.trim().length > 0 && body.trim().length > 0;

    async function handleSend() {
        if (!tenantId || !userId || !canSend) return;

        setSending(true);
        setError(null);
        setSuccess(null);

        try {
            const result = await sendBroadcast({
                tenantId,
                creatorId: userId as any,
                title: title.trim(),
                body: body.trim(),
                messageType: messageType as any,
            });
            setSuccess({ recipientCount: result.recipientCount });
            setTitle('');
            setBody('');
        } catch (err: any) {
            setError(err?.message ?? t('broadcasts.sendError', 'Failed to send broadcast'));
        } finally {
            setSending(false);
        }
    }

    return (
        <PageContentLayout>
            <div className={styles.page}>
                <Heading data-size="md">
                    {t('broadcasts.compose', 'New Broadcast')}
                </Heading>
                <Paragraph data-size="sm">
                    {t('broadcasts.composeDesc', 'This message will be sent to all your active subscribers.')}
                </Paragraph>

                {error && (
                    <Alert data-color="danger" data-size="sm">
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert data-color="success" data-size="sm">
                        {t('broadcasts.sent', 'Broadcast sent to {{count}} subscribers.', {
                            count: success.recipientCount,
                        })}
                    </Alert>
                )}

                <Card className={styles.composerForm}>
                    <NativeSelect
                        label={t('broadcasts.type', 'Message Type')}
                        value={messageType}
                        onChange={(e) => setMessageType(e.target.value)}
                    >
                        {MESSAGE_TYPES.map((mt) => (
                            <option key={mt.value} value={mt.value}>
                                {mt.label}
                            </option>
                        ))}
                    </NativeSelect>

                    <Textfield
                        label={t('broadcasts.titleLabel', 'Title')}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('broadcasts.titlePlaceholder', 'e.g. Hot NBA Play Tonight')}
                    />

                    <Textarea
                        label={t('broadcasts.bodyLabel', 'Message')}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={6}
                        placeholder={t('broadcasts.bodyPlaceholder', 'Write your message to subscribers...')}
                    />

                    <div className={styles.composerActions}>
                        <Button
                            variant="secondary"
                            data-size="sm"
                            onClick={() => navigate('/broadcasts')}
                        >
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button
                            data-size="sm"
                            onClick={handleSend}
                            disabled={!canSend || sending}
                            loading={sending}
                        >
                            {t('broadcasts.sendBtn', 'Send Broadcast')}
                        </Button>
                    </div>
                </Card>
            </div>
        </PageContentLayout>
    );
}
