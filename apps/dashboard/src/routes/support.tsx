import { useState, useEffect, useRef, useMemo, type KeyboardEvent } from 'react';
import { useT } from '@digipicks/i18n';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Badge,
  Spinner,
  Stack,
  SendIcon,
  SearchBar,
  UserIcon,
  CheckCircleIcon,
  CalendarIcon,
  XIcon,
  ChevronUpIcon,
  DashboardPageHeader,
  PillDropdown,
  PillTabs,
  Textfield,
  Textarea,
  Tag,
  ErrorState,
} from '@digipicks/ds';
import {
  useSupportTickets,
  useSupportTicket,
  useSupportTicketMessages,
  useSupportTicketCounts,
  useCreateSupportTicket,
  useUpdateSupportTicket,
  useAssignSupportTicket,
  useChangeSupportTicketStatus,
  useAddSupportTicketMessage,
  useEscalateSupportTicket,
  useUsers,
  formatTimeAgo,
  type SupportTicket,
  type SupportTicketMessage,
} from '@digipicks/sdk';
import type { Id } from '@digipicks/sdk';
import { useAuthBridge } from '@digipicks/app-shell';
import styles from './support.module.css';

type FilterType = 'all' | 'open' | 'in_progress' | 'waiting' | 'resolved';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'var(--ds-color-neutral-text-subtle)',
  normal: 'var(--ds-color-brand-1-base-default)',
  high: 'var(--ds-color-warning-base-default)',
  urgent: 'var(--ds-color-danger-base-default)',
};

const PRIORITY_LABEL_KEYS: Record<string, string> = {
  low: 'support.priorityLow',
  normal: 'support.priorityNormal',
  high: 'support.priorityHigh',
  urgent: 'support.priorityUrgent',
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  general: 'support.categoryGeneral',
  bug: 'support.categoryBug',
  feature: 'support.categoryFeature',
  billing: 'support.categoryBilling',
  access: 'support.categoryAccess',
  other: 'support.categoryOther',
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  open: 'support.statusOpen',
  in_progress: 'support.statusInProgress',
  waiting: 'support.statusWaiting',
  resolved: 'support.statusResolved',
  closed: 'support.statusClosed',
};

