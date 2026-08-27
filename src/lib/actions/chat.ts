"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export type ChatUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  employeeNumber: string | null;
};

export type ConversationWithDetails = {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: Date;
  updatedAt: Date;
  participants: {
    id: string;
    userId: string;
    user: ChatUser;
    lastReadAt: Date | null;
  }[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
  } | null;
  unreadCount: number;
};

export async function getConversations(): Promise<ConversationWithDetails[]> {
  const user = await requireUser();

  const participations = await db.chatParticipant.findMany({
    where: { userId: user.id },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  employee: {
                    select: {
                      firstName: true,
                      lastName: true,
                      photoUrl: true,
                      employeeNumber: true,
                    },
                  },
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  const conversations: ConversationWithDetails[] = [];

  for (const p of participations) {
    const conv = p.conversation;
    const lastMessage = conv.messages[0] ?? null;

    // Count unread messages (messages after lastReadAt from other senders)
    const unreadCount = lastMessage
      ? await db.chatMessage.count({
          where: {
            conversationId: conv.id,
            senderId: { not: user.id },
            createdAt: { gt: p.lastReadAt ?? new Date(0) },
          },
        })
      : 0;

    conversations.push({
      ...conv,
      participants: conv.participants.map((pp) => ({
        id: pp.id,
        userId: pp.userId,
        user: {
          id: pp.user.id,
          email: pp.user.email,
          firstName: pp.user.employee?.firstName ?? null,
          lastName: pp.user.employee?.lastName ?? null,
          photoUrl: pp.user.employee?.photoUrl ?? null,
          employeeNumber: pp.user.employee?.employeeNumber ?? null,
        },
        lastReadAt: pp.lastReadAt,
      })),
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
          }
        : null,
      unreadCount,
    });
  }

  return conversations;
}

export async function getMessages(conversationId: string, cursor?: string) {
  const user = await requireUser();

  // Verify participant
  const participant = await db.chatParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
  });

  if (!participant) throw new Error("Not a participant in this conversation");

  const messages = await db.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          employee: {
            select: {
              firstName: true,
              lastName: true,
              photoUrl: true,
            },
          },
        },
      },
    },
  });

  return messages.reverse();
}

export async function createConversation(participantUserIds: string[], name?: string) {
  const user = await requireUser();
  const allUserIds = [...new Set([user.id, ...participantUserIds])];

  // For 1-on-1 chats, check if conversation already exists
  if (allUserIds.length === 2 && !name) {
    const existing = await db.chatParticipant.findFirst({
      where: {
        userId: allUserIds[0],
        conversation: {
          isGroup: false,
          participants: {
            some: { userId: allUserIds[1] },
          },
        },
      },
      include: { conversation: true },
    });

    if (existing) return existing.conversation;
  }

  const conversation = await db.conversation.create({
    data: {
      name: name ?? null,
      isGroup: allUserIds.length > 2,
      participants: {
        create: allUserIds.map((id) => ({ userId: id })),
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                  photoUrl: true,
                  employeeNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return conversation;
}

export async function searchUsers(query: string) {
  const user = await requireUser();

  if (!query || query.length < 2) return [];

  const users = await db.user.findMany({
    where: {
      isActive: true,
      id: { not: user.id },
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { employee: { firstName: { contains: query, mode: "insensitive" } } },
        { employee: { lastName: { contains: query, mode: "insensitive" } } },
        { employee: { employeeNumber: { contains: query, mode: "insensitive" } } },
      ],
    },
    take: 10,
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          photoUrl: true,
          employeeNumber: true,
        },
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.employee?.firstName ?? null,
    lastName: u.employee?.lastName ?? null,
    photoUrl: u.employee?.photoUrl ?? null,
    employeeNumber: u.employee?.employeeNumber ?? null,
  }));
}
