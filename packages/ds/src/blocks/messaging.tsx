/**
 * Messaging Components
 * Reusable components for chat/messaging functionality
 */

import { useState, useRef, useEffect, type ReactNode, type KeyboardEvent } from 'react';
import { Button, Paragraph, Spinner } from '@digdir/designsystemet-react';
import styles from './messaging.module.css';

// =============================================================================
// Types
// =============================================================================

export interface ConversationItem {
  id: string;
  userName?: string;
  userAvatar?: string;
  subject?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  status?: 'active' | 'resolved' | 'pending';
  isOnline?: boolean;
  bookingId?: string;
}

export interface MessageItem {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  createdAt: string;
  isRead?: boolean;
  isFromCurrentUser?: boolean;
}

// =============================================================================
// ConversationListItem
// =============================================================================

export interface ConversationListItemProps {
  conversation: ConversationItem;
  isSelected?: boolean;
  onClick?: () => void;
  formatTimeAgo?: (date: string) => string;
}

/**
 * Single conversation item in the list
 */
export function ConversationListItem({
  conversation,
  isSelected,
  onClick,
  formatTimeAgo = defaultFormatTimeAgo,
}: ConversationListItemProps) {
  const hasUnread = (conversation.unreadCount ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={isSelected ? styles.conversationButtonSelected : styles.conversationButton}
    >
      {/* Avatar */}
      <div className={styles.avatarWrap}>
        <div className={styles.avatar}>
          {conversation.userAvatar || getInitials(conversation.userName)}
        </div>
        {conversation.isOnline && (
          <span className={styles.onlineDot} />
        )}
      </div>

      {/* Content */}
      <div className={styles.conversationContent}>
        <div className={styles.conversationHeader}>
          <span className={hasUnread ? styles.conversationNameUnread : styles.conversationNameRead}>
            {conversation.userName || 'Ukjent'}
          </span>
          <span className={styles.conversationTime}>
            {conversation.lastMessageTime ? formatTimeAgo(conversation.lastMessageTime) : ''}
          </span>
        </div>
        <div className={hasUnread ? styles.conversationPreviewUnread : styles.conversationPreviewRead}>
          {conversation.lastMessage || conversation.subject || 'Ingen meldinger'}
        </div>
      </div>

      {/* Unread badge */}
      {hasUnread && (
        <span className={styles.unreadBadge}>
          {conversation.unreadCount}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// ConversationList
// =============================================================================

export interface ConversationListProps {
  conversations: ConversationItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  isLoading?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  formatTimeAgo?: (date: string) => string;
  filterTabs?: { id: string; label: string; count?: number }[];
  activeFilter?: string;
  onFilterChange?: (filterId: string) => void;
  /** Search icon (consumer provides) */
  searchIcon?: ReactNode;
}

/**
 * List of conversations with search and filters
 */
export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  searchPlaceholder = 'Søk i samtaler...',
  emptyMessage = 'Ingen samtaler',
  formatTimeAgo = defaultFormatTimeAgo,
  filterTabs,
  activeFilter,
  onFilterChange,
  searchIcon,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = searchQuery
    ? conversations.filter(c =>
      c.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : conversations;

  return (
    <div className={styles.listWrap}>
      {/* Search */}
      <div className={styles.searchWrap}>
        <div className={styles.searchInput}>
          {searchIcon}
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInputField}
          />
        </div>
      </div>

      {/* Filter tabs */}
      {filterTabs && filterTabs.length > 0 && (
        <div className={styles.filterTabs}>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange?.(tab.id)}
              className={activeFilter === tab.id ? styles.filterTabActive : styles.filterTab}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={styles.filterTabCount}>({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Conversation list */}
      <div className={styles.scrollArea}>
        {isLoading ? (
          <div className={styles.centeredSpinner}>
            <Spinner aria-label="Laster samtaler..." />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className={styles.emptyMessage}>
            <Paragraph className={styles.emptyMessageText}>
              {emptyMessage}
            </Paragraph>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedId === conversation.id}
              onClick={() => onSelect?.(conversation.id)}
              formatTimeAgo={formatTimeAgo}
            />
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MessageBubble
// =============================================================================

export interface MessageBubbleProps {
  message: MessageItem;
  isFromCurrentUser?: boolean;
  showReadReceipt?: boolean;
  /** Read receipt icon (consumer provides) */
  readIcon?: ReactNode;
  /** Double-read receipt icon (consumer provides) */
  readAllIcon?: ReactNode;
}

/**
 * Single message bubble
 */
export function MessageBubble({
  message,
  isFromCurrentUser,
  showReadReceipt,
  readIcon,
  readAllIcon,
}: MessageBubbleProps) {
  const fromMe = isFromCurrentUser ?? message.isFromCurrentUser;

  return (
    <div className={fromMe ? styles.bubbleRowSent : styles.bubbleRowReceived}>
      <div className={fromMe ? styles.bubbleSent : styles.bubbleReceived}>
        <Paragraph data-size="sm" className={styles.bubbleContent}>
          {message.content}
        </Paragraph>
        <div className={styles.bubbleMeta}>
          <span className={styles.bubbleTime}>
            {formatMessageTime(message.createdAt)}
          </span>
          {showReadReceipt && fromMe && (readIcon || readAllIcon) && (
            <span className={styles.readReceipt}>
              {message.isRead ? readAllIcon : readIcon}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ChatThread
// =============================================================================

export interface ChatThreadProps {
  messages: MessageItem[];
  currentUserId?: string;
  isLoading?: boolean;
  onSendMessage?: (content: string) => void;
  isSending?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  showDateSeparators?: boolean;
  showReadReceipts?: boolean;
  header?: ReactNode;
  /** Send button icon (consumer provides) */
  sendIcon?: ReactNode;
  /** Read receipt icon (consumer provides) */
  readIcon?: ReactNode;
  /** Double-read receipt icon (consumer provides) */
  readAllIcon?: ReactNode;
}

/**
 * Complete chat thread with messages and input
 */
export function ChatThread({
  messages,
  currentUserId,
  isLoading,
  onSendMessage,
  isSending,
  placeholder = 'Skriv en melding...',
  emptyMessage = 'Ingen meldinger ennå',
  showDateSeparators = true,
  showReadReceipts = true,
  header,
  sendIcon,
  readIcon,
  readAllIcon,
}: ChatThreadProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim() && onSendMessage) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages = showDateSeparators ? groupMessagesByDate(messages) : { today: messages };

  return (
    <div className={styles.chatWrap}>
      {/* Header */}
      {header && (
        <div className={styles.chatHeader}>
          {header}
        </div>
      )}

      {/* Messages */}
      <div className={styles.chatMessages}>
        {isLoading ? (
          <div className={styles.centeredSpinner}>
            <Spinner aria-label="Laster meldinger..." />
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyMessage}>
            <Paragraph className={styles.emptyMessageText}>
              {emptyMessage}
            </Paragraph>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {showDateSeparators && (
                <div className={styles.dateSeparator}>
                  <span className={styles.dateSeparatorLabel}>
                    {date}
                  </span>
                </div>
              )}
              {msgs.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  {...(currentUserId && { isFromCurrentUser: msg.senderId === currentUserId })}
                  showReadReceipt={showReadReceipts}
                  readIcon={readIcon}
                  readAllIcon={readAllIcon}
                />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {onSendMessage && (
        <div className={styles.chatInputWrap}>
          <div className={styles.chatInputRow}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isSending}
              className={styles.chatInputField}
            />
            <Button
              type="button"
              variant="primary"
              onClick={handleSend}
              disabled={!inputValue.trim() || isSending}
              aria-label="Send melding"
            >
              {sendIcon}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function defaultFormatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Nå';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}t`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

function groupMessagesByDate(messages: MessageItem[]): Record<string, MessageItem[]> {
  const groups: Record<string, MessageItem[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  messages.forEach((message) => {
    const date = new Date(message.createdAt);
    let key: string;

    if (date.toDateString() === today.toDateString()) {
      key = 'I dag';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'I går';
    } else {
      key = date.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    if (!groups[key]) groups[key] = [];
    groups[key]!.push(message);
  });

  return groups;
}
