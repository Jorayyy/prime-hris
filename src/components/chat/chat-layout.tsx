"use client";

import { useState, useEffect, useCallback } from "react";
import ConversationList from "./conversation-list";
import MessageArea from "./message-area";
import UserSearch from "./user-search";
import { getConversations, createConversation } from "@/lib/actions/chat";
import { getSocket, disconnectSocket } from "@/lib/socket";
import type { ConversationWithDetails } from "@/lib/actions/chat";

type Props = {
  currentUserId: string;
};

export default function ChatLayout({ currentUserId }: Props) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Socket.io setup
  useEffect(() => {
    const socket = getSocket();

    socket.on("online_users", (users: string[]) => {
      setOnlineUsers(users);
    });

    socket.on("new_message", (msg: any) => {
      // Refresh conversation list to update last message & unread counts
      loadConversations();
    });

    // Join all existing conversation rooms
    const convIds = conversations.map((c) => c.id);
    if (convIds.length > 0) {
      socket.emit("join_conversations", convIds);
    }

    return () => {
      socket.off("online_users");
      socket.off("new_message");
    };
  }, [conversations, loadConversations]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConvId(id);
    setShowUserSearch(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setShowUserSearch(true);
  }, []);

  const handleStartChat = useCallback(
    async (userId: string) => {
      try {
        const conv = await createConversation([userId]);
        await loadConversations();
        setActiveConvId(conv.id);
        setShowUserSearch(false);

        // Join the new conversation room
        getSocket().emit("join_conversation", conv.id);
      } catch (err) {
        console.error("Failed to create conversation:", err);
      }
    },
    [loadConversations]
  );

  const handleNewMessage = useCallback(
    (convId: string) => {
      // When receiving a message in a different conversation, refresh list
      loadConversations();
    },
    [loadConversations]
  );

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      {/* Conversation List */}
      <div className={`${activeConvId ? "hidden md:flex" : "flex"} flex-col w-full md:w-80`}>
        <ConversationList
          conversations={conversations}
          activeId={activeConvId}
          onSelect={handleSelectConversation}
          onlineUsers={onlineUsers}
          currentUserId={currentUserId}
          onNewChat={handleNewChat}
        />
        {showUserSearch && (
          <UserSearch
            onSelect={handleStartChat}
            onClose={() => setShowUserSearch(false)}
          />
        )}
      </div>

      {/* Message Area */}
      <div className={`${activeConvId ? "flex" : "hidden md:flex"} flex-1`}>
        {activeConv ? (
          <MessageArea
            key={activeConv.id}
            conversationId={activeConv.id}
            currentUserId={currentUserId}
            participants={activeConv.participants}
            isGroup={activeConv.isGroup}
            conversationName={activeConv.name}
            onlineUsers={onlineUsers}
            onBack={() => setActiveConvId(null)}
            onNewMessage={handleNewMessage}
          />
        ) : (
          <div className="flex h-full flex-1 items-center justify-center bg-background">
            <div className="text-center">
              <div className="mb-3 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-muted">Select a conversation</p>
              <p className="mt-1 text-xs text-muted-light">
                Choose from the list or start a new chat
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
