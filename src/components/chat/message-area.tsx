"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui";
import MessageBubble from "./message-bubble";
import TypingIndicator from "./typing-indicator";
import { getMessages } from "@/lib/actions/chat";
import { getSocket } from "@/lib/socket";

type Message = Awaited<ReturnType<typeof getMessages>>[number];

type ConversationParticipant = {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
    employeeNumber: string | null;
  };
  lastReadAt: Date | null;
};

type Props = {
  conversationId: string;
  currentUserId: string;
  participants: ConversationParticipant[];
  isGroup: boolean;
  conversationName: string | null;
  onlineUsers: string[];
  onBack: () => void;
  onNewMessage: (convId: string) => void;
};

export default function MessageArea({
  conversationId,
  currentUserId,
  participants,
  isGroup,
  conversationName,
  onlineUsers,
  onBack,
  onNewMessage,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const other = participants.find((p) => p.userId !== currentUserId);
  const displayName = isGroup
    ? conversationName ?? "Group Chat"
    : other
    ? `${other.user.firstName ?? ""} ${other.user.lastName ?? ""}`.trim() || other.user.email
    : "Unknown";

  const isOnline = other ? onlineUsers.includes(other.userId) : false;

  // Load messages
  useEffect(() => {
    setLoading(true);
    getMessages(conversationId).then((msgs) => {
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  }, [conversationId]);

  // Socket.io real-time
  useEffect(() => {
    const socket = getSocket();
    socket.emit("join_conversation", conversationId);
    socket.emit("mark_read", conversationId);

    const handleNewMessage = (msg: Message) => {
      if (msg.conversationId !== conversationId) {
        onNewMessage(msg.conversationId);
        return;
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      socket.emit("mark_read", conversationId);
    };

    const handleUserTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setTypingUsers((prev) => new Set(prev).add(data.userId));
      }
    };

    const handleUserStopTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);

    return () => {
      socket.emit("leave_conversation", conversationId);
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
    };
  }, [conversationId, currentUserId, onNewMessage]);

  // Typing indicator logic
  const handleTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      getSocket().emit("typing_start", conversationId);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      getSocket().emit("typing_stop", conversationId);
    }, 2000);
  }, [conversationId]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content) return;

    const socket = getSocket();
    socket.emit("send_message", { conversationId, content }, (response: any) => {
      if (response?.error) {
        console.error("Failed to send:", response.error);
      }
    });

    setInput("");
    isTypingRef.current = false;
    getSocket().emit("typing_stop", conversationId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [input, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const typingUserNames = Array.from(typingUsers)
    .map((uid) => {
      const p = participants.find((pp) => pp.userId === uid);
      if (!p) return null;
      return `${p.user.firstName ?? ""} ${p.user.lastName ?? ""}`.trim() || p.user.email;
    })
    .filter(Boolean) as string[];

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover transition-colors md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="relative">
          <Avatar name={displayName} size="md" src={other?.user.photoUrl ?? undefined} />
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-success" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-foreground">{displayName}</h3>
          <p className="text-xs text-muted">
            {isOnline ? "Online" : isGroup ? `${participants.length} members` : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-muted">No messages yet</p>
            <p className="mt-1 text-xs text-muted-light">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => {
              const isOwn = msg.senderId === currentUserId;
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const showSender = !prevMsg || prevMsg.senderId !== msg.senderId;
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={isOwn}
                  showSender={showSender}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Typing Indicator */}
      <TypingIndicator typingUserNames={typingUserNames} />

      {/* Input */}
      <div className="border-t border-border bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTypingStart();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-all hover:bg-primary-dark disabled:opacity-40 disabled:pointer-events-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