export function SupportPage() {
  const t = useT();
  const { user } = useAuthBridge();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messageType, setMessageType] = useState<'reply' | 'internal_note'>('reply');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState('general');
  const [newTicketPriority, setNewTicketPriority] = useState('normal');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const tenantId = user?.tenantId as Id<'tenants'> | undefined;
  const userId = user?.id as Id<'users'> | undefined;

  // Fetch tickets
  const statusFilter = filter === 'all' ? undefined : filter;
  const {
    tickets,
    isLoading: isLoadingTickets,
    error: ticketsError,
  } = useSupportTickets(tenantId, { status: statusFilter });
  const { counts } = useSupportTicketCounts(tenantId);

  // Fetch selected ticket detail & messages
  const { ticket: selectedTicket } = useSupportTicket(selectedTicketId ?? undefined);
  const { messages, isLoading: isLoadingMessages } = useSupportTicketMessages(selectedTicketId ?? undefined);

  // Mutations
  const createTicket = useCreateSupportTicket();
  const updateTicket = useUpdateSupportTicket();
  const assignTicket = useAssignSupportTicket();
  const changeStatus = useChangeSupportTicketStatus();
  const addMessage = useAddSupportTicketMessage();
  const escalateTicket = useEscalateSupportTicket();

  // Fetch users for assignment
  const { data: usersData } = useUsers({});
  const allUsers = usersData?.data ?? [];

  // Filter tickets by search
  const filteredTickets = useMemo(() => {
    if (!searchQuery) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        (t.reporterName && t.reporterName.toLowerCase().includes(q)) ||
        (t.assigneeName && t.assigneeName.toLowerCase().includes(q)),
    );
  }, [tickets, searchQuery]);

  // Auto-select first ticket
  useEffect(() => {
    if (tickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when ticket selected
  useEffect(() => {
    if (selectedTicketId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedTicketId]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedTicketId || !userId || !tenantId) return;

    try {
      await addMessage.mutateAsync({
        tenantId,
        ticketId: selectedTicketId,
        authorUserId: userId,
        body: messageInput.trim(),
        type: messageType,
      });
      setMessageInput('');
      inputRef.current?.focus();
    } catch {
      // handled by hook error state
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicketSubject.trim() || !newTicketDescription.trim() || !tenantId || !userId) return;

    try {
      const result = await createTicket.mutateAsync({
        tenantId,
        subject: newTicketSubject.trim(),
        description: newTicketDescription.trim(),
        priority: newTicketPriority,
        category: newTicketCategory,
        reporterUserId: userId,
      });
      setSelectedTicketId(result.id);
      setShowNewTicketForm(false);
      setNewTicketSubject('');
      setNewTicketDescription('');
      setNewTicketCategory('general');
      setNewTicketPriority('normal');
    } catch {
      // handled by hook error state
    }
  };

  const handleResolve = async () => {
    if (!selectedTicketId) return;
    await changeStatus.mutateAsync({ id: selectedTicketId, status: 'resolved' });
  };

  const handleClose = async () => {
    if (!selectedTicketId) return;
    await changeStatus.mutateAsync({ id: selectedTicketId, status: 'closed' });
  };

  const handleReopen = async () => {
    if (!selectedTicketId) return;
    await changeStatus.mutateAsync({ id: selectedTicketId, status: 'open' });
  };

  const handleEscalate = async () => {
    if (!selectedTicketId || !userId) return;
    await escalateTicket.mutateAsync({ id: selectedTicketId, userId });
  };

  const handleAssign = async (assigneeId: string) => {
    if (!selectedTicketId) return;
    await assignTicket.mutateAsync({
      id: selectedTicketId,
      assigneeUserId: assigneeId as Id<'users'>,
    });
  };

  const handlePriorityChange = async (priority: string) => {
    if (!selectedTicketId) return;
    await updateTicket.mutateAsync({ id: selectedTicketId, priority });
  };

  const handleCategoryChange = async (category: string) => {
    if (!selectedTicketId) return;
    await updateTicket.mutateAsync({ id: selectedTicketId, category });
  };

  return (
    <Stack direction="vertical" spacing="var(--ds-size-4)" className={styles.pageLayout}>
      <DashboardPageHeader
        title={t('support.title')}
        subtitle={t('support.subtitle')}
        actions={
          <Stack direction="horizontal" spacing="var(--ds-size-3)">
            {counts.open > 0 && (
              <Badge data-color="danger" data-size="md">
                {counts.open} {t('support.open')}
              </Badge>
            )}
            <Button data-size="sm" onClick={() => setShowNewTicketForm(true)}>
              {t('support.newTicket')}
            </Button>
          </Stack>
        }
      />

      <Stack direction="horizontal" spacing="var(--ds-size-4)" className={styles.panelRow}>
        {/* Left Panel — Ticket List */}
        <Card className={styles.ticketListPanel}>
          <Stack direction="vertical" spacing="var(--ds-size-3)" className={styles.ticketListHeader}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('support.searchPlaceholder') || 'Søk i saker...'}
              size="sm"
              ariaLabel={t('support.searchPlaceholder')}
            />
            <PillTabs
              tabs={[
                { id: 'all', label: `${t('support.allTickets')} (${counts.all})` },
                { id: 'open', label: `${t('support.open')} (${counts.open})` },
                { id: 'in_progress', label: `${t('support.inProgress')} (${counts.in_progress})` },
                { id: 'waiting', label: `${t('support.waiting')} (${counts.waiting})` },
                { id: 'resolved', label: `${t('support.resolved')} (${counts.resolved})` },
              ]}
              activeTab={filter}
              onTabChange={(id) => setFilter(id as FilterType)}
              size="sm"
              fullWidth
            />
          </Stack>

          <div className={styles.scrollContainer}>
            {ticketsError ? (
              <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
            ) : isLoadingTickets ? (
              <Stack direction="horizontal" justify="center" className={styles.loadingPadding}>
                <Spinner aria-label={t('common.loading')} />
              </Stack>
            ) : filteredTickets.length === 0 ? (
              <Stack direction="vertical" align="center" spacing="var(--ds-size-3)" className={styles.loadingPadding}>
                <Paragraph className={styles.emptyState}>
                  {searchQuery ? t('common.noResults') : t('support.noTickets')}
                </Paragraph>
              </Stack>
            ) : (
              filteredTickets.map((ticket: SupportTicket) => {
                const isSelected = selectedTicketId === ticket.id;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={isSelected ? styles.ticketItemSelected : styles.ticketItemUnselected}
                  >
                    <Stack direction="horizontal" justify="between" align="center">
                      <Stack
                        direction="horizontal"
                        spacing="var(--ds-size-2)"
                        align="center"
                        className={styles.flexOneShrink}
                      >
                        <div
                          className={styles.priorityDot}
                          style={{ backgroundColor: PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.normal }}
                        />
                        <Paragraph data-size="sm" className={styles.ticketSubject}>
                          {ticket.subject}
                        </Paragraph>
                      </Stack>
                      <Paragraph data-size="xs" className={styles.subtleText} style={{ flexShrink: 0 }}>
                        {formatTimeAgo(ticket.createdAt)}
                      </Paragraph>
                    </Stack>
                    <Stack direction="horizontal" justify="between" align="center" className={styles.ticketMeta}>
                      <Paragraph data-size="xs" className={styles.subtleText}>
                        {ticket.reporterName}
                      </Paragraph>
                      <Stack direction="horizontal" spacing="var(--ds-size-1)">
                        <Tag data-size="sm" data-color="neutral">
                          {t(CATEGORY_LABEL_KEYS[ticket.category] || ticket.category)}
                        </Tag>
                        <Tag
                          data-size="sm"
                          data-color={
                            ticket.status === 'open' ? 'info' : ticket.status === 'resolved' ? 'success' : 'warning'
                          }
                        >
                          {t(STATUS_LABEL_KEYS[ticket.status] || ticket.status)}
                        </Tag>
                      </Stack>
                    </Stack>
                    {ticket.messageCount !== undefined && ticket.messageCount > 0 && (
                      <Paragraph data-size="xs" className={styles.ticketMessageCount}>
                        {t('support.messageCount', { count: ticket.messageCount })}
                      </Paragraph>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Center Panel — Ticket Thread */}
        <Card className={styles.threadPanel}>
          {!selectedTicket ? (
            <Stack direction="vertical" align="center" justify="center" className={styles.threadEmptyState}>
              <Paragraph className={styles.subtleText}>{t('support.selectTicket')}</Paragraph>
            </Stack>
          ) : (
            <>
              {/* Header */}
              <Stack direction="vertical" spacing="var(--ds-size-2)" className={styles.threadHeader}>
                <Stack direction="horizontal" justify="between" align="center">
                  <Heading data-size="xs" className={styles.headingNoMargin}>
                    {selectedTicket.subject}
                  </Heading>
                  <Stack direction="horizontal" spacing="var(--ds-size-2)">
                    <Tag
                      data-color={
                        selectedTicket.status === 'open'
                          ? 'info'
                          : selectedTicket.status === 'resolved'
                            ? 'success'
                            : 'warning'
                      }
                    >
                      {t(STATUS_LABEL_KEYS[selectedTicket.status] || selectedTicket.status)}
                    </Tag>
                    <Tag data-color="neutral">
                      {t(PRIORITY_LABEL_KEYS[selectedTicket.priority] || selectedTicket.priority)}
                    </Tag>
                  </Stack>
                </Stack>
                <Paragraph data-size="sm" className={styles.threadDescription}>
                  {selectedTicket.description}
                </Paragraph>
              </Stack>

              {/* Messages */}
              <div className={styles.messagesContainer}>
                {isLoadingMessages ? (
                  <Stack direction="horizontal" justify="center" className={styles.loadingPadding}>
                    <Spinner aria-label={t('common.loading')} />
                  </Stack>
                ) : messages.length === 0 ? (
                  <Stack direction="vertical" align="center" className={styles.loadingPadding}>
                    <Paragraph className={styles.subtleText}>{t('support.noMessagesYet')}</Paragraph>
                  </Stack>
                ) : (
                  messages.map((msg: SupportTicketMessage) => {
                    const isSystem = msg.type === 'system';
                    const isInternal = msg.type === 'internal_note';
                    const isSelf = msg.authorUserId === user?.id;

                    if (isSystem) {
                      return (
                        <Stack key={msg.id} direction="horizontal" justify="center" className={styles.systemMessage}>
                          <Paragraph data-size="xs" className={styles.systemMessageText}>
                            {msg.body}
                          </Paragraph>
                        </Stack>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={styles.messageWrapper}
                        style={{ alignItems: isSelf ? 'flex-end' : 'flex-start' }}
                      >
                        <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center">
                          <Paragraph data-size="xs" className={styles.messageAuthor}>
                            {msg.authorName || t('common.unknown')}
                          </Paragraph>
                          {isInternal && (
                            <Tag data-size="sm" data-color="warning">
                              {t('support.internalNoteTag')}
                            </Tag>
                          )}
                          <Paragraph data-size="xs" className={styles.subtleText}>
                            {formatTimeAgo(msg.createdAt)}
                          </Paragraph>
                        </Stack>
                        <div
                          className={styles.messageBubble}
                          style={{
                            backgroundColor: isInternal
                              ? 'var(--ds-color-warning-surface-default)'
                              : isSelf
                                ? 'var(--ds-color-brand-1-surface-default)'
                                : 'var(--ds-color-neutral-surface-default)',
                            border: `1px solid ${
                              isInternal
                                ? 'var(--ds-color-warning-border-subtle)'
                                : 'var(--ds-color-neutral-border-subtle)'
                            }`,
                          }}
                        >
                          <Paragraph data-size="sm" className={styles.messageBody}>
                            {msg.body}
                          </Paragraph>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              {selectedTicket.status !== 'closed' && (
                <Stack direction="vertical" spacing="var(--ds-size-2)" className={styles.inputArea}>
                  <PillTabs
                    tabs={[
                      { id: 'reply', label: t('support.reply') },
                      { id: 'internal_note', label: t('support.internalNote') },
                    ]}
                    activeTab={messageType}
                    onTabChange={(id) => setMessageType(id as 'reply' | 'internal_note')}
                    size="sm"
                  />
                  <Stack direction="horizontal" spacing="var(--ds-size-2)">
                    <Textarea
                      ref={inputRef as any}
                      value={messageInput}
                      onChange={(e: any) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyPress as any}
                      placeholder={
                        messageType === 'reply' ? t('support.replyPlaceholder') : t('support.internalNotePlaceholder')
                      }
                      rows={2}
                      className={styles.flexOne}
                    />
                    <Button
                      data-size="sm"
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      aria-label={t('support.sendMessage')}
                    >
                      <SendIcon />
                    </Button>
                  </Stack>
                </Stack>
              )}
            </>
          )}
        </Card>

        {/* Right Panel — Ticket Details */}
        {selectedTicket && (
          <Card className={styles.detailPanel}>
            <Stack direction="vertical" spacing="var(--ds-size-4)">
              {/* Reporter */}
              <Stack direction="vertical" spacing="var(--ds-size-2)">
                <Paragraph data-size="xs" className={styles.sectionLabel}>
                  {t('support.reporter')}
                </Paragraph>
                <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center">
                  <Stack direction="horizontal" justify="center" align="center" className={styles.reporterAvatar}>
                    <UserIcon className={styles.reporterAvatarIcon} />
                  </Stack>
                  <Stack direction="vertical" spacing="0">
                    <Paragraph data-size="sm" className={styles.reporterName}>
                      {selectedTicket.reporterName}
                    </Paragraph>
                    <Paragraph data-size="xs" className={styles.subtleText}>
                      {selectedTicket.reporterEmail}
                    </Paragraph>
                  </Stack>
                </Stack>
              </Stack>

              <div className={styles.divider} />

              {/* Priority */}
              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="xs" className={styles.sectionLabel}>
                  {t('support.priority')}
                </Paragraph>
                <PillDropdown
                  label={t(PRIORITY_LABEL_KEYS[selectedTicket.priority] || selectedTicket.priority)}
                  value={selectedTicket.priority}
                  options={[
                    { value: 'low', label: t(PRIORITY_LABEL_KEYS.low) },
                    { value: 'normal', label: t(PRIORITY_LABEL_KEYS.normal) },
                    { value: 'high', label: t(PRIORITY_LABEL_KEYS.high) },
                    { value: 'urgent', label: t(PRIORITY_LABEL_KEYS.urgent) },
                  ]}
                  onChange={handlePriorityChange}
                  size="sm"
                />
              </Stack>

              {/* Category */}
              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="xs" className={styles.sectionLabel}>
                  {t('support.category')}
                </Paragraph>
                <PillDropdown
                  label={t(CATEGORY_LABEL_KEYS[selectedTicket.category] || selectedTicket.category)}
                  value={selectedTicket.category}
                  options={Object.entries(CATEGORY_LABEL_KEYS).map(([value, key]) => ({ value, label: t(key) }))}
                  onChange={handleCategoryChange}
                  size="sm"
                />
              </Stack>

              {/* Assignee */}
              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="xs" className={styles.sectionLabel}>
                  {t('support.assignee')}
                </Paragraph>
                <PillDropdown
                  label={selectedTicket.assigneeName || t('support.unassigned')}
                  value={selectedTicket.assigneeUserId || ''}
                  options={[
                    { value: '', label: t('support.unassigned') },
                    ...allUsers.map((u: any) => ({ value: u.id, label: u.name || u.email })),
                  ]}
                  onChange={(v) => {
                    if (v) handleAssign(v);
                  }}
                  size="sm"
                />
              </Stack>

              {/* Created */}
              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="xs" className={styles.sectionLabel}>
                  {t('support.created')}
                </Paragraph>
                <Stack direction="horizontal" spacing="var(--ds-size-1)" align="center">
                  <CalendarIcon className={styles.calendarIconSm} />
                  <Paragraph data-size="sm" className={styles.noMargin}>
                    {new Date(selectedTicket.createdAt).toLocaleDateString('nb-NO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Paragraph>
                </Stack>
              </Stack>

              {/* SLA */}
              {selectedTicket.slaDeadline && (
                <Stack direction="vertical" spacing="var(--ds-size-1)">
                  <Paragraph data-size="xs" className={styles.sectionLabel}>
                    {t('support.slaDeadline')}
                  </Paragraph>
                  <Paragraph
                    data-size="sm"
                    className={styles.noMargin}
                    style={{
                      color:
                        new Date(selectedTicket.slaDeadline) < new Date()
                          ? 'var(--ds-color-danger-text-default)'
                          : undefined,
                    }}
                  >
                    {new Date(selectedTicket.slaDeadline).toLocaleDateString('nb-NO', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Paragraph>
                </Stack>
              )}

              <div className={styles.divider} />

              {/* Quick Actions */}
              <Stack direction="vertical" spacing="var(--ds-size-2)">
                {(selectedTicket.status === 'open' ||
                  selectedTicket.status === 'in_progress' ||
                  selectedTicket.status === 'waiting') && (
                  <Button data-size="sm" onClick={handleResolve} className={styles.fullWidthButton}>
                    <CheckCircleIcon className={styles.actionIcon} />
                    {t('support.resolve')}
                  </Button>
                )}
                {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                  <Button
                    data-size="sm"
                    data-color="danger"
                    variant="secondary"
                    onClick={handleEscalate}
                    className={styles.fullWidthButton}
                  >
                    <ChevronUpIcon className={styles.actionIcon} />
                    {t('support.escalate')}
                  </Button>
                )}
                {selectedTicket.status === 'resolved' && (
                  <>
                    <Button data-size="sm" variant="secondary" onClick={handleClose} className={styles.fullWidthButton}>
                      <XIcon className={styles.actionIcon} />
                      {t('support.close')}
                    </Button>
                    <Button data-size="sm" variant="tertiary" onClick={handleReopen} className={styles.fullWidthButton}>
                      {t('support.reopen')}
                    </Button>
                  </>
                )}
                {selectedTicket.status === 'closed' && (
                  <Button data-size="sm" variant="tertiary" onClick={handleReopen} className={styles.fullWidthButton}>
                    {t('support.reopen')}
                  </Button>
                )}
              </Stack>
            </Stack>
          </Card>
        )}
      </Stack>

      {/* New Ticket Modal */}
      {showNewTicketForm && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewTicketForm(false);
          }}
        >
          <Card className={styles.modalCard}>
            <Stack direction="vertical" spacing="var(--ds-size-4)">
              <Stack direction="horizontal" justify="between" align="center">
                <Heading data-size="xs" className={styles.headingNoMargin}>
                  {t('support.newTicket')}
                </Heading>
                <Button
                  variant="tertiary"
                  data-size="sm"
                  onClick={() => setShowNewTicketForm(false)}
                  aria-label={t('common.close')}
                >
                  <XIcon />
                </Button>
              </Stack>

              <Textfield
                label={t('support.subject')}
                value={newTicketSubject}
                onChange={(e: any) => setNewTicketSubject(e.target.value)}
                placeholder={t('support.subjectPlaceholder')}
              />

              <div>
                <Paragraph data-size="sm" className={styles.newTicketLabel}>
                  {t('support.description')}
                </Paragraph>
                <Textarea
                  aria-label={t('support.description')}
                  value={newTicketDescription}
                  onChange={(e: any) => setNewTicketDescription(e.target.value)}
                  placeholder={t('support.descriptionPlaceholder')}
                  rows={4}
                />
              </div>

              <Stack direction="horizontal" spacing="var(--ds-size-4)">
                <Stack direction="vertical" spacing="var(--ds-size-1)" className={styles.flexOne}>
                  <Paragraph data-size="sm" className={styles.newTicketFieldLabel}>
                    {t('support.category')}
                  </Paragraph>
                  <PillDropdown
                    label={t(CATEGORY_LABEL_KEYS[newTicketCategory] || newTicketCategory)}
                    value={newTicketCategory}
                    options={Object.entries(CATEGORY_LABEL_KEYS).map(([value, key]) => ({ value, label: t(key) }))}
                    onChange={setNewTicketCategory}
                    size="sm"
                  />
                </Stack>
                <Stack direction="vertical" spacing="var(--ds-size-1)" className={styles.flexOne}>
                  <Paragraph data-size="sm" className={styles.newTicketFieldLabel}>
                    {t('support.priority')}
                  </Paragraph>
                  <PillDropdown
                    label={t(PRIORITY_LABEL_KEYS[newTicketPriority] || newTicketPriority)}
                    value={newTicketPriority}
                    options={[
                      { value: 'low', label: t(PRIORITY_LABEL_KEYS.low) },
                      { value: 'normal', label: t(PRIORITY_LABEL_KEYS.normal) },
                      { value: 'high', label: t(PRIORITY_LABEL_KEYS.high) },
                      { value: 'urgent', label: t(PRIORITY_LABEL_KEYS.urgent) },
                    ]}
                    onChange={setNewTicketPriority}
                    size="sm"
                  />
                </Stack>
              </Stack>

              <Stack direction="horizontal" spacing="var(--ds-size-3)" justify="end">
                <Button variant="secondary" data-size="sm" onClick={() => setShowNewTicketForm(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  data-size="sm"
                  onClick={handleCreateTicket}
                  disabled={!newTicketSubject.trim() || !newTicketDescription.trim()}
                >
                  {t('support.newTicket')}
                </Button>
              </Stack>
            </Stack>
          </Card>
        </div>
      )}
    </Stack>
  );
}
