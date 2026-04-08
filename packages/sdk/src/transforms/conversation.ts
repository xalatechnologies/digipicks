/**
 * DigilistSaaS SDK - Conversation & Message Transforms
 *
 * Maps between the Convex messaging shapes and the SDK shapes.
 */

import type { Conversation, Message } from '../hooks/use-conversations';

/** Raw Convex conversation document shape. */
export interface ConvexConversation {
    _id: string;
    _creationTime: number;
    tenantId: string;
    userId: string;
    participants: string[];
    subject?: string;
    status: string;
    unreadCount: number;
    lastMessageAt?: number;
    bookingId?: string;
    resourceId?: string;
}

/** Extended Convex conversation with enriched fields (from tenant query). */
export interface ConvexConversationEnriched extends ConvexConversation {
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    listingName?: string;
    bookingRef?: string;
    displaySubject?: string;
    assigneeId?: string;
}

/** Raw Convex message document shape. */
export interface ConvexMessage {
    _id: string;
    conversationId: string;
    senderId: string;
    senderName?: string;
    senderAvatar?: string;
    senderType: string;
    visibility?: "public" | "internal";
    content: string;
    messageType: string;
    attachments: unknown[];
    readAt?: number;
    sentAt: number;
    editedAt?: number;
    deletedAt?: number;
}

/**
 * Transform a raw Convex conversation document into the SDK `Conversation` shape.
 */
export function transformConversation(c: ConvexConversation): Conversation {
    return {
        id: c._id as string,
        tenantId: c.tenantId as string,
        userId: c.userId as string,
        participants: c.participants.map((p) => p as string),
        subject: c.subject,
        status: c.status,
        unreadCount: c.unreadCount,
        lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).toISOString() : undefined,
        bookingId: c.bookingId as string | undefined,
        resourceId: c.resourceId as string | undefined,
        createdAt: new Date(c._creationTime).toISOString(),
    };
}

/**
 * Transform an enriched Convex conversation (from tenant query) into the SDK shape.
 */
export function transformConversationEnriched(c: ConvexConversationEnriched): Conversation {
    return {
        id: c._id as string,
        tenantId: c.tenantId as string,
        userId: c.userId as string,
        participants: (c.participants ?? []).map((p) => p as string),
        subject: c.displaySubject ?? c.subject,
        status: c.status,
        unreadCount: c.unreadCount ?? 0,
        lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt).toISOString() : undefined,
        bookingId: c.bookingId as string | undefined,
        resourceId: c.resourceId as string | undefined,
        createdAt: new Date(c._creationTime ?? 0).toISOString(),
        userName: c.userName,
        userEmail: c.userEmail,
        userPhone: c.userPhone,
        listingName: c.listingName,
        bookingRef: c.bookingRef,
        displaySubject: c.displaySubject,
        assignedTo: c.assigneeId,
    };
}

/**
 * Transform a raw Convex message document into the SDK `Message` shape.
 *
 * Epoch timestamps -> ISO strings.
 */
export function transformMessage(m: ConvexMessage): Message {
    return {
        id: m._id as string,
        conversationId: m.conversationId as string,
        senderId: m.senderId as string,
        senderName: m.senderName,
        senderAvatar: m.senderAvatar,
        senderType: m.senderType,
        visibility: m.visibility,
        content: m.content,
        messageType: m.messageType,
        attachments: m.attachments,
        readAt: m.readAt ? new Date(m.readAt).toISOString() : undefined,
        sentAt: new Date(m.sentAt).toISOString(),
        editedAt: m.editedAt ? new Date(m.editedAt).toISOString() : undefined,
        deletedAt: m.deletedAt ? new Date(m.deletedAt).toISOString() : undefined,
    };
}
